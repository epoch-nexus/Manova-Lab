import { prisma } from '../db/prisma.js';

export type AuditEventType =
  | 'RESEARCHER_REGISTERED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'EXPERIMENT_CREATED'
  | 'EXPERIMENT_UPDATED'
  | 'EXPERIMENT_DELETED'
  | 'EXPERIMENT_PUBLISHED';

export interface AuditLogEntry {
  researcherId?: string | null;
  eventType: AuditEventType;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Strip any accidental sensitive fields from metadata
      let cleanMetadata: Record<string, unknown> | null = null;
      if (entry.metadata) {
        cleanMetadata = { ...entry.metadata };
        delete cleanMetadata.password;
        delete cleanMetadata.passwordHash;
        delete cleanMetadata.token;
        delete cleanMetadata.jwt;
        delete cleanMetadata.submittedResponse;
      }

      await prisma.auditLog.create({
        data: {
          researcherId: entry.researcherId ?? null,
          eventType: entry.eventType,
          resourceId: entry.resourceId ?? null,
          metadata: cleanMetadata as any,
        },
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  async getRecentLogs(limit = 50) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const auditService = new AuditService();
