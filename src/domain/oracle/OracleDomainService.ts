/**
 * Oracle 领域服务
 */

import { logger } from '@/shared/logger';

import { OracleEntity, PriceFeedEntity } from './OracleAggregate';
import { oracleRepository, priceFeedRepository } from './OracleRepository';
import { Price } from './ValueObjects';
import { InMemoryEventBus } from '../base/Entity';

import type { HealthStatus } from './ValueObjects';
import type { EventBus } from '../base/Entity';

export interface PriceUpdate {
  symbol: string;
  value: number;
  decimals?: number;
  confidence?: number;
  timestamp?: Date;
  source: string;
}

export interface HealthCheckResult {
  oracleId: string;
  oracleName: string;
  status: 'healthy' | 'degraded' | 'error';
  score: number;
  issues: string[];
  feeds: Map<string, HealthStatus>;
  lastCheck: Date;
}

export interface DeviationAlert {
  oracleId: string;
  symbol: string;
  previousPrice: number;
  currentPrice: number;
  deviationPercentage: number;
  threshold: number;
  timestamp: Date;
}

export class OracleDomainService {
  private eventBus: EventBus;
  private deviationAlerts: DeviationAlert[] = [];

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new InMemoryEventBus();
  }

  async registerOracle(
    protocol: string,
    chain: string,
    name: string,
    address: string,
    config?: {
      heartbeat?: number;
      deviationThreshold?: number;
    },
  ): Promise<OracleEntity> {
    const id = `oracle-${protocol}-${chain}-${address}`.toLowerCase();

    const existingOracle = await oracleRepository.findById(id);
    if (existingOracle) {
      logger.warn('Oracle already exists', { id, protocol, chain, address });
      return existingOracle;
    }

    const oracle = OracleEntity.create({
      id,
      protocol,
      chain,
      name,
      address,
      status: 'active',
      config: {
        heartbeat: config?.heartbeat ?? 300,
        deviationThreshold: config?.deviationThreshold ?? 0.5,
      },
    });

    await oracleRepository.save(oracle);

    const domainEvents = oracle.domainEvents;
    for (const event of domainEvents) {
      await this.eventBus.publish(event);
    }
    oracle.clearDomainEvents();

    logger.info('Oracle registered', { id, protocol, chain, name });
    return oracle;
  }

  async updatePrice(oracleId: string, priceUpdate: PriceUpdate): Promise<OracleEntity | null> {
    const oracle = await oracleRepository.findById(oracleId);
    if (!oracle) {
      logger.error('Oracle not found', { oracleId });
      return null;
    }

    const existingFeed = oracle.getPriceFeed(priceUpdate.symbol);
    if (!existingFeed) {
      const feed = new PriceFeedEntity({
        id: `${oracleId}-${priceUpdate.symbol}`.toLowerCase(),
        oracleId,
        symbol: priceUpdate.symbol,
        decimals: priceUpdate.decimals ?? 18,
        heartbeat: oracle.config.heartbeat,
        deviationThreshold: oracle.config.deviationThreshold,
      });
      oracle.addPriceFeed(feed);
    }

    const previousPrice = oracle.getPriceFeed(priceUpdate.symbol)?.price;
    const newPrice = Price.create(
      priceUpdate.value,
      priceUpdate.decimals ?? 18,
      priceUpdate.confidence ?? 1.0,
    );

    if (priceUpdate.timestamp) {
      (newPrice as unknown as { props: { timestamp: Date } }).props.timestamp =
        priceUpdate.timestamp;
    }

    oracle.updatePrice(priceUpdate.symbol, newPrice, priceUpdate.source);

    if (previousPrice) {
      const deviation = Math.abs(
        ((newPrice.value - previousPrice.value) / previousPrice.value) * 100,
      );

      if (deviation > oracle.config.deviationThreshold) {
        const alert: DeviationAlert = {
          oracleId,
          symbol: priceUpdate.symbol,
          previousPrice: previousPrice.value,
          currentPrice: newPrice.value,
          deviationPercentage: deviation,
          threshold: oracle.config.deviationThreshold,
          timestamp: new Date(),
        };
        this.deviationAlerts.push(alert);
        logger.warn('Price deviation detected', { alert });
      }
    }

    await oracleRepository.save(oracle);

    const domainEvents = oracle.domainEvents;
    for (const event of domainEvents) {
      await this.eventBus.publish(event);
    }
    oracle.clearDomainEvents();

    return oracle;
  }

  async getOracleHealth(oracleId: string): Promise<HealthCheckResult | null> {
    const oracle = await oracleRepository.findById(oracleId);
    if (!oracle) {
      return null;
    }

    const feeds = new Map<string, HealthStatus>();
    let totalScore = 0;

    for (const feed of oracle.priceFeeds) {
      const health = feed.checkHealth();
      feeds.set(feed.symbol, health);
      totalScore += health.score;
    }

    const avgScore = feeds.size > 0 ? totalScore / feeds.size : 0;

    let status: 'healthy' | 'degraded' | 'error';
    if (avgScore >= 80) {
      status = 'healthy';
    } else if (avgScore >= 40) {
      status = 'degraded';
    } else {
      status = 'error';
    }

    const issues: string[] = [];
    for (const [, health] of feeds) {
      issues.push(...health.issues);
    }

    return {
      oracleId: oracle.id,
      oracleName: oracle.name,
      status,
      score: avgScore,
      issues,
      feeds,
      lastCheck: new Date(),
    };
  }

  async getAllOraclesHealth(): Promise<HealthCheckResult[]> {
    const oracles = await oracleRepository.findAll();
    const results: HealthCheckResult[] = [];

    for (const oracle of oracles) {
      const health = await this.getOracleHealth(oracle.id);
      if (health) {
        results.push(health);
      }
    }

    return results;
  }

  async deactivateOracle(oracleId: string, reason?: string): Promise<boolean> {
    const oracle = await oracleRepository.findById(oracleId);
    if (!oracle) {
      return false;
    }

    oracle.changeStatus('inactive', reason);
    await oracleRepository.save(oracle);

    const domainEvents = oracle.domainEvents;
    for (const event of domainEvents) {
      await this.eventBus.publish(event);
    }
    oracle.clearDomainEvents();

    logger.info('Oracle deactivated', { oracleId, reason });
    return true;
  }

  async reactivateOracle(oracleId: string): Promise<boolean> {
    const oracle = await oracleRepository.findById(oracleId);
    if (!oracle) {
      return false;
    }

    oracle.changeStatus('active', 'Manually reactivated');
    await oracleRepository.save(oracle);

    const domainEvents = oracle.domainEvents;
    for (const event of domainEvents) {
      await this.eventBus.publish(event);
    }
    oracle.clearDomainEvents();

    logger.info('Oracle reactivated', { oracleId });
    return true;
  }

  getRecentDeviationAlerts(since?: Date): DeviationAlert[] {
    if (!since) {
      return [...this.deviationAlerts];
    }
    return this.deviationAlerts.filter((alert) => alert.timestamp >= since);
  }

  clearDeviationAlerts(): void {
    this.deviationAlerts = [];
  }

  async checkStaleFeeds(maxAgeSeconds: number = 300): Promise<PriceFeedEntity[]> {
    return priceFeedRepository.findStaleFeeds(maxAgeSeconds);
  }

  async getOraclesByProtocol(protocol: string): Promise<OracleEntity[]> {
    return oracleRepository.findByProtocol(protocol);
  }

  async getOraclesByChain(chain: string): Promise<OracleEntity[]> {
    return oracleRepository.findByChain(chain);
  }
}

export const oracleDomainService = new OracleDomainService();
