import {
  pgSchema,
  serial,
  integer,
  varchar,
  numeric,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const catalogoSchema = pgSchema('catalogo');

// Product categories — supports self-referencing hierarchy (parent_category_id).
export const categories = catalogoSchema.table('categories', {
  categoryId:       serial('category_id').primaryKey(),
  name:             varchar('name', { length: 50 }).notNull(),
  parentCategoryId: integer('parent_category_id'),
});

// Gaming platforms (PS4, PS5, PC, etc.).
// Referenced by products, games, and workshop equipment.
export const platforms = catalogoSchema.table('platforms', {
  platformId: serial('platform_id').primaryKey(),
  name:       varchar('name', { length: 50 }).unique().notNull(),
});

// Physical products and base products.
// is_base_product = true: acts as price anchor for digital games (N:1).
//   These are hidden from the sales order UI to prevent operator error.
// price < cost_price override: backend-only validation with admin flag.
// Soft delete: is_active = false.
export const products = catalogoSchema.table('products', {
  productId:     serial('product_id').primaryKey(),
  categoryId:    integer('category_id').references(() => categories.categoryId),
  platformId:    integer('platform_id').references(() => platforms.platformId),
  name:          varchar('name', { length: 100 }).notNull(),
  costPrice:     numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
  price:         numeric('price', { precision: 12, scale: 2 }).notNull(),
  imageUrl:      varchar('image_url', { length: 500 }),
  isBaseProduct: boolean('is_base_product').default(false),
  isActive:      boolean('is_active').default(true),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Digital games — no stock, no own price.
// Price is always inherited from the parent product (product_id → is_base_product).
// Availability controlled by is_available toggle.
// Selling a game does NOT decrement any numeric stock.
export const games = catalogoSchema.table('games', {
  gameId:      serial('game_id').primaryKey(),
  productId:   integer('product_id').notNull().references(() => products.productId),
  title:       varchar('title', { length: 150 }).notNull(),
  imageUrl:    varchar('image_url', { length: 500 }),
  isAvailable: boolean('is_available').default(true),
});

// Services offered (repairs, cleaning, etc.).
// base_price is the suggested sale price; actual price is set per maintenance ticket.
// cost_price represents the labor/fixed cost baseline for BI margin calculations.
export const services = catalogoSchema.table('services', {
  serviceId:   serial('service_id').primaryKey(),
  name:        varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  costPrice:   numeric('cost_price', { precision: 10, scale: 2 }).notNull().default('0'),
  basePrice:   numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  isActive:    boolean('is_active').default(true),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Promotions / combos — flexible bundles sold at a fixed price.
// On sale, each component is inserted individually into order_items with prorated unit_price.
// No partial refunds allowed on promotions (SRS RNB-02).
export const promotions = catalogoSchema.table('promotions', {
  promotionId: serial('promotion_id').primaryKey(),
  name:        varchar('name', { length: 100 }).notNull(),
  price:       numeric('price', { precision: 12, scale: 2 }).notNull(),
  isActive:    boolean('is_active').default(true),
});

// Promotion line items — each row is one component of a promotion bundle.
// Exactly one of (product_id, service_id, game_id) should be set per row.
export const promotionItems = catalogoSchema.table('promotion_items', {
  promotionItemId: serial('promotion_item_id').primaryKey(),
  promotionId:     integer('promotion_id').references(() => promotions.promotionId, {
    onDelete: 'cascade',
  }),
  productId:  integer('product_id').references(() => products.productId),
  serviceId:  integer('service_id').references(() => services.serviceId),
  gameId:     integer('game_id'),
  quantity:   integer('quantity').default(1),
});