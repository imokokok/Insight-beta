import { hasDatabase, query } from '@/server/db';
import { logger } from '@/lib/logger';
import type { QueryFn } from './types';
import {
  createCoreTables,
  createCoreIndexes,
  runCoreMigrations,
  insertCoreInitialData,
} from './coreTables';
import { createUMATables, createUMAIndexes, insertUMAInitialData } from './umaTables';
import { createMonitoringTables, createMonitoringIndexes } from './monitoringTables';
import { createUtilityTables, createUtilityIndexes } from './utilityTables';

/**
 * Safely rollback a transaction, logging any errors
 */
async function safeRollback(): Promise<void> {
  try {
    await query('ROLLBACK');
  } catch (rollbackError) {
    logger.error('Failed to rollback transaction', {
      error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
    });
    throw rollbackError;
  }
}

/**
 * Ensure all database schema is created
 * This is the main entry point for schema initialization
 */
export async function ensureSchema(): Promise<void> {
  if (!hasDatabase()) {
    logger.debug('Database not available, skipping schema creation');
    return;
  }

  logger.info('Starting database schema initialization...');

  try {
    // Create core tables (oracle_instances, assertions, disputes, votes, etc.)
    await createCoreTables(query as QueryFn);
    logger.debug('Core tables created');

    // Create UMA-specific tables
    await createUMATables(query as QueryFn);
    logger.debug('UMA tables created');

    // Create monitoring tables (alerts, audit_log, etc.)
    await createMonitoringTables(query as QueryFn);
    logger.debug('Monitoring tables created');

    // Create utility tables (kv_store, etc.)
    await createUtilityTables(query as QueryFn);
    logger.debug('Utility tables created');

    // Create all indexes
    await createCoreIndexes(query as QueryFn);
    await createUMAIndexes(query as QueryFn);
    await createMonitoringIndexes(query as QueryFn);
    await createUtilityIndexes(query as QueryFn);
    logger.debug('Indexes created');

    // Run migrations for schema updates
    await runCoreMigrations(query as QueryFn, safeRollback);
    logger.debug('Migrations completed');

    // Insert initial data
    await insertCoreInitialData(query as QueryFn);
    await insertUMAInitialData(query as QueryFn);
    logger.debug('Initial data inserted');

    logger.info('Database schema initialization completed successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
