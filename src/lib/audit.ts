// src/lib/audit.ts
import { db } from './db';
import { auditLog } from '@/db/schema';

interface AuditEntryParams {
  userId:   number | null;
  action:   string;
  module:   string;
  recordId: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

/**
 * Inserts a record into core.audit_log.
 * Call this from Route Handlers after any sensitive operation:
 * - Manual stock adjustments
 * - Order cancellations
 * - Price overrides
 * - User deactivation
 *
 * Non-blocking: errors are logged to console but do not throw,
 * so an audit failure never aborts the main operation.
 */
export async function writeAuditLog(params: AuditEntryParams): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId:   params.userId,
      action:   params.action,
      module:   params.module,
      recordId: params.recordId,
      oldData:  params.oldData ?? null,
      newData:  params.newData ?? null,
    });
  } catch (error) {
    // Audit failure must never break business logic.
    console.error('[audit] Failed to write audit log entry:', error);
  }
}