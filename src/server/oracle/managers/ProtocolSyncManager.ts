/**
 * Protocol Synchronization Manager
 * Handles starting and stopping protocol-specific sync services
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';

// import { getUnifiedInstance } from '../unifiedConfig';
import {
  chainlinkSyncManager,
  pythSyncManager,
  bandSyncManager,
  diaSyncManager,
  api3SyncManager,
  redstoneSyncManager,
} from '../sync';

import type { SyncManager, ProtocolSyncConfig } from '../types/serviceTypes';

export class ProtocolSyncManager {
  private activeSyncManagers: Map<string, SyncManager> = new Map();

  /**
   * Start all enabled protocol sync services
   */
  async startAllSync(): Promise<void> {
    try {
      const result = await query(
        `SELECT id, protocol, chain, enabled
         FROM unified_oracle_instances
         WHERE enabled = true`,
      );

      logger.info(`Found ${result.rows.length} enabled oracle instances`);

      for (const row of result.rows) {
        const config: ProtocolSyncConfig = {
          instanceId: row.id,
          protocol: row.protocol,
          chain: row.chain,
          enabled: row.enabled,
        };

        try {
          await this.startProtocolSync(config);
        } catch (error) {
          logger.error(`Failed to start sync for ${config.instanceId}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info(`Started ${this.activeSyncManagers.size} sync managers`);
    } catch (error) {
      logger.error('Failed to start protocol sync', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start a specific protocol sync
   */
  private async startProtocolSync(config: ProtocolSyncConfig): Promise<void> {
    const { instanceId, protocol } = config;

    switch (protocol) {
      case 'chainlink':
        await chainlinkSyncManager.startSync(instanceId);
        this.activeSyncManagers.set(instanceId, chainlinkSyncManager);
        break;

      case 'pyth':
        await pythSyncManager.startSync(instanceId);
        this.activeSyncManagers.set(instanceId, pythSyncManager);
        break;

      case 'band':
        await bandSyncManager.startSync(instanceId);
        this.activeSyncManagers.set(instanceId, bandSyncManager);
        break;

      case 'dia':
        await diaSyncManager.startSync(instanceId);
        this.activeSyncManagers.set(instanceId, diaSyncManager);
        break;

      case 'api3':
        await api3SyncManager.startSync(instanceId);
        this.activeSyncManagers.set(instanceId, api3SyncManager);
        break;

      case 'redstone':
        await redstoneSyncManager.startSync(instanceId);
        this.activeSyncManagers.set(instanceId, redstoneSyncManager);
        break;

      default:
        logger.warn(`Unknown protocol: ${protocol}, skipping sync for ${instanceId}`);
    }
  }

  /**
   * Stop all protocol sync services
   */
  async stopAllSync(): Promise<void> {
    logger.info('Stopping all protocol sync services...');

    // Stop specific protocol managers
    try {
      chainlinkSyncManager.stopAllSync();
      logger.debug('Chainlink sync stopped');
    } catch (error) {
      logger.error('Error stopping Chainlink sync', { error });
    }

    try {
      pythSyncManager.stopAllSync();
      logger.debug('Pyth sync stopped');
    } catch (error) {
      logger.error('Error stopping Pyth sync', { error });
    }

    try {
      bandSyncManager.stopAllSync();
      logger.debug('Band sync stopped');
    } catch (error) {
      logger.error('Error stopping Band sync', { error });
    }

    try {
      diaSyncManager.stopAllSync();
      logger.debug('DIA sync stopped');
    } catch (error) {
      logger.error('Error stopping DIA sync', { error });
    }

    try {
      api3SyncManager.stopAllSync();
      logger.debug('API3 sync stopped');
    } catch (error) {
      logger.error('Error stopping API3 sync', { error });
    }

    try {
      redstoneSyncManager.stopAllSync();
      logger.debug('RedStone sync stopped');
    } catch (error) {
      logger.error('Error stopping RedStone sync', { error });
    }

    // Stop all active sync managers
    for (const [instanceId, manager] of this.activeSyncManagers.entries()) {
      try {
        if (typeof manager.stopAllSync === 'function') {
          manager.stopAllSync();
        } else if (typeof manager.stop === 'function') {
          manager.stop();
        }
        logger.debug(`Sync stopped for instance: ${instanceId}`);
      } catch (error) {
        logger.error(`Error stopping sync for ${instanceId}`, { error });
      }
    }

    this.activeSyncManagers.clear();
    logger.info('All protocol sync stopped');
  }

  /**
   * Get count of active sync managers
   */
  getActiveSyncCount(): number {
    return this.activeSyncManagers.size;
  }
}
