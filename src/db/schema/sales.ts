import {
  pgSchema,
  serial,
  integer,
  numeric,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';
import { clients, consultations } from './crm';
import { cashRegisters } from './treasury';
import { products, games, promotions } from './catalog';
import { maintenance } from './workshop';
import { workOrders } from './production';

export const ventasSchema = pgSchema('ventas');

// Sales orders — central transaction record.
// Must be created inside the Master Transaction (SRS RNB-14):
//   stock decrement + cash register entry + CRM SLA close — all atomic.
// register_id: links to the open cash register for the shift.
//   cash_amount > 0 requires an open register (SRS RNB-09).
// consultation_id: optional. If set, its channel takes priority for acquisition attribution
//   over client.source_channel (SRS RF-OR-014 acquisition hierarchy).
// CONSTRAINT: cash_amount + transfer_amount must equal total_amount.
export const orders = ventasSchema.table('orders', {
  orderId:        serial('order_id').primaryKey(),
  clientId:       integer('client_id').references(() => clients.clientId),
  registerId:     integer('register_id').references(() => cashRegisters.registerId),
  consultationId: integer('consultation_id').references(() => consultations.consultationId),
  totalAmount:    numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  cashAmount:     numeric('cash_amount', { precision: 12, scale: 2 }).default('0'),
  transferAmount: numeric('transfer_amount', { precision: 12, scale: 2 }).default('0'),
  status:         varchar('status', { length: 20 }).default('completed'),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Individual line items within an order.
// Exactly one of (product_id, game_id, maintenance_id, work_order_id) should be set per row.
// promotion_id: set when the item belongs to a promotion bundle.
//   In that case, unit_price holds the prorated price (not the original list price).
// unit_cost / unit_price: frozen at the moment of sale — immutable for BI (SRS RNB-03).
//   These values NEVER change after the order is completed, even if catalog prices change.
// For maintenance items: unit_cost = sum of used_products.unit_cost_snapshot values.
// For work_order items: unit_cost = estimated_cost + scrap_cost.
export const orderItems = ventasSchema.table('order_items', {
  orderItemId:   serial('order_item_id').primaryKey(),
  orderId:       integer('order_id').notNull().references(() => orders.orderId, {
    onDelete: 'cascade',
  }),
  productId:     integer('product_id').references(() => products.productId),
  gameId:        integer('game_id').references(() => games.gameId),
  maintenanceId: integer('maintenance_id').references(() => maintenance.maintenanceId),
  workOrderId:   integer('work_order_id').references(() => workOrders.workOrderId),
  promotionId:   integer('promotion_id').references(() => promotions.promotionId),
  quantity:      integer('quantity').notNull().default(1),
  unitCost:      numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
  unitPrice:     numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  totalPrice:    numeric('total_price', { precision: 12, scale: 2 }).notNull(),
});