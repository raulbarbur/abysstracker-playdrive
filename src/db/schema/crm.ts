import {
  pgSchema,
  serial,
  integer,
  varchar,
  boolean,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { products, games, services } from './catalog';
import { equipments } from './workshop';
import { workOrders } from './production';

export const crmSchema = pgSchema('crm');

// Client registry.
// source_channel: immutable after creation — protected at service layer (SRS RNB-12).
//   Never overwritten by profile updates. Used for LTV channel attribution.
// client_id = 1 is reserved for "Consumidor Final" — indestructible (SRS RNB-01).
// Soft delete: is_active = false (SRS Section 2.5).
export const clients = crmSchema.table('clients', {
  clientId:      serial('client_id').primaryKey(),
  firstName:     varchar('first_name', { length: 100 }).notNull(),
  lastName:      varchar('last_name', { length: 100 }).notNull(),
  phone:         varchar('phone', { length: 20 }),
  email:         varchar('email', { length: 100 }),
  sourceChannel: varchar('source_channel', { length: 50 }),
  isActive:      boolean('is_active').default(true),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Inbound consultation records from social channels.
// message_received_at: the REAL time the client sent the message — entered manually by
//   the operator. Used as SLA start point (NOT created_at).
// answered_at: stamped automatically by the server when status → 'answered'. Immutable.
// SLA metric = answered_at - message_received_at (SRS RF-CO-006, RNB-05).
export const consultations = crmSchema.table('consultations', {
  consultationId:    serial('consultation_id').primaryKey(),
  clientId:          integer('client_id').references(() => clients.clientId),
  channel:           varchar('channel', { length: 50 }).notNull(),
  messageReceivedAt: timestamp('message_received_at', { withTimezone: true }).notNull(),
  messageText:       text('message_text').notNull(),
  responseStatus:    varchar('response_status', { length: 20 }).default('pending'),
  answeredAt:        timestamp('answered_at', { withTimezone: true }),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Immutable snapshot: physical product stock at the exact moment of consultation.
// stock_at_consultation: frozen — never updated even if client replies days later.
// Powers the "Hidden Demand" BI report (SRS RF-CO-007).
export const consultationProducts = crmSchema.table('consultation_products', {
  consultationId:    integer('consultation_id').notNull().references(() => consultations.consultationId, {
    onDelete: 'cascade',
  }),
  productId:         integer('product_id').notNull().references(() => products.productId, {
    onDelete: 'cascade',
  }),
  stockAtConsultation: integer('stock_at_consultation').notNull(),
});

// Pivot: services referenced in a consultation.
export const consultationServices = crmSchema.table('consultation_services', {
  consultationId: integer('consultation_id').notNull().references(() => consultations.consultationId, {
    onDelete: 'cascade',
  }),
  serviceId: integer('service_id').notNull().references(() => services.serviceId, {
    onDelete: 'cascade',
  }),
});

// Immutable snapshot: digital game availability at the exact moment of consultation.
// was_available: frozen — never updated (SRS RF-CO-007).
// Powers the "Hidden Demand" BI report for digital catalog.
export const consultationGames = crmSchema.table('consultation_games', {
  consultationId: integer('consultation_id').notNull().references(() => consultations.consultationId, {
    onDelete: 'cascade',
  }),
  gameId:       integer('game_id').notNull().references(() => games.gameId, {
    onDelete: 'cascade',
  }),
  wasAvailable: boolean('was_available').notNull(),
});

// Logistics scheduling — tracks client arrivals to the operator's home address (Pickup model).
// arrival_datetime: stamped when status → 'arrived'. Delta with updated_at → door wait time KPI.
// Links optionally to equipment (workshop), order (sales), or work_order (production).
export const agenda = crmSchema.table('agenda', {
  agendaId:         serial('agenda_id').primaryKey(),
  clientId:         integer('client_id').references(() => clients.clientId),
  equipmentId:      integer('equipment_id').references(() => equipments.equipmentId),
  workOrderId:      integer('work_order_id').references(() => workOrders.workOrderId),
  scheduledDatetime: timestamp('scheduled_datetime', { withTimezone: true }).notNull(),
  arrivalDatetime:  timestamp('arrival_datetime', { withTimezone: true }),
  status:           varchar('status', { length: 20 }).notNull(),
  notes:            text('notes'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow(),
});