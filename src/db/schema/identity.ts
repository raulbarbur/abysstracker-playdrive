import {
  pgSchema,
  serial,
  varchar,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

export const identidadSchema = pgSchema('identidad');

// System users (operators and admins).
// Auth is handled via custom JWT (stateless, 12h).
// Lockout logic: after 5 failed attempts, account is locked for 15 minutes.
// Soft delete only — is_active = false preserves full operational history.
// PWA preferences (theme, font_size) are returned in the login JWT payload.
export const users = identidadSchema.table('users', {
  userId:              serial('user_id').primaryKey(),
  username:            varchar('username', { length: 50 }).unique().notNull(),
  passwordHash:        varchar('password_hash', { length: 255 }).notNull(),
  fullName:            varchar('full_name', { length: 100 }).notNull(),
  role:                varchar('role', { length: 20 }).notNull(),
  email:               varchar('email', { length: 100 }),
  isActive:            boolean('is_active').default(true),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockoutUntil:        timestamp('lockout_until', { withTimezone: true }),
  themePreference:     varchar('theme_preference', { length: 20 }).default('system'),
  fontSizePreference:  varchar('font_size_preference', { length: 20 }).default('large'),
  createdAt:           timestamp('created_at', { withTimezone: true }).defaultNow(),
});