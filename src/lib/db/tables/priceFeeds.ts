import { pgTable, uuid, varchar, numeric, timestamp, bigint, integer } from 'drizzle-orm/pg-core';

export const priceFeeds = pgTable(
  'price_feeds',
  {
    id: uuid('id').primaryKey().notNull(),
    protocol: varchar('protocol', { length: 50 }).notNull(),
    chainId: integer('chain_id').notNull(),
    assetId: varchar('asset_id', { length: 255 }).notNull(),
    price: numeric('price', { precision: 78, scale: 8 }).notNull(),
    confidence: numeric('confidence', { precision: 5, scale: 2 }),
    timestamp: timestamp('timestamp').notNull(),
    blockNumber: bigint('block_number', { mode: 'number' }),
    source: varchar('source', { length: 255 }),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      chainIdAssetIdProtocolUnique: {
        columns: [table.chainId, table.assetId, table.protocol],
        name: 'price_feeds_chain_asset_protocol_unique',
      },
      timestampIdx: {
        columns: [table.timestamp],
        name: 'price_feeds_timestamp_idx',
      },
    };
  },
);

export type PriceFeed = typeof priceFeeds.$inferSelect;
export type NewPriceFeed = typeof priceFeeds.$inferInsert;
