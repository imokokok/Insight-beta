import { pgTable, uuid, varchar, numeric, timestamp, integer } from 'drizzle-orm/pg-core';

export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().notNull(),
  assertionId: varchar('assertion_id', { length: 255 }).notNull(),
  disputer: varchar('disputer', { length: 255 }).notNull(),
  bond: numeric('bond', { precision: 78, scale: 0 }).notNull(),
  arbitrationVote: varchar('arbitration_vote', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  roundId: integer('round_id').notNull().default(0),
  txHash: varchar('tx_hash', { length: 255 }),
  chainId: integer('chain_id').notNull(),
  blockNumber: integer('block_number'),
  blockTimestamp: timestamp('block_timestamp'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
