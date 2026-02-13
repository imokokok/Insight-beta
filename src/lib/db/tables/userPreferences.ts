import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().notNull(),
  userId: uuid('user_id').notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
