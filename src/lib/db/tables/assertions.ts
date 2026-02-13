import {
  pgTable,
  uuid,
  varchar,
  numeric,
  boolean,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

export const assertions = pgTable('assertions', {
  id: uuid('id').primaryKey().notNull(),
  chainId: integer('chain_id').notNull(),
  assetId: varchar('asset_id', { length: 255 }).notNull(),
  assertionId: varchar('assertion_id', { length: 255 }).notNull(),
  claimer: varchar('claimer', { length: 255 }).notNull(),
  bond: numeric('bond', { precision: 78, scale: 0 }).notNull(),
  settled: boolean('settled').notNull().default(false),
  settlementDate: timestamp('settlement_date'),
  assertionData: jsonb('assertion_data').notNull(),
  domainId: varchar('domain_id', { length: 255 }),
  callbackGasLimit: integer('callback_gas_limit'),
  escalationManager: varchar('escalation_manager', { length: 255 }),
  expirationTime: timestamp('expiration_time'),
  currency: varchar('currency', { length: 255 }),
  identifier: varchar('identifier', { length: 255 }),
  displayName: varchar('display_name', { length: 255 }),
  blockNumber: integer('block_number'),
  blockTimestamp: timestamp('block_timestamp'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Assertion = typeof assertions.$inferSelect;
export type NewAssertion = typeof assertions.$inferInsert;
