import {
  pgSchema,
  serial,
  integer,
  varchar,
  numeric,
  text,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';
import { clients } from './crm';

export const produccionSchema = pgSchema('produccion');

// Work orders for custom fabrication (3D printing, custom builds).
// States: pending → in_progress → ready → completed → cancelled.
// started_at: stamped when status → in_progress (production time start).
// finished_at: stamped when status → ready (production time end, On-Time Delivery KPI source).
// advance_payment: partial upfront payment (seña). Immediately injected into open cash register
//   on receipt — not deferred until final sale (SRS RNB-17).
// scrap_cost: accumulates irrecoverable material loss from failed print attempts.
//   Each scrap registration adds to this field. Affects CMV directly (SRS RNB-18).
// estimated_cost: projected material cost (from slicer software). Baseline for BI margin.
// price: agreed sale price with the client. Fixed at creation.
export const workOrders = produccionSchema.table('work_orders', {
  workOrderId:    serial('work_order_id').primaryKey(),
  clientId:       integer('client_id').references(() => clients.clientId),
  title:          varchar('title', { length: 150 }).notNull(),
  description:    text('description'),
  status:         varchar('status', { length: 20 }).default('pending'),
  dueDate:        date('due_date').notNull(),
  advancePayment: numeric('advance_payment', { precision: 12, scale: 2 }).default('0'),
  estimatedCost:  numeric('estimated_cost', { precision: 12, scale: 2 }).default('0'),
  scrapCost:      numeric('scrap_cost', { precision: 12, scale: 2 }).default('0'),
  price:          numeric('price', { precision: 12, scale: 2 }).notNull(),
  startedAt:      timestamp('started_at', { withTimezone: true }),
  finishedAt:     timestamp('finished_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Reference images (provided by client) and result images (finished product).
// type = 'reference': client design specs — protects against design dispute claims.
// type = 'result': finished product photo (SRS RF-PR-011).
export const productionImages = produccionSchema.table('images', {
  imageId:     serial('image_id').primaryKey(),
  workOrderId: integer('work_order_id').notNull().references(() => workOrders.workOrderId, {
    onDelete: 'cascade',
  }),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  type:     varchar('type', { length: 20 }),
});