/**
 * Solana DAO
 *
 * Solana 数据访问对象（使用内存存储）
 */

import {
  solanaStorage,
  type SolanaPriceFeed,
  type SolanaPriceHistory,
  type SolanaOracleInstance,
  type SolanaSyncStatus,
  type SolanaAlert,
} from '@/lib/db/schema/solana';

// ============================================================================
// Price Feed DAO
// ============================================================================

export class SolanaPriceFeedDao {
  async create(data: Omit<SolanaPriceFeed, 'id' | 'createdAt' | 'updatedAt'>) {
    return solanaStorage.createPriceFeed(data);
  }

  async findById(id: number) {
    return solanaStorage.getPriceFeed(id);
  }

  async findBySymbolAndProtocol(symbol: string, protocol: string, chain: string = 'solana') {
    return solanaStorage.getPriceFeedBySymbol(symbol, protocol, chain);
  }

  async findAllActive(chain?: string) {
    return solanaStorage.getAllActivePriceFeeds(chain);
  }

  async update(id: number, data: Partial<SolanaPriceFeed>) {
    return solanaStorage.updatePriceFeed(id, data);
  }

  async updatePrice(
    symbol: string,
    protocol: string,
    price: string,
    confidence: string | null,
    slot: number,
    chain: string = 'solana',
  ) {
    const feed = await this.findBySymbolAndProtocol(symbol, protocol, chain);
    if (!feed) return undefined;

    return solanaStorage.updatePriceFeed(feed.id, {
      price,
      confidence,
      slot,
      lastUpdate: new Date(),
    });
  }

  async delete(id: number) {
    // Soft delete by marking inactive
    return solanaStorage.updatePriceFeed(id, { isActive: false });
  }
}

// ============================================================================
// Price History DAO
// ============================================================================

export class SolanaPriceHistoryDao {
  async create(data: Omit<SolanaPriceHistory, 'id' | 'createdAt'>) {
    return solanaStorage.addPriceHistory(data.feedId, data);
  }

  async createMany(data: Omit<SolanaPriceHistory, 'id' | 'createdAt'>[]) {
    return data.map((d) => solanaStorage.addPriceHistory(d.feedId, d));
  }

  async getHistory(feedId: number, limit: number = 100) {
    return solanaStorage.getPriceHistory(feedId, limit);
  }

  async getLatest(feedId: number) {
    const history = solanaStorage.getPriceHistory(feedId, 1);
    return history[0];
  }
}

// ============================================================================
// Oracle Instance DAO
// ============================================================================

export class SolanaOracleInstanceDao {
  async create(data: Omit<SolanaOracleInstance, 'id' | 'createdAt' | 'updatedAt'>) {
    return solanaStorage.createInstance(data);
  }

  async findByInstanceId(instanceId: string) {
    return solanaStorage.getInstanceById(instanceId);
  }

  async findAllEnabled(chain?: string) {
    return solanaStorage.getAllEnabledInstances(chain);
  }

  async findAll(chain?: string) {
    let instances = Array.from(
      (
        solanaStorage as unknown as { instances: Map<number, SolanaOracleInstance> }
      ).instances?.values() || [],
    );
    if (chain) {
      instances = instances.filter((i) => i.chain === chain);
    }
    return instances.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  async update(id: number, data: Partial<SolanaOracleInstance>) {
    return solanaStorage.updateInstance(id, data);
  }

  async updateSyncStatus(
    instanceId: string,
    status: string,
    lastSyncAt?: Date,
    lastProcessedSlot?: number,
    errorCount?: number,
    lastError?: string,
  ) {
    const instance = await this.findByInstanceId(instanceId);
    if (!instance) return undefined;

    return solanaStorage.updateInstance(instance.id, {
      status: status as 'active' | 'stopped' | 'error',
      lastSyncAt: lastSyncAt || new Date(),
      lastProcessedSlot,
      errorCount: errorCount ?? 0,
      lastError,
    });
  }

  async delete(id: number) {
    return solanaStorage.updateInstance(id, { enabled: false });
  }
}

// ============================================================================
// Sync Status DAO
// ============================================================================

export class SolanaSyncStatusDao {
  async upsert(data: Omit<SolanaSyncStatus, 'id' | 'updatedAt'>) {
    return solanaStorage.upsertSyncStatus(data);
  }

  async findByInstanceId(instanceId: string) {
    return solanaStorage.getSyncStatusByInstance(instanceId);
  }

  async findAllActive() {
    return Array.from(
      (
        solanaStorage as unknown as { syncStatus: Map<number, SolanaSyncStatus> }
      ).syncStatus?.values() || [],
    )
      .filter((s) => s.status === 'active')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateStatus(instanceId: string, status: string, error?: string) {
    const existing = await this.findByInstanceId(instanceId);
    if (existing) {
      return solanaStorage.upsertSyncStatus({
        ...existing,
        status: status as 'active' | 'stopped' | 'error',
        lastError: error,
      });
    }
    return undefined;
  }

  async incrementError(instanceId: string, error: string) {
    const existing = await this.findByInstanceId(instanceId);
    if (existing) {
      return solanaStorage.upsertSyncStatus({
        ...existing,
        errorCount: existing.errorCount + 1,
        lastError: error,
      });
    }
    return undefined;
  }
}

// ============================================================================
// Alert DAO
// ============================================================================

export class SolanaAlertDao {
  async create(data: Omit<SolanaAlert, 'id' | 'createdAt' | 'updatedAt'>) {
    return solanaStorage.createAlert(data);
  }

  async findById(id: number) {
    return (solanaStorage as unknown as { alerts: Map<number, SolanaAlert> }).alerts?.get(id);
  }

  async findUnresolved(severity?: string) {
    return solanaStorage.getUnresolvedAlerts(severity);
  }

  async findByInstance(instanceId: string, limit: number = 100) {
    const alerts = Array.from(
      (solanaStorage as unknown as { alerts: Map<number, SolanaAlert> }).alerts?.values() || [],
    )
      .filter((a) => a.instanceId === instanceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return alerts;
  }

  async resolve(id: number, resolvedBy: string) {
    return solanaStorage.resolveAlert(id, resolvedBy);
  }

  async getStats(timeRangeHours: number = 24) {
    return solanaStorage.getAlertStats(timeRangeHours);
  }
}

// ============================================================================
// Export Singletons
// ============================================================================

export const solanaPriceFeedDao = new SolanaPriceFeedDao();
export const solanaPriceHistoryDao = new SolanaPriceHistoryDao();
export const solanaOracleInstanceDao = new SolanaOracleInstanceDao();
export const solanaSyncStatusDao = new SolanaSyncStatusDao();
export const solanaAlertDao = new SolanaAlertDao();
