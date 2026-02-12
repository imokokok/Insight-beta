/**
 * 值对象 - Oracle 领域
 */

import { ValueObject } from '../base/Entity';

/**
 * 区块链地址值对象
 */
export class Address extends ValueObject<{ value: string; chain: string }> {
  private constructor(props: { value: string; chain: string }) {
    super(props);
  }

  static create(value: string, chain: string): Address {
    if (!value || !value.startsWith('0x')) {
      throw new Error('Invalid address format');
    }
    return new Address({ value: value.toLowerCase(), chain });
  }

  get value(): string {
    return this.props.value;
  }

  get chain(): string {
    return this.props.chain;
  }

  get isZeroAddress(): boolean {
    return this.props.value === '0x0000000000000000000000000000000000000000';
  }

  equals(other: Address): boolean {
    return this.props.value === other.props.value && this.props.chain === other.props.chain;
  }

  toString(): string {
    return this.props.value;
  }
}

/**
 * 价格值对象
 */
export class PriceVO extends ValueObject<{
  value: number;
  decimals: number;
  timestamp: Date;
  confidence: number;
}> {
  private constructor(props: {
    value: number;
    decimals: number;
    timestamp: Date;
    confidence: number;
  }) {
    super(props);
  }

  static create(value: number, decimals: number = 18, confidence: number = 1.0): PriceVO {
    if (value < 0) {
      throw new Error('Price cannot be negative');
    }
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
    return new PriceVO({ value, decimals, timestamp: new Date(), confidence });
  }

  get value(): number {
    return this.props.value;
  }

  get decimals(): number {
    return this.props.decimals;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get confidence(): number {
    return this.props.confidence;
  }

  isStale(maxAgeSeconds: number = 300): boolean {
    const now = new Date();
    const age = (now.getTime() - this.props.timestamp.getTime()) / 1000;
    return age > maxAgeSeconds;
  }

  get formattedValue(): string {
    return this.props.value.toFixed(this.props.decimals);
  }

  equals(other: PriceVO): boolean {
    return (
      this.props.value === other.props.value &&
      this.props.decimals === other.props.decimals &&
      this.props.timestamp.getTime() === other.props.timestamp.getTime()
    );
  }
}

/**
 * 价格范围值对象
 */
export class PriceRangeVO extends ValueObject<{
  min: number;
  max: number;
  decimals: number;
}> {
  private constructor(props: { min: number; max: number; decimals: number }) {
    super(props);
  }

  static create(min: number, max: number, decimals: number = 18): PriceRangeVO {
    if (min < 0 || max < 0) {
      throw new Error('Price range cannot be negative');
    }
    if (min > max) {
      throw new Error('Min price cannot be greater than max price');
    }
    return new PriceRangeVO({ min, max, decimals });
  }

  get min(): number {
    return this.props.min;
  }

  get max(): number {
    return this.props.max;
  }

  get mid(): number {
    return (this.props.min + this.props.max) / 2;
  }

  get spread(): number {
    return this.props.max - this.props.min;
  }

  get spreadPercentage(): number {
    if (this.mid === 0) return 0;
    return (this.spread / this.mid) * 100;
  }

  contains(price: number): boolean {
    return price >= this.props.min && price <= this.props.max;
  }
}

/**
 * 预言机配置值对象
 */
export class OracleConfigVO extends ValueObject<{
  protocol: string;
  chain: string;
  address: string;
  heartbeat: number;
  deviationThreshold: number;
}> {
  private constructor(props: {
    protocol: string;
    chain: string;
    address: string;
    heartbeat: number;
    deviationThreshold: number;
  }) {
    super(props);
  }

  static create(
    protocol: string,
    chain: string,
    address: string,
    heartbeat: number = 300,
    deviationThreshold: number = 0.5,
  ): OracleConfigVO {
    if (!protocol || !chain || !address) {
      throw new Error('Protocol, chain and address are required');
    }
    if (heartbeat < 0 || deviationThreshold < 0) {
      throw new Error('Heartbeat and deviation threshold must be positive');
    }
    return new OracleConfigVO({ protocol, chain, address, heartbeat, deviationThreshold });
  }

  get protocol(): string {
    return this.props.protocol;
  }

  get chain(): string {
    return this.props.chain;
  }

  get address(): string {
    return this.props.address;
  }

  get heartbeat(): number {
    return this.props.heartbeat;
  }

  get deviationThreshold(): number {
    return this.props.deviationThreshold;
  }

  isHealthy(lastUpdateTime: Date): boolean {
    const now = new Date();
    const age = (now.getTime() - lastUpdateTime.getTime()) / 1000;
    return age <= this.props.heartbeat;
  }
}

/**
 * 健康状态值对象
 */
export class HealthStatusVO extends ValueObject<{
  status: 'healthy' | 'degraded' | 'error';
  score: number;
  issues: string[];
  lastCheck: Date;
}> {
  private constructor(props: {
    status: 'healthy' | 'degraded' | 'error';
    score: number;
    issues: string[];
    lastCheck: Date;
  }) {
    super(props);
  }

  static create(status: 'healthy' | 'degraded' | 'error', issues: string[] = []): HealthStatusVO {
    const score = status === 'healthy' ? 100 : status === 'degraded' ? 50 : 0;
    return new HealthStatusVO({ status, score, issues, lastCheck: new Date() });
  }

  static fromScore(score: number, issues: string[] = []): HealthStatusVO {
    let status: 'healthy' | 'degraded' | 'error';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 40) {
      status = 'degraded';
    } else {
      status = 'error';
    }
    return new HealthStatusVO({ status, score, issues, lastCheck: new Date() });
  }

  get status(): 'healthy' | 'degraded' | 'error' {
    return this.props.status;
  }

  get score(): number {
    return this.props.score;
  }

  get issues(): string[] {
    return [...this.props.issues];
  }

  get lastCheck(): Date {
    return this.props.lastCheck;
  }

  get isHealthy(): boolean {
    return this.props.status === 'healthy';
  }

  get hasIssues(): boolean {
    return this.props.issues.length > 0;
  }

  equals(other: HealthStatusVO): boolean {
    return this.props.status === other.props.status && this.props.score === other.props.score;
  }
}

/**
 * 时间周期值对象
 */
export class TimeRangeVO extends ValueObject<{
  start: Date;
  end: Date;
}> {
  private constructor(props: { start: Date; end: Date }) {
    super(props);
  }

  static create(start: Date, end: Date): TimeRangeVO {
    if (start > end) {
      throw new Error('Start date must be before end date');
    }
    return new TimeRangeVO({ start, end });
  }

  static lastHours(hours: number): TimeRangeVO {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    return new TimeRangeVO({ start, end });
  }

  static lastDays(days: number): TimeRangeVO {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return new TimeRangeVO({ start, end });
  }

  get start(): Date {
    return this.props.start;
  }

  get end(): Date {
    return this.props.end;
  }

  get durationSeconds(): number {
    return (this.props.end.getTime() - this.props.start.getTime()) / 1000;
  }

  get durationHours(): number {
    return this.durationSeconds / 3600;
  }

  get durationDays(): number {
    return this.durationSeconds / 86400;
  }

  contains(date: Date): boolean {
    return date >= this.props.start && date <= this.props.end;
  }

  overlaps(other: TimeRangeVO): boolean {
    return this.props.start <= other.props.end && this.props.end >= other.props.start;
  }
}

/**
 * 货币值对象
 */
export class MoneyVO extends ValueObject<{
  amount: bigint;
  currency: string;
  decimals: number;
}> {
  private constructor(props: { amount: bigint; currency: string; decimals: number }) {
    super(props);
  }

  static create(amount: bigint, currency: string, decimals: number = 18): MoneyVO {
    if (amount < 0n) {
      throw new Error('Amount cannot be negative');
    }
    return new MoneyVO({ amount, currency, decimals });
  }

  static fromNumber(amount: number, currency: string, decimals: number = 18): MoneyVO {
    const multiplier = 10n ** BigInt(decimals);
    const scaledAmount = BigInt(Math.floor(amount * Number(multiplier)));
    return new MoneyVO({ amount: scaledAmount, currency, decimals });
  }

  get amount(): bigint {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get decimals(): number {
    return this.props.decimals;
  }

  get formattedAmount(): string {
    const divisor = 10n ** BigInt(this.props.decimals);
    const whole = this.props.amount / divisor;
    const fractional = this.props.amount % divisor;
    return `${whole}.${fractional.toString().padStart(this.props.decimals, '0')}`;
  }

  add(other: MoneyVO): MoneyVO {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add money of different currencies');
    }
    return new MoneyVO({
      amount: this.props.amount + other.props.amount,
      currency: this.props.currency,
      decimals: this.props.decimals,
    });
  }

  multiply(factor: number): MoneyVO {
    const scaledAmount = (this.props.amount * BigInt(Math.floor(factor * 10000))) / 10000n;
    return new MoneyVO({
      amount: scaledAmount,
      currency: this.props.currency,
      decimals: this.props.decimals,
    });
  }
}

export {
  PriceVO as Price,
  PriceRangeVO as PriceRange,
  OracleConfigVO as OracleConfig,
  HealthStatusVO as HealthStatus,
  TimeRangeVO as TimeRange,
  MoneyVO as Money,
};
