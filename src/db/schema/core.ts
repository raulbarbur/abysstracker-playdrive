// src/db/schema/core.ts
import { pgSchema, serial, integer, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const coreSchema = pgSchema('core');

// Central audit log — every sensitive action in the system is recorded here.
// Referenced by: all modules via lib/audit.ts helper.
export const auditLog = coreSchema.table('audit_log', {
  auditId:  serial('audit_id').primaryKey(),
  userId:   integer('user_id'),
  action:   varchar('action', { length: 100 }),
  module:   varchar('module', { length: 50 }),
  recordId: varchar('record_id', { length: 50 }),
  oldData:  jsonb('old_data'),
  newData:  jsonb('new_data'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
});