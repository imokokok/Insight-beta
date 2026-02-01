import { hasDatabase, query } from './db';
import { logger } from '@/lib/logger';

interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  isUnique?: boolean;
  isPartial?: boolean;
  condition?: string;
  indexMethod?: 'btree' | 'hash' | 'gist' | 'gin';
  comment?: string;
}

const RECOMMENDED_INDEXES: IndexDefinition[] = [
  // Oracle Instances - Core indexes
  {
    name: 'idx_oracle_instances_chain',
    table: 'oracle_instances',
    columns: ['chain'],
    comment: 'Optimize chain-based queries',
  },
  {
    name: 'idx_oracle_instances_enabled',
    table: 'oracle_instances',
    columns: ['enabled'],
    comment: 'Filter enabled instances',
  },
  {
    name: 'idx_oracle_instances_chain_enabled',
    table: 'oracle_instances',
    columns: ['chain', 'enabled'],
    comment: 'Composite index for chain and status queries',
  },
  {
    name: 'idx_oracle_instances_updated_at',
    table: 'oracle_instances',
    columns: ['updated_at DESC'],
    comment: 'Recent instance updates',
  },
  // NEW: High-frequency query optimization indexes
  {
    name: 'idx_oracle_instances_protocol_chain',
    table: 'oracle_instances',
    columns: ['protocol', 'chain'],
    comment: 'Protocol and chain combined queries for multi-protocol monitoring',
  },
  {
    name: 'idx_oracle_instances_address',
    table: 'oracle_instances',
    columns: ['address'],
    indexMethod: 'hash',
    comment: 'Fast address lookups',
  },

  // Assertions - High traffic table
  {
    name: 'idx_assertions_oracle_address',
    table: 'assertions',
    columns: ['oracle_address'],
    indexMethod: 'btree',
    comment: 'Filter assertions by oracle',
  },
  {
    name: 'idx_assertions_disputer',
    table: 'assertions',
    columns: ['disputer'],
    indexMethod: 'hash',
    comment: 'Find assertions by disputer',
  },
  {
    name: 'idx_assertions_assertor',
    table: 'assertions',
    columns: ['assertor'],
    indexMethod: 'hash',
    comment: 'Find assertions by assertor',
  },
  {
    name: 'idx_assertions_timestamp',
    table: 'assertions',
    columns: ['assertion_timestamp'],
    comment: 'Time-based queries',
  },
  {
    name: 'idx_assertions_oracle_timestamp',
    table: 'assertions',
    columns: ['oracle_address', 'assertion_timestamp'],
    comment: 'Composite for oracle-specific time queries',
  },
  {
    name: 'idx_assertions_status_timestamp',
    table: 'assertions',
    columns: ['status', 'assertion_timestamp DESC'],
    comment: 'Status-based recent queries',
  },
  {
    name: 'idx_assertions_chain_status',
    table: 'assertions',
    columns: ['chain', 'status'],
    comment: 'Chain and status filtering',
  },
  {
    name: 'idx_assertions_protocol',
    table: 'assertions',
    columns: ['protocol'],
    comment: 'Protocol-based queries',
  },
  {
    name: 'idx_assertions_market',
    table: 'assertions',
    columns: ['market'],
    comment: 'Market-based queries',
  },
  {
    name: 'idx_assertions_block_number',
    table: 'assertions',
    columns: ['block_number DESC'],
    comment: 'Block number queries',
  },
  // NEW: Instance-based status queries for monitoring dashboard
  {
    name: 'idx_assertions_instance_status',
    table: 'assertions',
    columns: ['instance_id', 'status'],
    comment: 'Instance status filtering for monitoring dashboard',
  },
  {
    name: 'idx_assertions_asserted_at',
    table: 'assertions',
    columns: ['asserted_at DESC'],
    comment: 'Recent assertions time-based queries',
  },

  // Disputes - High traffic table
  {
    name: 'idx_disputes_assertion_id',
    table: 'disputes',
    columns: ['assertion_id'],
    indexMethod: 'hash',
    comment: 'Find disputes by assertion',
  },
  {
    name: 'idx_disputes_status',
    table: 'disputes',
    columns: ['status'],
    comment: 'Filter disputes by status',
  },
  {
    name: 'idx_disputes_oracle_address',
    table: 'disputes',
    columns: ['oracle_address'],
    comment: 'Find disputes by oracle',
  },
  {
    name: 'idx_disputes_status_timestamp',
    table: 'disputes',
    columns: ['status', 'disputed_at DESC'],
    comment: 'Recent disputes by status',
  },
  {
    name: 'idx_disputes_disputer',
    table: 'disputes',
    columns: ['disputer'],
    comment: 'Find disputes by disputer',
  },
  // NEW: Instance-based dispute queries
  {
    name: 'idx_disputes_instance_status',
    table: 'disputes',
    columns: ['instance_id', 'status'],
    comment: 'Instance dispute status filtering',
  },

  // Events - Time-series data
  {
    name: 'idx_events_oracle_address',
    table: 'events',
    columns: ['oracle_address'],
    comment: 'Filter events by oracle',
  },
  {
    name: 'idx_events_block_number',
    table: 'events',
    columns: ['block_number'],
    comment: 'Time/block-based queries',
  },
  {
    name: 'idx_events_oracle_block',
    table: 'events',
    columns: ['oracle_address', 'block_number'],
    comment: 'Composite for oracle-specific block queries',
  },
  {
    name: 'idx_events_event_type',
    table: 'events',
    columns: ['event_type'],
    indexMethod: 'hash',
    comment: 'Filter by event type',
  },
  {
    name: 'idx_events_timestamp',
    table: 'events',
    columns: ['created_at DESC'],
    comment: 'Recent events',
  },

  // Price Data - Time-series
  {
    name: 'idx_price_data_timestamp',
    table: 'price_data',
    columns: ['timestamp'],
    comment: 'Time-based price queries',
  },
  {
    name: 'idx_price_data_oracle_timestamp',
    table: 'price_data',
    columns: ['oracle_address', 'timestamp'],
    comment: 'Composite for oracle-specific price history',
  },

  // Alerts - Status tracking
  {
    name: 'idx_alerts_severity',
    table: 'alerts',
    columns: ['severity'],
    comment: 'Filter alerts by severity',
  },
  {
    name: 'idx_alerts_status',
    table: 'alerts',
    columns: ['status'],
    comment: 'Filter alerts by status',
  },
  {
    name: 'idx_alerts_created_at',
    table: 'alerts',
    columns: ['created_at'],
    comment: 'Time-based alert queries',
  },
  {
    name: 'idx_alerts_status_severity',
    table: 'alerts',
    columns: ['status', 'severity'],
    comment: 'Status and severity filtering',
  },
  {
    name: 'idx_alerts_fingerprint',
    table: 'alerts',
    columns: ['fingerprint'],
    indexMethod: 'hash',
    comment: 'Fast fingerprint lookups',
  },

  // Audit Logs
  {
    name: 'idx_audit_entity',
    table: 'audit_logs',
    columns: ['entity_type', 'entity_id'],
    comment: 'Find audit logs by entity',
  },
  {
    name: 'idx_audit_actor',
    table: 'audit_logs',
    columns: ['actor'],
    indexMethod: 'hash',
    comment: 'Find audit logs by actor',
  },
  {
    name: 'idx_audit_timestamp',
    table: 'audit_logs',
    columns: ['created_at'],
    comment: 'Time-based audit queries',
  },

  // Rate Limits
  {
    name: 'idx_rate_limits_key',
    table: 'rate_limits',
    columns: ['key'],
    indexMethod: 'hash',
    comment: 'Fast rate limit lookups',
  },
  {
    name: 'idx_rate_limits_reset',
    table: 'rate_limits',
    columns: ['reset_at'],
    comment: 'Clean up expired rate limits',
  },

  // KV Store
  {
    name: 'idx_kv_store_prefix',
    table: 'kv_store',
    columns: ['key'],
    isPartial: true,
    condition: "key LIKE 'api_cache/v1/%'",
    comment: 'Cache key lookups',
  },

  // Sync Metrics - Performance monitoring
  {
    name: 'idx_sync_metrics_recorded_at',
    table: 'sync_metrics',
    columns: ['recorded_at DESC'],
    comment: 'Recent sync metrics',
  },
  {
    name: 'idx_sync_metrics_error',
    table: 'sync_metrics',
    columns: ['error'],
    isPartial: true,
    condition: 'error IS NOT NULL',
    comment: 'Failed sync queries',
  },

  // Votes
  {
    name: 'idx_votes_assertion_voter',
    table: 'votes',
    columns: ['assertion_id', 'voter'],
    comment: 'Votes by assertion and voter',
  },
  {
    name: 'idx_votes_created_at',
    table: 'votes',
    columns: ['created_at DESC'],
    comment: 'Recent votes',
  },

  // Oracle Events
  {
    name: 'idx_oracle_events_type_timestamp',
    table: 'oracle_events',
    columns: ['event_type', 'created_at DESC'],
    comment: 'Event type with time filtering',
  },
];

export async function getExistingIndexes(tableName?: string): Promise<Set<string>> {
  if (!hasDatabase()) return new Set();

  try {
    let sql = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `;

    const params: (string | undefined)[] = [];
    if (tableName) {
      sql += ' AND tablename = $1';
      params.push(tableName);
    } else {
      params.push(undefined);
    }

    const result = await query<{ indexname: string; tablename: string }>(sql, params);

    return new Set(result.rows.map((row) => row.indexname));
  } catch (error) {
    logger.warn('Failed to get existing indexes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Set();
  }
}

export async function getMissingIndexes(): Promise<IndexDefinition[]> {
  const existingIndexes = await getExistingIndexes();
  const missing: IndexDefinition[] = [];

  for (const index of RECOMMENDED_INDEXES) {
    if (!existingIndexes.has(index.name)) {
      missing.push(index);
    }
  }

  return missing;
}

export async function createIndex(index: IndexDefinition): Promise<boolean> {
  if (!hasDatabase()) return false;

  try {
    const columns = index.columns.join(', ');
    const method = index.indexMethod ?? 'btree';
    let sql = `CREATE${index.isUnique ? ' UNIQUE' : ''} INDEX ${index.name} ON ${index.table} USING ${method} (${columns})`;

    if (index.isPartial && index.condition) {
      sql += ` WHERE ${index.condition}`;
    }

    await query(sql);

    if (index.comment) {
      await query(`COMMENT ON INDEX ${index.name} IS $1`, [index.comment]);
    }

    logger.info('Created index', { index: index.name, table: index.table });
    return true;
  } catch (error) {
    logger.error('Failed to create index', {
      index: index.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export async function createAllMissingIndexes(): Promise<{
  created: number;
  failed: number;
  indexes: IndexDefinition[];
}> {
  const missing = await getMissingIndexes();
  let created = 0;
  let failed = 0;

  for (const index of missing) {
    const success = await createIndex(index);
    if (success) {
      created++;
    } else {
      failed++;
    }
  }

  return {
    created,
    failed,
    indexes: missing,
  };
}

export async function dropObsoleteIndexes(): Promise<{
  dropped: number;
  failed: number;
  droppedNames: string[];
}> {
  if (!hasDatabase()) {
    return { dropped: 0, failed: 0, droppedNames: [] };
  }

  const existingIndexes = await getExistingIndexes();
  const recommendedIndexNames = new Set(RECOMMENDED_INDEXES.map((i) => i.name));
  const obsolete: string[] = [];

  for (const name of existingIndexes) {
    if (!recommendedIndexNames.has(name) && name.startsWith('idx_')) {
      obsolete.push(name);
    }
  }

  let dropped = 0;
  let failed = 0;
  const droppedNames: string[] = [];

  for (const name of obsolete) {
    try {
      await query(`DROP INDEX IF EXISTS ${name}`);
      droppedNames.push(name);
      dropped++;
    } catch (error) {
      logger.warn('Failed to drop obsolete index', {
        index: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  return { dropped, failed, droppedNames };
}

export async function analyzeTable(tableName: string): Promise<void> {
  if (!hasDatabase()) return;

  try {
    await query(`ANALYZE ${tableName}`);
    logger.info('Analyzed table', { table: tableName });
  } catch (error) {
    logger.warn('Failed to analyze table', {
      table: tableName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function reindexTable(tableName: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  try {
    await query(`REINDEX TABLE ${tableName}`);
    logger.info('Reindexed table', { table: tableName });
    return true;
  } catch (error) {
    logger.error('Failed to reindex table', {
      table: tableName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export async function getTableStats(): Promise<
  Array<{
    tableName: string;
    rowCount: number;
    tableSize: string;
    indexSize: string;
    deadTuples: number;
    lastVacuum: string | null;
    lastAnalyze: string | null;
  }>
> {
  if (!hasDatabase()) return [];

  try {
    const result = await query<{
      relname: string;
      n_live_tup: number;
      pg_size_pretty: string;
      pg_indexes_size_pretty: string;
      n_dead_tup: string;
      last_vacuum: string | null;
      last_analyze: string | null;
    }>(`
      SELECT
        relname,
        n_live_tup,
        pg_size_pretty(pg_total_relation_size(relid)) as table_size,
        pg_size_pretty(pg_indexes_size(relid)) as index_size,
        n_dead_tup,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
    `);

    return result.rows.map((row) => ({
      tableName: row.relname,
      rowCount: Number(row.n_live_tup),
      tableSize: row.pg_size_pretty,
      indexSize: row.pg_indexes_size_pretty,
      deadTuples: Number(row.n_dead_tup),
      lastVacuum: row.last_vacuum,
      lastAnalyze: row.last_analyze,
    }));
  } catch {
    return [];
  }
}

export async function getMissingTableStats(): Promise<string[]> {
  if (!hasDatabase()) return [];

  try {
    const result = await query<{ relname: string }>(`
      SELECT relname
      FROM pg_stat_user_tables
      WHERE last_analyze IS NULL AND last_autoanalyze IS NULL
      ORDER BY relname
    `);

    return result.rows.map((row) => row.relname);
  } catch {
    return [];
  }
}

export async function runMaintenance(): Promise<{
  indexesCreated: number;
  indexesDropped: number;
  tablesAnalyzed: number;
  tablesReindexed: number;
}> {
  if (!hasDatabase()) {
    return {
      indexesCreated: 0,
      indexesDropped: 0,
      tablesAnalyzed: 0,
      tablesReindexed: 0,
    };
  }

  const createResult = await createAllMissingIndexes();
  const dropResult = await dropObsoleteIndexes();

  const tableStats = await getTableStats();
  let tablesAnalyzed = 0;
  let tablesReindexed = 0;

  for (const stat of tableStats) {
    if (stat.lastAnalyze === null || stat.deadTuples > 1000) {
      await analyzeTable(stat.tableName);
      tablesAnalyzed++;
    }

    if (stat.deadTuples > 10000) {
      await reindexTable(stat.tableName);
      tablesReindexed++;
    }
  }

  return {
    indexesCreated: createResult.created,
    indexesDropped: dropResult.dropped,
    tablesAnalyzed,
    tablesReindexed,
  };
}

export async function getIndexUsageStats(): Promise<
  Array<{
    indexName: string;
    tableName: string;
    indexScans: number;
    indexSize: string;
    indexColumns: string;
  }>
> {
  if (!hasDatabase()) return [];

  try {
    const result = await query<{
      indexrelname: string;
      relname: string;
      idx_scan: string;
      pg_size_pretty: string;
      index_columns: string;
    }>(`
      SELECT
        indexrelname,
        relname,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_get_indexdef(indexrelid) as index_columns
      FROM pg_stat_user_indexes
      LEFT JOIN pg_index ON indexrelid = pg_index.indexrelid
      WHERE ind IS NULL OR NOT indisprimary
      ORDER BY pg_relation_size(indexrelid) DESC
    `);

    return result.rows.map((row) => ({
      indexName: row.indexrelname,
      tableName: row.relname,
      indexScans: Number(row.idx_scan),
      indexSize: row.pg_size_pretty,
      indexColumns: row.index_columns,
    }));
  } catch {
    return [];
  }
}

export async function getUnusedIndexes(thresholdScans: number = 10): Promise<string[]> {
  const usageStats = await getIndexUsageStats();

  return usageStats
    .filter((stat) => stat.indexScans < thresholdScans && stat.indexName.startsWith('idx_'))
    .map((stat) => stat.indexName);
}

export { RECOMMENDED_INDEXES };
