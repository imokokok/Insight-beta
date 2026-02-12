import type { TableDefinition, IndexDefinition, QueryFn } from './types';

export const utilityTables: TableDefinition[] = [
  {
    name: 'kv_store',
    sql: `
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `,
  },
];

export const utilityIndexes: IndexDefinition[] = [];

export async function createUtilityTables(queryFn: QueryFn): Promise<void> {
  for (const table of utilityTables) {
    await queryFn(table.sql);
  }
}

export async function createUtilityIndexes(_queryFn: QueryFn): Promise<void> {
  // No indexes for utility tables
}
