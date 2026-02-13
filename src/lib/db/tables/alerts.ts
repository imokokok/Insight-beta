import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  acknowledged: boolean('acknowledged').notNull().default(false),
  acknowledgedBy: varchar('acknowledged_by', { length: 255 }),
  acknowledgedAt: timestamp('acknowledged_at'),
  userId: uuid('user_id'),
  chainId: integer('chain_id'),
  protocol: varchar('protocol', { length: 50 }),
  assetId: varchar('asset_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
