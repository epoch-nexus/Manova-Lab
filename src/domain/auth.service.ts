import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../server/errors.js';
import type { ResearcherProfile, AuthResponse } from '../types/experiment.d.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'manova-labs-jwt-default-dev-secret-key-32chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  /**
   * Registers a new researcher.
   */
  async register(input: unknown): Promise<AuthResponse> {
    const validated = registerSchema.parse(input);

    const existing = await prisma.researcher.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      throw new ConflictError('A researcher with this email already exists', 'VALIDATION_ERROR');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(validated.password, saltRounds);

    const researcher = await prisma.researcher.create({
      data: {
        email: validated.email,
        passwordHash,
        name: validated.name ?? null,
      },
    });

    const token = this.generateToken(researcher.id, researcher.email);

    return {
      researcher: this.toProfile(researcher),
      token,
    };
  }

  /**
   * Authenticates a researcher with email and password.
   */
  async login(input: unknown): Promise<AuthResponse> {
    const validated = loginSchema.parse(input);

    const researcher = await prisma.researcher.findUnique({
      where: { email: validated.email },
    });

    if (!researcher) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(validated.password, researcher.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

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
      throw new NotFoundError('Researcher not found');
    }

    return this.toProfile(researcher);
  }

  /**
   * Generates a signed JWT for the researcher.
   */
  generateToken(researcherId: string, email: string): string {
    return jwt.sign(
      {
        id: researcherId,
        email,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      } as jwt.SignOptions
    );
  }

  /**
   * Verifies and decodes a JWT token.
   */
  verifyToken(token: string): { id: string; email: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; sub?: string; email: string };
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
