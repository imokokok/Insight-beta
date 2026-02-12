/**
 * Oracle 聚合根实现
 */

import {
  OracleCreatedEvent,
  OracleStatusChangedEvent,
  PriceUpdatedEvent,
  PriceDeviationThresholdExceededEvent,
  type OracleDomainEvent,
  type OracleStatus,
  type PriceFeedStatus,
} from './Events';
import { Address, OracleConfig, HealthStatus, PriceRange } from './ValueObjects';
import { AggregateRoot, Entity } from '../base/Entity';

import type { Price } from './ValueObjects';
import type { DomainEvent } from '../base/Entity';

export interface OracleProps {
  id: string;
  protocol: string;
  name: string;
  chain: string;
  address: string;
  status: OracleStatus;
  config?: {
    heartbeat: number;
    deviationThreshold: number;
  };
  metadata?: Record<string, unknown>;
}

export interface PriceFeedProps {
  id: string;
  oracleId: string;
  symbol: string;
  decimals: number;
  heartbeat: number;
  deviationThreshold: number;
}

export interface OracleEntityProps extends OracleProps {
  priceFeeds?: PriceFeedProps[];
}

export class OracleEntity extends AggregateRoot<string> {
  private _protocol: string;
  private _name: string;
  private _address: Address;
  private _status: OracleStatus;
  private _config: OracleConfig;
  private _metadata: Record<string, unknown>;
  private _priceFeeds: Map<string, PriceFeedEntity>;

  constructor(props: OracleProps) {
    super(props.id);
    this._protocol = props.protocol;
    this._name = props.name;
    this._address = Address.create(props.address, props.chain);
    this._status = props.status;
    this._config = OracleConfig.create(
      props.protocol,
      props.chain,
      props.address,
      props.config?.heartbeat ?? 300,
      props.config?.deviationThreshold ?? 0.5,
    );
    this._metadata = props.metadata || {};
    this._priceFeeds = new Map();
  }

  static create(props: OracleProps): OracleEntity {
    const oracle = new OracleEntity(props);
    oracle.addDomainEvent(
      new OracleCreatedEvent(props.id, props.protocol, props.chain, props.name, props.address),
    );
    return oracle;
  }

  get protocol(): string {
    return this._protocol;
  }

  get name(): string {
    return this._name;
  }

  get address(): Address {
    return this._address;
  }

  get status(): OracleStatus {
    return this._status;
  }

  get config(): OracleConfig {
    return this._config;
  }

  get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  get priceFeeds(): PriceFeedEntity[] {
    return Array.from(this._priceFeeds.values());
  }

  addPriceFeed(feed: PriceFeedEntity): void {
    this._priceFeeds.set(feed.id, feed);
  }

  getPriceFeed(symbol: string): PriceFeedEntity | undefined {
    return Array.from(this._priceFeeds.values()).find((f) => f.symbol === symbol);
  }

  removePriceFeed(symbol: string): boolean {
    return this._priceFeeds.delete(symbol);
  }

  changeStatus(newStatus: OracleStatus, reason?: string): void {
    if (this._status === newStatus) return;

    const oldStatus = this._status;
    this._status = newStatus;
    this.touch();

    this.addDomainEvent(new OracleStatusChangedEvent(this._id, oldStatus, newStatus, reason));
  }

  updatePrice(symbol: string, newPrice: Price, source: string): void {
    const feed = this.getPriceFeed(symbol);
    if (!feed) {
      throw new Error(`Price feed not found for symbol: ${symbol}`);
    }

    const oldPrice = feed.price;
    feed.updatePrice(newPrice);

    if (oldPrice) {
      this.addDomainEvent(
        new PriceUpdatedEvent(
          this._id,
          symbol,
          oldPrice.value,
          newPrice.value,
          newPrice.confidence,
          source,
        ),
      );

      const deviationPercentage = Math.abs(
        ((newPrice.value - oldPrice.value) / oldPrice.value) * 100,
      );

      if (deviationPercentage > this._config.deviationThreshold) {
        this.addDomainEvent(
          new PriceDeviationThresholdExceededEvent(
            this._id,
            symbol,
            newPrice.value,
            oldPrice.value,
            deviationPercentage,
            this._config.deviationThreshold,
          ),
        );
      }
    }
  }

  checkPriceFeedHealth(symbol: string): HealthStatus {
    const feed = this.getPriceFeed(symbol);
    if (!feed) {
      return HealthStatus.create('error', [`Price feed not found for symbol: ${symbol}`]);
    }

    return feed.checkHealth();
  }

  getOverallHealth(): HealthStatus {
    const feedStatuses = this.priceFeeds.map((feed) => feed.checkHealth());
    const issues: string[] = [];
    let totalScore = 0;

    for (const status of feedStatuses) {
      totalScore += status.score;
      issues.push(...status.issues);
    }

    const avgScore = feedStatuses.length > 0 ? totalScore / feedStatuses.length : 0;

    if (avgScore < 50) {
      return HealthStatus.fromScore(avgScore, issues);
    } else if (avgScore < 80) {
      return HealthStatus.fromScore(avgScore, issues);
    }

    return HealthStatus.fromScore(avgScore, issues);
  }

  apply(event: DomainEvent): void {
    const domainEvent = event as OracleDomainEvent;

    switch (domainEvent.eventType) {
      case 'OracleStatusChanged':
        this._status = (domainEvent as OracleStatusChangedEvent).newStatus;
        break;
      case 'PriceUpdated':
        break;
      default:
        break;
    }
  }

  toPlainObject(): OracleEntityProps {
    return {
      id: this._id,
      protocol: this._protocol,
      name: this._name,
      chain: this._address.chain,
      address: this._address.value,
      status: this._status,
      config: {
        heartbeat: this._config.heartbeat,
        deviationThreshold: this._config.deviationThreshold,
      },
      metadata: this._metadata,
      priceFeeds: this.priceFeeds.map((f) => f.toPlainObject()),
    };
  }
}

export class PriceFeedEntity extends Entity<string> {
  private _oracleId: string;
  private _symbol: string;
  private _decimals: number;
  private _heartbeat: number;
  private _deviationThreshold: number;
  private _price: Price | null;
  private _status: PriceFeedStatus;
  private _lastUpdate: Date;
  private _priceHistory: Array<{ price: number; timestamp: Date }>;

  constructor(props: PriceFeedProps) {
    super(props.id);
    this._oracleId = props.oracleId;
    this._symbol = props.symbol;
    this._decimals = props.decimals;
    this._heartbeat = props.heartbeat;
    this._deviationThreshold = props.deviationThreshold;
    this._price = null;
    this._status = 'stale';
    this._lastUpdate = new Date(0);
    this._priceHistory = [];
  }

  get oracleId(): string {
    return this._oracleId;
  }

  get symbol(): string {
    return this._symbol;
  }

  get decimals(): number {
    return this._decimals;
  }

  get heartbeat(): number {
    return this._heartbeat;
  }

  get deviationThreshold(): number {
    return this._deviationThreshold;
  }

  get price(): Price | null {
    return this._price;
  }

  get status(): PriceFeedStatus {
    return this._status;
  }

  get lastUpdate(): Date {
    return this._lastUpdate;
  }

  get priceHistory(): Array<{ price: number; timestamp: Date }> {
    return [...this._priceHistory];
  }

  updatePrice(newPrice: Price): void {
    this._price = newPrice;
    this._lastUpdate = newPrice.timestamp;
    this._status = 'healthy';

    this._priceHistory.push({
      price: newPrice.value,
      timestamp: newPrice.timestamp,
    });

    if (this._priceHistory.length > 100) {
      this._priceHistory = this._priceHistory.slice(-100);
    }

    this.touch();
  }

  markStale(_stalenessSeconds: number): void {
    if (this._status !== 'error') {
      this._status = 'stale';
    }
    this.touch();
  }

  markError(_error: string): void {
    this._status = 'error';
    this.touch();
  }

  checkHealth(): HealthStatus {
    const issues: string[] = [];

    if (!this._price) {
      issues.push('No price data available');
      return HealthStatus.create('error', issues);
    }

    const stalenessSeconds = Math.floor((Date.now() - this._lastUpdate.getTime()) / 1000);

    if (stalenessSeconds > this._heartbeat) {
      issues.push(`Data is stale: ${stalenessSeconds}s old (max: ${this._heartbeat}s)`);
    }

    if (this._price.value === 0) {
      issues.push('Price is zero');
    }

    if (this._price.confidence < 0.5) {
      issues.push(`Low confidence: ${(this._price.confidence * 100).toFixed(0)}%`);
    }

    let status: 'healthy' | 'degraded' | 'error';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length === 1 && issues[0]?.includes('stale')) {
      status = 'degraded';
    } else {
      status = 'error';
    }

    return HealthStatus.create(status, issues);
  }

  getPriceRange(hours: number = 24): PriceRange | null {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const relevantHistory = this._priceHistory.filter((p) => p.timestamp >= cutoff);

    if (relevantHistory.length === 0) {
      return null;
    }

    const prices = relevantHistory.map((p) => p.price);
    return PriceRange.create(Math.min(...prices), Math.max(...prices), this._decimals);
  }

  calculateDeviation(previousPrice: number): number {
    if (!this._price || previousPrice === 0) {
      return 0;
    }
    return Math.abs((this._price.value - previousPrice) / previousPrice) * 100;
  }

  toPlainObject(): PriceFeedProps {
    return {
      id: this._id,
      oracleId: this._oracleId,
      symbol: this._symbol,
      decimals: this._decimals,
      heartbeat: this._heartbeat,
      deviationThreshold: this._deviationThreshold,
    };
  }
}

export class OracleAggregateFactory {
  createOracle(props: OracleProps): OracleEntity {
    return OracleEntity.create(props);
  }

  createPriceFeed(props: PriceFeedProps): PriceFeedEntity {
    return new PriceFeedEntity(props);
  }
}
