/**
 * Protocol Synchronization Manager
 * Handles starting and stopping protocol-specific sync services
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import { getUnifiedInstance } from '../unifiedConfig';
import { chainlinkSyncManager } from '../chainlinkSync';
import { pythSyncManager } from '../pythSync';
import { bandSyncManager } from '../bandSync';
import { API3SyncManager } from '../api3Sync';
import { startRedStoneSync, stopRedStoneSync } from '../redstoneSync';
import { SwitchboardSyncService } from '../switchboardSync';
import { startFluxSync, stopFluxSync } from '../fluxSync';
import { startDIASync, stopDIASync } from '../diaSync';
import type { SyncManager, ProtocolSyncConfig } from '../types/serviceTypes';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

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
    const { instanceId, protocol, chain } = config;

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
        await this.startBandSync(instanceId, chain);
        break;

      case 'api3':
        await this.startAPI3Sync(instanceId);
        break;

      case 'redstone':
        await startRedStoneSync(instanceId);
        this.activeSyncManagers.set(instanceId, {
          stopAllSync: () => stopRedStoneSync(instanceId),
        });
        break;

      case 'switchboard':
        await this.startSwitchboardSync(instanceId);
        break;

      case 'flux':
        await startFluxSync(instanceId);
        this.activeSyncManagers.set(instanceId, {
          stopAllSync: () => stopFluxSync(instanceId),
        });
        break;

      case 'dia':
        await startDIASync(instanceId);
        this.activeSyncManagers.set(instanceId, {
          stopAllSync: () => stopDIASync(instanceId),
        });
        break;

      default:
        logger.warn(`Unknown protocol: ${protocol}, skipping sync for ${instanceId}`);
    }
  }

  /**
   * Start Band sync
   */
  private async startBandSync(instanceId: string, chain: string): Promise<void> {
    const instance = await getUnifiedInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    const protocolConfig = instance.config.protocolConfig as
      | {
          symbols?: string[];
          bandEndpoint?: string;
        }
      | undefined;

    const symbols = protocolConfig?.symbols || ['ETH/USD', 'BTC/USD', 'LINK/USD'];
    const bandEndpoint = protocolConfig?.bandEndpoint;

    const { BandSyncService } = await import('../bandSync');

    const service = new BandSyncService({
      instanceId,
      chain: chain as SupportedChain,
      rpcUrl: instance.config.rpcUrl || '',
      bandEndpoint,
      symbols,
      intervalMs: instance.config.syncIntervalMs || 60000,
    });

    await service.start();
    this.activeSyncManagers.set(instanceId, { stopAllSync: () => service.stop() });

    logger.info('Band sync started', { instanceId, chain, symbolsCount: symbols.length });
  }

  /**
   * Start API3 sync
   */
  private async startAPI3Sync(instanceId: string): Promise<void> {
    const manager = new API3SyncManager();
    await manager.startSync(instanceId);
    this.activeSyncManagers.set(instanceId, {
      stopAllSync: () => manager.stopSync(instanceId),
    });
  }

  /**
   * Start Switchboard sync
   */
  private async startSwitchboardSync(instanceId: string): Promise<void> {
    const instance = await getUnifiedInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    const symbols = (instance.config.protocolConfig as { symbols?: string[] } | undefined)
      ?.symbols || ['ETH/USD', 'BTC/USD', 'LINK/USD'];

    const service = new SwitchboardSyncService({
      instanceId,
      chain: instance.chain,
      rpcUrl: instance.config.rpcUrl || '',
      symbols,
      intervalMs: instance.config.syncIntervalMs || 60000,
    });

    await service.start();
    this.activeSyncManagers.set(instanceId, { stopAllSync: () => service.stop() });
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
