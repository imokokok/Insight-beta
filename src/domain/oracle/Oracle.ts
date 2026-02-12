/**
 * Oracle 领域模型
 */

export interface Oracle {
  id: string;
  protocol: string;
  name: string;
  chain: string;
  address: string;
  status: 'active' | 'inactive' | 'error';
  lastUpdate: Date;
  metadata?: Record<string, unknown>;
}

export interface Price {
  id: string;
  oracleId: string;
  symbol: string;
  value: number;
  timestamp: Date;
  confidence?: number;
  deviation?: number;
  source: string;
}

export interface PriceFeed {
  id: string;
  oracleId: string;
  symbol: string;
  decimals: number;
  heartbeat: number;
  deviationThreshold: number;
  lastPrice?: Price;
  status: 'healthy' | 'stale' | 'error';
}

export interface Assertion {
  id: string;
  oracleId: string;
  claim: string;
  bond: string;
  currency: string;
  expirationTime: Date;
  status: 'pending' | 'confirmed' | 'disputed' | 'resolved';
  resolution?: boolean;
  disputer?: string;
  proposer: string;
  createdAt: Date;
}

export interface Dispute {
  id: string;
  assertionId: string;
  disputer: string;
  bond: string;
  currency: string;
  status: 'active' | 'resolved';
  outcome?: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export class OracleAggregate {
  private _oracle: Oracle;
  private priceFeeds: Map<string, PriceFeed>;
  private assertions: Map<string, Assertion>;

  constructor(oracle: Oracle) {
    this._oracle = oracle;
    this.priceFeeds = new Map();
    this.assertions = new Map();
  }

  get oracle(): Oracle {
    return this._oracle;
  }

  addPriceFeed(feed: PriceFeed): void {
    this.priceFeeds.set(feed.id, feed);
  }

  updatePrice(feedId: string, price: Price): void {
    const feed = this.priceFeeds.get(feedId);
    if (feed) {
      feed.lastPrice = price;
    }
  }

  createAssertion(assertion: Assertion): void {
    this.assertions.set(assertion.id, assertion);
  }

  getHealthStatus(): 'healthy' | 'degraded' | 'error' {
    const feeds = Array.from(this.priceFeeds.values());
    const errorCount = feeds.filter(f => f.status === 'error').length;
    const staleCount = feeds.filter(f => f.status === 'stale').length;

    if (errorCount > feeds.length * 0.5) return 'error';
    if (staleCount > feeds.length * 0.3) return 'degraded';
    return 'healthy';
  }
}
