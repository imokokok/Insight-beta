/**
 * 领域事件 - Oracle 领域
 */

import { BaseDomainEvent } from '../base/Entity';

export type OracleStatus = 'active' | 'inactive' | 'error';
export type PriceFeedStatus = 'healthy' | 'stale' | 'error';
export type AssertionStatus = 'pending' | 'confirmed' | 'disputed' | 'resolved';
export type DisputeStatus = 'active' | 'resolved';

/**
 * Oracle 创建事件
 */
export class OracleCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly protocol: string,
    public readonly chain: string,
    public readonly name: string,
    public readonly address: string,
  ) {
    super(aggregateId, 'OracleCreated', {
      protocol,
      chain,
      name,
      address,
    });
  }
}

/**
 * Oracle 状态变更事件
 */
export class OracleStatusChangedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly oldStatus: OracleStatus,
    public readonly newStatus: OracleStatus,
    public readonly reason?: string,
  ) {
    super(aggregateId, 'OracleStatusChanged', {
      oldStatus,
      newStatus,
      reason,
    });
  }
}

/**
 * 价格更新事件
 */
export class PriceUpdatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly symbol: string,
    public readonly oldPrice: number,
    public readonly newPrice: number,
    public readonly confidence: number,
    public readonly source: string,
  ) {
    super(aggregateId, 'PriceUpdated', {
      symbol,
      oldPrice,
      newPrice,
      confidence,
      source,
      priceChange: oldPrice !== 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0,
    });
  }

  get priceChangePercentage(): number {
    return this.metadata.priceChange as number;
  }
}

/**
 * 价格偏离阈值事件
 */
export class PriceDeviationThresholdExceededEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly symbol: string,
    public readonly currentPrice: number,
    public readonly previousPrice: number,
    public readonly deviationPercentage: number,
    public readonly threshold: number,
  ) {
    super(aggregateId, 'PriceDeviationThresholdExceeded', {
      symbol,
      currentPrice,
      previousPrice,
      deviationPercentage,
      threshold,
    });
  }
}

/**
 * 价格源失效事件
 */
export class PriceFeedStaleEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly symbol: string,
    public readonly lastUpdateTime: Date,
    public readonly stalenessSeconds: number,
    public readonly maxStaleness: number,
  ) {
    super(aggregateId, 'PriceFeedStale', {
      symbol,
      lastUpdateTime,
      stalenessSeconds,
      maxStaleness,
    });
  }
}

/**
 * 价格源错误事件
 */
export class PriceFeedErrorEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly symbol: string,
    public readonly error: string,
    public readonly source: string,
  ) {
    super(aggregateId, 'PriceFeedError', {
      symbol,
      error,
      source,
    });
  }
}

/**
 * 断言创建事件
 */
export class AssertionCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly assertionId: string,
    public readonly claim: string,
    public readonly bond: bigint,
    public readonly currency: string,
    public readonly expirationTime: Date,
    public readonly proposer: string,
  ) {
    super(aggregateId, 'AssertionCreated', {
      assertionId,
      claim,
      bond: bond.toString(),
      currency,
      expirationTime,
      proposer,
    });
  }
}

/**
 * 断言确认事件
 */
export class AssertionConfirmedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly assertionId: string,
    public readonly settlementResolution: boolean,
  ) {
    super(aggregateId, 'AssertionConfirmed', {
      assertionId,
      settlementResolution,
    });
  }
}

/**
 * 断言争议事件
 */
export class AssertionDisputedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly assertionId: string,
    public readonly disputer: string,
    public readonly disputeBond: bigint,
  ) {
    super(aggregateId, 'AssertionDisputed', {
      assertionId,
      disputer,
      disputeBond: disputeBond.toString(),
    });
  }
}

/**
 * 争议解决事件
 */
export class DisputeResolvedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly assertionId: string,
    public readonly disputeId: string,
    public readonly outcome: boolean,
    public readonly winner: string,
  ) {
    super(aggregateId, 'DisputeResolved', {
      assertionId,
      disputeId,
      outcome,
      winner,
    });
  }
}

/**
 * 健康检查失败事件
 */
export class HealthCheckFailedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly checkType: string,
    public readonly details: string,
    public readonly score: number,
  ) {
    super(aggregateId, 'HealthCheckFailed', {
      checkType,
      details,
      score,
    });
  }
}

/**
 * 同步开始事件
 */
export class SyncStartedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly protocol: string,
    public readonly chain: string,
  ) {
    super(aggregateId, 'SyncStarted', {
      protocol,
      chain,
    });
  }
}

/**
 * 同步完成事件
 */
export class SyncCompletedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly protocol: string,
    public readonly chain: string,
    public readonly feedsUpdated: number,
    public readonly durationMs: number,
  ) {
    super(aggregateId, 'SyncCompleted', {
      protocol,
      chain,
      feedsUpdated,
      durationMs,
    });
  }
}

/**
 * 同步失败事件
 */
export class SyncFailedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly protocol: string,
    public readonly chain: string,
    public readonly error: string,
  ) {
    super(aggregateId, 'SyncFailed', {
      protocol,
      chain,
      error,
    });
  }
}

/**
 * 事件类型映射
 */
export const OracleEventTypes = {
  ORACLE_CREATED: 'OracleCreated',
  ORACLE_STATUS_CHANGED: 'OracleStatusChanged',
  PRICE_UPDATED: 'PriceUpdated',
  PRICE_DEVIATION_EXCEEDED: 'PriceDeviationThresholdExceeded',
  PRICE_FEED_STALE: 'PriceFeedStale',
  PRICE_FEED_ERROR: 'PriceFeedError',
  ASSERTION_CREATED: 'AssertionCreated',
  ASSERTION_CONFIRMED: 'AssertionConfirmed',
  ASSERTION_DISPUTED: 'AssertionDisputed',
  DISPUTE_RESOLVED: 'DisputeResolved',
  HEALTH_CHECK_FAILED: 'HealthCheckFailed',
  SYNC_STARTED: 'SyncStarted',
  SYNC_COMPLETED: 'SyncCompleted',
  SYNC_FAILED: 'SyncFailed',
} as const;

export type OracleDomainEvent =
  | OracleCreatedEvent
  | OracleStatusChangedEvent
  | PriceUpdatedEvent
  | PriceDeviationThresholdExceededEvent
  | PriceFeedStaleEvent
  | PriceFeedErrorEvent
  | AssertionCreatedEvent
  | AssertionConfirmedEvent
  | AssertionDisputedEvent
  | DisputeResolvedEvent
  | HealthCheckFailedEvent
  | SyncStartedEvent
  | SyncCompletedEvent
  | SyncFailedEvent;
