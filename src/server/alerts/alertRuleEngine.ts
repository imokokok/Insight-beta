/**
 * Alert Rule Engine
 *
 * 告警规则引擎
 * 支持灵活的告警规则配置和评估
 */

import { logger } from '@/lib/logger';
import { SafeExpressionEvaluator } from '@/lib/security/safeExpressionEvaluator';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { query } from '@/server/db';

import type { AlertSeverity } from './notifications';

// ============================================================================
// Types
// ============================================================================

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;

  // 触发条件
  conditions: AlertCondition[];
  conditionLogic: 'AND' | 'OR';

  // 通知配置
  notificationChannels: string[];
  throttleMinutes: number;

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export type AlertConditionType =
  | 'price_deviation'
  | 'price_threshold'
  | 'stale_data'
  | 'sync_failure'
  | 'protocol_down'
  | 'assertion_created' // UMA: 新断言创建
  | 'dispute_created' // UMA: 新争议创建
  | 'assertion_disputed' // UMA: 断言被争议
  | 'assertion_resolved' // UMA: 断言已解决
  | 'high_gas_price' // 高 Gas 价格
  | 'low_liquidity' // 低流动性
  | 'price_volatility' // 价格波动率
  | 'oracle_lag' // 预言机延迟
  | 'custom';

export interface AlertCondition {
  id: string;
  type: AlertConditionType;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  symbol?: string;
  params: Record<string, unknown>;
}

export interface PriceDeviationCondition extends AlertCondition {
  type: 'price_deviation';
  params: {
    threshold: number; // 百分比
    comparison: 'absolute' | 'relative';
    reference: 'median' | 'average' | 'specific_protocol';
    referenceProtocol?: OracleProtocol;
  };
}

export interface PriceThresholdCondition extends AlertCondition {
  type: 'price_threshold';
  params: {
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    value: number;
  };
}

export interface StaleDataCondition extends AlertCondition {
  type: 'stale_data';
  params: {
    maxAgeMinutes: number;
  };
}

export interface SyncFailureCondition extends AlertCondition {
  type: 'sync_failure';
  params: {
    consecutiveFailures: number;
  };
}

export interface ProtocolDownCondition extends AlertCondition {
  type: 'protocol_down';
  params: {
    maxUnhealthyDuration: number; // 分钟
  };
}

export interface AssertionCreatedCondition extends AlertCondition {
  type: 'assertion_created';
  params: {
    bondThreshold?: number;
    currency?: string;
  };
}

export interface DisputeCreatedCondition extends AlertCondition {
  type: 'dispute_created';
  params: {
    minBondAmount?: number;
  };
}

export interface AssertionDisputedCondition extends AlertCondition {
  type: 'assertion_disputed';
  params: {
    includeResolved?: boolean;
  };
}

export interface AssertionResolvedCondition extends AlertCondition {
  type: 'assertion_resolved';
  params: {
    settlementPayoutThreshold?: number;
  };
}

export interface HighGasPriceCondition extends AlertCondition {
  type: 'high_gas_price';
  params: {
    thresholdGwei: number;
    durationMinutes: number;
  };
}

export interface LowLiquidityCondition extends AlertCondition {
  type: 'low_liquidity';
  params: {
    minLiquidityUsd: number;
    checkInterval: number;
  };
}

export interface PriceVolatilityCondition extends AlertCondition {
  type: 'price_volatility';
  params: {
    windowMinutes: number;
    volatilityThreshold: number;
  };
}

export interface OracleLagCondition extends AlertCondition {
  type: 'oracle_lag';
  params: {
    maxBlockLag: number;
    maxTimeLagSeconds: number;
  };
}

export interface CustomCondition extends AlertCondition {
  type: 'custom';
  params: {
    expression: string;
    variables?: Record<string, unknown>;
  };
}

export interface AlertEvaluationContext {
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  symbol?: string;
  price?: number;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface AlertEvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  context: AlertEvaluationContext;
  evaluatedAt: Date;
}

// ============================================================================
// Custom Condition Registry
// ============================================================================

type CustomConditionEvaluator = (
  context: AlertEvaluationContext,
  condition: CustomCondition,
) => boolean;

const customConditionRegistry = new Map<string, CustomConditionEvaluator>();

/**
 * 注册自定义条件
 */
export function registerCustomCondition(name: string, evaluator: CustomConditionEvaluator): void {
  customConditionRegistry.set(name, evaluator);
  logger.info(`Custom condition registered: ${name}`);
}

/**
 * 获取自定义条件
 */
export function getCustomCondition(name: string): CustomConditionEvaluator | undefined {
  return customConditionRegistry.get(name);
}

/**
 * 注销自定义条件
 */
export function unregisterCustomCondition(name: string): void {
  customConditionRegistry.delete(name);
  logger.info(`Custom condition unregistered: ${name}`);
}

// ============================================================================
// Alert Rule Engine
// ============================================================================

export class AlertRuleEngine {
  private rules: Map<string, AlertRule> = new Map();
  private evaluator: SafeExpressionEvaluator;

  constructor() {
    this.evaluator = new SafeExpressionEvaluator();
  }

  /**
   * 从数据库加载规则
   */
  async loadRules(): Promise<void> {
    try {
      const result = await query<{
        id: string;
        name: string;
        description: string | null;
        enabled: boolean;
        priority: number;
        conditions: AlertCondition[];
        condition_logic: 'AND' | 'OR';
        notification_channels: string[];
        throttle_minutes: number;
        created_at: Date;
        updated_at: Date;
        created_by: string | null;
      }>(
        `
        SELECT 
          id, name, description, enabled, priority,
          conditions, condition_logic, notification_channels,
          throttle_minutes, created_at, updated_at, created_by
        FROM alert_rules
        WHERE enabled = true
        ORDER BY priority DESC
      `,
      );

      this.rules.clear();

      for (const row of result.rows) {
        const rule: AlertRule = {
          id: row.id,
          name: row.name,
          description: row.description ?? undefined,
          enabled: row.enabled,
          priority: row.priority,
          conditions: row.conditions,
          conditionLogic: row.condition_logic,
          notificationChannels: row.notification_channels,
          throttleMinutes: row.throttle_minutes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by ?? undefined,
        };

        this.rules.set(rule.id, rule);
      }

      logger.info(`Loaded ${this.rules.size} alert rules`);
    } catch (error) {
      logger.error('Failed to load alert rules', { error });
      throw error;
    }
  }

  /**
   * 评估单个规则
   */
  async evaluateRule(
    rule: AlertRule,
    context: AlertEvaluationContext,
  ): Promise<AlertEvaluationResult> {
    const conditionResults: boolean[] = [];

    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(condition, context);
      conditionResults.push(result);
    }

    let triggered: boolean;
    if (rule.conditionLogic === 'AND') {
      triggered = conditionResults.every((r) => r);
    } else {
      triggered = conditionResults.some((r) => r);
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered,
      severity: triggered ? 'high' : 'low',
      message: triggered
        ? `Alert rule "${rule.name}" triggered`
        : `Alert rule "${rule.name}" not triggered`,
      details: {
        conditions: rule.conditions,
        conditionResults,
        conditionLogic: rule.conditionLogic,
      },
      context,
      evaluatedAt: new Date(),
    };
  }

  /**
   * 评估单个条件
   */
  private async evaluateCondition(
    condition: AlertCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'price_deviation':
          return this.evaluatePriceDeviationCondition(
            condition as PriceDeviationCondition,
            context,
          );

        case 'price_threshold':
          return this.evaluatePriceThresholdCondition(
            condition as PriceThresholdCondition,
            context,
          );

        case 'stale_data':
          return this.evaluateStaleDataCondition(condition as StaleDataCondition, context);

        case 'sync_failure':
          return this.evaluateSyncFailureCondition(condition as SyncFailureCondition, context);

        case 'protocol_down':
          return this.evaluateProtocolDownCondition(condition as ProtocolDownCondition, context);

        case 'assertion_created':
          return this.evaluateAssertionCreatedCondition(
            condition as AssertionCreatedCondition,
            context,
          );

        case 'dispute_created':
          return this.evaluateDisputeCreatedCondition(
            condition as DisputeCreatedCondition,
            context,
          );

        case 'assertion_disputed':
          return this.evaluateAssertionDisputedCondition(
            condition as AssertionDisputedCondition,
            context,
          );

        case 'assertion_resolved':
          return this.evaluateAssertionResolvedCondition(
            condition as AssertionResolvedCondition,
            context,
          );

        case 'high_gas_price':
          return this.evaluateHighGasPriceCondition(condition as HighGasPriceCondition, context);

        case 'low_liquidity':
          return this.evaluateLowLiquidityCondition(condition as LowLiquidityCondition, context);

        case 'price_volatility':
          return this.evaluatePriceVolatilityCondition(
            condition as PriceVolatilityCondition,
            context,
          );

        case 'oracle_lag':
          return this.evaluateOracleLagCondition(condition as OracleLagCondition, context);

        case 'custom':
          return this.evaluateCustomCondition(condition as CustomCondition, context);

        default:
          logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error evaluating condition ${condition.id}`, { error });
      return false;
    }
  }

  /**
   * 评估价格偏离条件
   */
  private evaluatePriceDeviationCondition(
    condition: PriceDeviationCondition,
    context: AlertEvaluationContext,
  ): boolean {
    if (context.price === undefined) return false;

    const { threshold, comparison } = condition.params;
    const price = context.price;

    // 这里简化处理，实际应该与参考价格比较
    if (comparison === 'absolute') {
      return Math.abs(price) > threshold;
    } else {
      // 相对偏离，需要参考价格
      return false;
    }
  }

  /**
   * 评估价格阈值条件
   */
  private evaluatePriceThresholdCondition(
    condition: PriceThresholdCondition,
    context: AlertEvaluationContext,
  ): boolean {
    if (context.price === undefined) return false;

    const { operator, value } = condition.params;
    const price = context.price;

    switch (operator) {
      case 'gt':
        return price > value;
      case 'lt':
        return price < value;
      case 'gte':
        return price >= value;
      case 'lte':
        return price <= value;
      case 'eq':
        return price === value;
      default:
        return false;
    }
  }

  /**
   * 评估陈旧数据条件
   */
  private evaluateStaleDataCondition(
    condition: StaleDataCondition,
    context: AlertEvaluationContext,
  ): boolean {
    if (context.timestamp === undefined) return false;

    const { maxAgeMinutes } = condition.params;
    const age = Date.now() - context.timestamp.getTime();

    return age > maxAgeMinutes * 60 * 1000;
  }

  /**
   * 评估同步失败条件
   */
  private evaluateSyncFailureCondition(
    _condition: SyncFailureCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // 需要查询同步状态，这里简化处理
    return false;
  }

  /**
   * 评估协议下线条件
   */
  private evaluateProtocolDownCondition(
    _condition: ProtocolDownCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // 需要查询健康状态，这里简化处理
    return false;
  }

  /**
   * 评估断言创建条件
   */
  private evaluateAssertionCreatedCondition(
    _condition: AssertionCreatedCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // UMA 特定：检查新创建的断言
    return false;
  }

  /**
   * 评估争议创建条件
   */
  private evaluateDisputeCreatedCondition(
    _condition: DisputeCreatedCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // UMA 特定：检查新创建的争议
    return false;
  }

  /**
   * 评估断言被争议条件
   */
  private evaluateAssertionDisputedCondition(
    _condition: AssertionDisputedCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // UMA 特定：检查被争议的断言
    return false;
  }

  /**
   * 评估断言已解决条件
   */
  private evaluateAssertionResolvedCondition(
    _condition: AssertionResolvedCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // UMA 特定：检查已解决的断言
    return false;
  }

  /**
   * 评估高 Gas 价格条件
   */
  private evaluateHighGasPriceCondition(
    _condition: HighGasPriceCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // 需要查询 Gas 价格
    return false;
  }

  /**
   * 评估低流动性条件
   */
  private evaluateLowLiquidityCondition(
    _condition: LowLiquidityCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // 需要查询流动性数据
    return false;
  }

  /**
   * 评估价格波动率条件
   */
  private evaluatePriceVolatilityCondition(
    _condition: PriceVolatilityCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // 需要查询历史价格数据
    return false;
  }

  /**
   * 评估预言机延迟条件
   */
  private evaluateOracleLagCondition(
    _condition: OracleLagCondition,
    _context: AlertEvaluationContext,
  ): boolean {
    // 需要查询区块延迟
    return false;
  }

  /**
   * 评估自定义条件
   */
  private evaluateCustomCondition(
    condition: CustomCondition,
    context: AlertEvaluationContext,
  ): boolean {
    const { expression, variables = {} } = condition.params;

    try {
      // 构建变量上下文
      const evalContext = {
        ...variables,
        price: context.price,
        timestamp: context.timestamp?.getTime(),
        protocol: context.protocol,
        chain: context.chain,
        symbol: context.symbol,
        metadata: context.metadata,
      };

      return this.evaluator.evaluate(expression, evalContext);
    } catch (error) {
      logger.error(`Error evaluating custom expression: ${expression}`, { error });
      return false;
    }
  }

  /**
   * 评估所有规则
   */
  async evaluateAllRules(context: AlertEvaluationContext): Promise<AlertEvaluationResult[]> {
    const results: AlertEvaluationResult[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const result = await this.evaluateRule(rule, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取规则
   */
  getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  /**
   * 获取所有规则
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取规则数量
   */
  getRuleCount(): number {
    return this.rules.size;
  }
}
