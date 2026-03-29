import {
  pgSchema,
  serial,
  integer,
  varchar,
  numeric,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './identity';

export const tesoreriaSchema = pgSchema('tesoreria');

// One register per user shift.
// Business rule: only ONE register with status = 'open' allowed per user at a time (SRS RNB-06).
// final_calculated_balance: computed by the system (initial + cash sales + advance payments - refunds).
// final_actual_balance: declared by the operator on close — discrepancy = audit metric.
export const cashRegisters = tesoreriaSchema.table('cash_registers', {
  registerId:              serial('register_id').primaryKey(),
  userId:                  integer('user_id').references(() => users.userId),
  status:                  varchar('status', { length: 20 }).default('open'),
  initialBalance:          numeric('initial_balance', { precision: 12, scale: 2 }).notNull(),
  finalCalculatedBalance:  numeric('final_calculated_balance', { precision: 12, scale: 2 }),
  finalActualBalance:      numeric('final_actual_balance', { precision: 12, scale: 2 }),
  openedAt:                timestamp('opened_at', { withTimezone: true }).defaultNow(),
  closedAt:                timestamp('closed_at', { withTimezone: true }),
});

// Every cash movement linked to a register.
// source_reference_id: mandatory for system-generated movements (order_id, work_order_id).
//   Enables direct navigation from cash movement → originating transaction (SRS RF-CJ-018).
export const cashMovements = tesoreriaSchema.table('cash_movements', {
  movementId:        serial('movement_id').primaryKey(),
  registerId:        integer('register_id').notNull().references(() => cashRegisters.registerId, {
    onDelete: 'cascade',
  }),
  type:              varchar('type', { length: 10 }).notNull(),
  amount:            numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description:       text('description').notNull(),
  sourceReferenceId: varchar('source_reference_id', { length: 50 }),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow(),
});