/**
 * Solana Database Schema (Simplified)
 *
 * Solana 预言机数据模型（简化版，使用内存存储）
 */

// ============================================================================
// Types
// ============================================================================

export interface SolanaPriceFeed {
  id: number;
  symbol: string;
  protocol: 'switchboard' | 'pyth';
  chain: 'solana' | 'solanaDevnet';
  feedAddress: string;
  decimals: number;
  price: string;
  confidence: string | null;
  slot: number | null;
  isActive: boolean;
  isStale: boolean;
  lastUpdate: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolanaPriceHistory {
  id: number;
  feedId: number;
  price: string;
  confidence: string | null;
  slot: number;
  blockTime?: Date;
  blockHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SolanaOracleInstance {
  id: number;
  instanceId: string;
  protocol: 'switchboard' | 'pyth';
  chain: 'solana' | 'solanaDevnet';
  address: string;
  feedAddress: string;
  symbol: string;
  decimals: number;
  updateInterval: number;
  enabled: boolean;
  status: 'active' | 'stopped' | 'error';
  lastSyncAt?: Date;
  lastProcessedSlot?: number;
  lagSlots?: number;
  errorCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolanaSyncStatus {
  id: number;
  instanceId: string;
  chain: 'solana' | 'solanaDevnet';
  status: 'active' | 'stopped' | 'error';
  lastSyncAt?: Date;
  lastProcessedSlot?: number;
  lagSlots?: number;
  errorCount: number;
  lastError?: string;
  updatedAt: Date;
}

export interface SolanaAlert {
  id: number;
  instanceId: string;
  symbol: string;
  alertType: 'price_deviation' | 'stale_price' | 'sync_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: Record<string, unknown>;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

class SolanaMemoryStorage {
  private priceFeeds: Map<number, SolanaPriceFeed> = new Map();
  private priceHistory: Map<number, SolanaPriceHistory[]> = new Map();
  private instances: Map<number, SolanaOracleInstance> = new Map();
  private syncStatus: Map<number, SolanaSyncStatus> = new Map();
  private alerts: Map<number, SolanaAlert> = new Map();

  private nextId = {
    priceFeed: 1,
    priceHistory: 1,
    instance: 1,
    syncStatus: 1,
    alert: 1,
  };

  // Price Feeds
  createPriceFeed(data: Omit<SolanaPriceFeed, 'id' | 'createdAt' | 'updatedAt'>): SolanaPriceFeed {
    const id = this.nextId.priceFeed++;
    const now = new Date();
    const feed: SolanaPriceFeed = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.priceFeeds.set(id, feed);
    return feed;
  }

  getPriceFeed(id: number): SolanaPriceFeed | undefined {
    return this.priceFeeds.get(id);
  }

  getPriceFeedBySymbol(
    symbol: string,
    protocol: string,
    chain: string,
  ): SolanaPriceFeed | undefined {
    return Array.from(this.priceFeeds.values()).find(
      (f) => f.symbol === symbol && f.protocol === protocol && f.chain === chain,
    );
  }

  getAllActivePriceFeeds(chain?: string): SolanaPriceFeed[] {
    let feeds = Array.from(this.priceFeeds.values()).filter((f) => f.isActive);
    if (chain) {
      feeds = feeds.filter((f) => f.chain === chain);
    }
    return feeds.sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime());
  }

  updatePriceFeed(id: number, data: Partial<SolanaPriceFeed>): SolanaPriceFeed | undefined {
    const feed = this.priceFeeds.get(id);
    if (!feed) return undefined;

    const updated = { ...feed, ...data, updatedAt: new Date() };
    this.priceFeeds.set(id, updated);
    return updated;
  }

  // Price History
  addPriceHistory(
    feedId: number,
    data: Omit<SolanaPriceHistory, 'id' | 'createdAt'>,
  ): SolanaPriceHistory {
    const id = this.nextId.priceHistory++;
    const entry: SolanaPriceHistory = {
      ...data,
      id,
      createdAt: new Date(),
    };

    if (!this.priceHistory.has(feedId)) {
      this.priceHistory.set(feedId, []);
    }
    this.priceHistory.get(feedId)!.push(entry);

    // Keep only last 1000 entries per feed
    const history = this.priceHistory.get(feedId)!;
    if (history.length > 1000) {
      this.priceHistory.set(feedId, history.slice(-1000));
    }

    return entry;
  }

  getPriceHistory(feedId: number, limit = 100): SolanaPriceHistory[] {
    const history = this.priceHistory.get(feedId) || [];
    return history.slice(-limit).reverse();
  }

  // Instances
  createInstance(
    data: Omit<SolanaOracleInstance, 'id' | 'createdAt' | 'updatedAt'>,
  ): SolanaOracleInstance {
    const id = this.nextId.instance++;
    const now = new Date();
    const instance: SolanaOracleInstance = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.instances.set(id, instance);
    return instance;
  }

  getInstanceById(instanceId: string): SolanaOracleInstance | undefined {
    return Array.from(this.instances.values()).find((i) => i.instanceId === instanceId);
  }

  getAllEnabledInstances(chain?: string): SolanaOracleInstance[] {
    let instances = Array.from(this.instances.values()).filter((i) => i.enabled);
    if (chain) {
      instances = instances.filter((i) => i.chain === chain);
    }
    return instances.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  updateInstance(
    id: number,
    data: Partial<SolanaOracleInstance>,
  ): SolanaOracleInstance | undefined {
    const instance = this.instances.get(id);
    if (!instance) return undefined;

    const updated = { ...instance, ...data, updatedAt: new Date() };
    this.instances.set(id, updated);
    return updated;
  }

  // Sync Status
  upsertSyncStatus(data: Omit<SolanaSyncStatus, 'id' | 'updatedAt'>): SolanaSyncStatus {
    const existing = Array.from(this.syncStatus.values()).find(
      (s) => s.instanceId === data.instanceId,
    );

    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.syncStatus.set(existing.id, updated);
      return updated;
    }

    const id = this.nextId.syncStatus++;
    const status: SolanaSyncStatus = {
      ...data,
      id,
      updatedAt: new Date(),
    };
    this.syncStatus.set(id, status);
    return status;
  }

  getSyncStatusByInstance(instanceId: string): SolanaSyncStatus | undefined {
    return Array.from(this.syncStatus.values()).find((s) => s.instanceId === instanceId);
  }

  // Alerts
  createAlert(data: Omit<SolanaAlert, 'id' | 'createdAt' | 'updatedAt'>): SolanaAlert {
    const id = this.nextId.alert++;
    const now = new Date();
    const alert: SolanaAlert = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  getUnresolvedAlerts(severity?: string): SolanaAlert[] {
    let alerts = Array.from(this.alerts.values()).filter((a) => !a.isResolved);
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  resolveAlert(id: number, resolvedBy: string): SolanaAlert | undefined {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const updated = {
      ...alert,
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      updatedAt: new Date(),
    };
    this.alerts.set(id, updated);
    return updated;
  }

  // Stats
  getAlertStats(timeRangeHours = 24): {
    total: number;
    unresolved: number;
    bySeverity: Record<string, number>;
  } {
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const alerts = Array.from(this.alerts.values()).filter((a) => a.createdAt >= since);

    const bySeverity: Record<string, number> = {};
    alerts.forEach((a) => {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    });

    return {
      total: alerts.length,
      unresolved: alerts.filter((a) => !a.isResolved).length,
      bySeverity,
    };
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const solanaStorage = new SolanaMemoryStorage();
