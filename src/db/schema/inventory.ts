import {
  pgSchema,
  serial,
  integer,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { products } from './catalog';
import { users } from './identity';

export const inventarioSchema = pgSchema('inventario');

// Current stock per physical product.
// ON DELETE RESTRICT on product_id: prevents accidental physical deletion of products
// that have stock records — last line of DB-level integrity defense (SRS RNF-07).
// quantity CHECK >= 0 enforced at DB level (SRS RNB-04).
export const stocks = inventarioSchema.table('stocks', {
  productId:    integer('product_id')
    .primaryKey()
    .references(() => products.productId, { onDelete: 'restrict' }),
  quantity:     integer('quantity').notNull().default(0),
  minThreshold: integer('min_threshold').default(5),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Full audit trail for every stock movement.
// reason_code is mandatory and standardized — free text alone is forbidden (SRS RNB-13).
// Known reason codes: SALE, SALE_CANCELLATION, WORKSHOP_CONSUMPTION,
//   MANUAL_ADJUSTMENT_LOSS, MANUAL_ADJUSTMENT_CORRECTION, PURCHASE_ENTRY.
// source_reference_id links back to the originating order_id or maintenance_id.
export const movements = inventarioSchema.table('movements', {
  movementId:        serial('movement_id').primaryKey(),
  productId:         integer('product_id').notNull().references(() => products.productId),
  userId:            integer('user_id').references(() => users.userId),
  type:              varchar('type', { length: 10 }).notNull(),
  quantity:          integer('quantity').notNull(),
  reasonCode:        varchar('reason_code', { length: 50 }).notNull(),
  reasonNotes:       text('reason_notes'),
  sourceReferenceId: varchar('source_reference_id', { length: 50 }),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow(),
});