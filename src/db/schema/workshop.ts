import {
  pgSchema,
  serial,
  integer,
  varchar,
  numeric,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { clients } from './crm';
import { platforms, products } from './catalog';

export const tallerSchema = pgSchema('taller');

// Physical equipment registered per client.
// serial_number must be unique — prevents duplicate equipment tracking.
export const equipments = tallerSchema.table('equipments', {
  equipmentId:  serial('equipment_id').primaryKey(),
  clientId:     integer('client_id').references(() => clients.clientId),
  platformId:   integer('platform_id').references(() => platforms.platformId),
  serialNumber: varchar('serial_number', { length: 100 }).notNull().unique(),
  nickname:     varchar('nickname', { length: 50 }),
});

// Maintenance tickets — full lifecycle tracking.
// States: pending → in_progress → completed → paid → cancelled.
// total_parts_cost: sum of unit_cost_snapshot values (frozen historical cost).
// total_parts_price: sum of list prices of used parts (for BI labor vs parts breakdown).
// price: final sale price set by the technician — includes labor + parts.
// Pre-flight check on transition to 'completed': validates all parts have sufficient stock,
//   then atomically decrements inventory with reason_code WORKSHOP_CONSUMPTION.
export const maintenance = tallerSchema.table('maintenance', {
  maintenanceId:   serial('maintenance_id').primaryKey(),
  equipmentId:     integer('equipment_id').references(() => equipments.equipmentId),
  status:          varchar('status', { length: 20 }),
  technicalNotes:  text('technical_notes'),
  price:           numeric('price', { precision: 10, scale: 2 }),
  totalPartsCost:  numeric('total_parts_cost', { precision: 10, scale: 2 }).default('0'),
  totalPartsPrice: numeric('total_parts_price', { precision: 10, scale: 2 }).default('0'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Parts consumed per maintenance ticket.
// unit_cost_snapshot: frozen at the moment of completion — immutable for BI (SRS RNB-03).
// ON DELETE CASCADE: if a ticket is physically removed (dev only), parts go with it.
export const usedProducts = tallerSchema.table('used_products', {
  usedId:           serial('used_id').primaryKey(),
  maintenanceId:    integer('maintenance_id').notNull().references(() => maintenance.maintenanceId, {
    onDelete: 'cascade',
  }),
  productId:        integer('product_id').references(() => products.productId),
  quantity:         integer('quantity').notNull(),
  unitCostSnapshot: numeric('unit_cost_snapshot', { precision: 10, scale: 2 }).notNull(),
});

// Entry and exit photos per maintenance ticket.
// type = 'entry': documents equipment condition on arrival (legal protection).
// type = 'exit': documents equipment working on departure (SRS RNB-16).
export const workshopImages = tallerSchema.table('images', {
  imageId:       serial('image_id').primaryKey(),
  maintenanceId: integer('maintenance_id').notNull().references(() => maintenance.maintenanceId, {
    onDelete: 'cascade',
  }),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  type:     varchar('type', { length: 20 }),
});