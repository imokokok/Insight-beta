import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as alerts from './tables/alerts';
import * as assertions from './tables/assertions';
import * as disputes from './tables/disputes';
import * as priceFeeds from './tables/priceFeeds';
import * as userPreferences from './tables/userPreferences';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema: {
    ...assertions,
    ...alerts,
    ...disputes,
    ...priceFeeds,
    ...userPreferences,
  },
});

export * from './tables/assertions';
export * from './tables/alerts';
export * from './tables/disputes';
export * from './tables/priceFeeds';
export * from './tables/userPreferences';
