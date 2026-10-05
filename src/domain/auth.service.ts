import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { ConflictError, UnauthorizedError } from '../server/errors.js';
import type { ResearcherProfile, AuthResponse } from '../types/experiment.d.ts';
import { auditService } from './audit.service.js';
import { config } from '../config/env.js';
import { Prisma } from '@prisma/client';

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;

// Precomputed bcrypt hash to eliminate timing side-channel on invalid email login attempts
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy_timing_protection_hash_value_123', 10);

export class AuthService {
  /**
   * Registers a new researcher.
   * Catches Prisma P2002 unique constraint violations and returns 409 EMAIL_ALREADY_EXISTS.
   */
  async register(input: unknown): Promise<AuthResponse> {
    const validated = registerSchema.parse(input);

    const existing = await prisma.researcher.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      throw new ConflictError(
        'A researcher with this email already exists',
        'EMAIL_ALREADY_EXISTS'
      );
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(validated.password, saltRounds);

    let researcher;
    try {
      researcher = await prisma.researcher.create({
        data: {
          email: validated.email,
          passwordHash,
          name: validated.name ?? null,
        },
      });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError(
          'A researcher with this email already exists',
          'EMAIL_ALREADY_EXISTS'
        );
      }
      throw err;
    }

    await auditService.log({
      researcherId: researcher.id,
      eventType: 'RESEARCHER_REGISTERED',
      metadata: { email: researcher.email },
    });

    const token = this.generateToken(researcher.id, researcher.email);

    return {
      researcher: this.toProfile(researcher),
      token,
    };
  }

  /**
   * Authenticates a researcher with email and password.
   * Runs dummy bcrypt.compare on missing email to eliminate timing side-channels.
   */
  async login(input: unknown): Promise<AuthResponse> {
    const validated = loginSchema.parse(input);

    const researcher = await prisma.researcher.findUnique({
      where: { email: validated.email },
    });

    if (!researcher) {
      // Execute dummy comparison to equalize response time and mitigate timing side-channel
      await bcrypt.compare(validated.password, DUMMY_PASSWORD_HASH);
      await auditService.log({
        eventType: 'LOGIN_FAILED',
        metadata: { email: validated.email },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(validated.password, researcher.passwordHash);
    if (!isMatch) {
      await auditService.log({
        researcherId: researcher.id,
        eventType: 'LOGIN_FAILED',
        metadata: { email: validated.email },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    await auditService.log({
      researcherId: researcher.id,
      eventType: 'LOGIN_SUCCESS',
      metadata: { email: researcher.email },
    });

    const token = this.generateToken(researcher.id, researcher.email);

    return {
      researcher: this.toProfile(researcher),
      token,
    };
  }

  /**
   * Retrieves profile for an authenticated researcher.
   */
  async getMe(researcherId: string): Promise<ResearcherProfile> {
    const researcher = await prisma.researcher.findUnique({
      where: { id: researcherId },
    });

    if (!researcher) {
      throw new UnauthorizedError('Researcher account no longer exists', 'UNAUTHORIZED');
    }

    return this.toProfile(researcher);
  }

  /**
   * Generates a signed JWT for the researcher with explicit HS256 algorithm.
   */
  generateToken(researcherId: string, email: string): string {
    return jwt.sign(
      {
        id: researcherId,
        email,
      },
      JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: JWT_EXPIRES_IN,
      } as jwt.SignOptions
    );
  }

  /**
   * Verifies and decodes a JWT token with explicit HS256 algorithm whitelist.
   */
  verifyToken(token: string): { id: string; email: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as { id?: string; sub?: string; email: string };
      const id = decoded.id || decoded.sub;
      if (!id) {
        throw new UnauthorizedError('Invalid token payload');
      }
      return { id, email: decoded.email };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Authentication token missing or invalid');
    }
  }

  private toProfile(researcher: {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ResearcherProfile {
    return {
      id: researcher.id,
      email: researcher.email,
      name: researcher.name,
      createdAt: researcher.createdAt.toISOString(),
      updatedAt: researcher.updatedAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
