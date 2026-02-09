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

import { NotificationService, type AlertNotification, type AlertSeverity } from './notifications';

const notificationService = new NotificationService();

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
    minHealthyInstances: number;
  };
}

export interface CustomCondition extends AlertCondition {
  type: 'custom';
  params: {
    expression: string; // JavaScript 表达式或函数体
    variables?: Record<string, unknown>; // 额外变量
    description?: string; // 条件描述
  };
}

// UMA 特定条件类型
export interface AssertionCreatedCondition extends AlertCondition {
  type: 'assertion_created';
  params: {
    assertionType?: string; // 断言类型过滤
    minBond?: number; // 最小保证金
  };
}

export interface DisputeCreatedCondition extends AlertCondition {
  type: 'dispute_created';
  params: {
    minDisputeBond?: number; // 最小争议保证金
  };
}

export interface AssertionDisputedCondition extends AlertCondition {
  type: 'assertion_disputed';
  params: {
    assertionId?: string; // 特定断言ID
  };
}

export interface AssertionResolvedCondition extends AlertCondition {
  type: 'assertion_resolved';
  params: {
    assertionId?: string; // 特定断言ID
    resolution?: boolean; // 期望的解决结果
  };
}

export interface HighGasPriceCondition extends AlertCondition {
  type: 'high_gas_price';
  params: {
    thresholdGwei: number; // Gas价格阈值 (Gwei)
    chain?: SupportedChain; // 特定链
  };
}

export interface LowLiquidityCondition extends AlertCondition {
  type: 'low_liquidity';
  params: {
    minLiquidityUsd: number; // 最小流动性 (USD)
    symbol?: string; // 特定交易对
  };
}

export interface PriceVolatilityCondition extends AlertCondition {
  type: 'price_volatility';
  params: {
    windowMinutes: number; // 时间窗口 (分钟)
    volatilityThreshold: number; // 波动率阈值 (百分比)
    symbol?: string; // 特定交易对
  };
}

export interface OracleLagCondition extends AlertCondition {
  type: 'oracle_lag';
  params: {
    maxLagBlocks: number; // 最大延迟区块数
    protocol?: OracleProtocol; // 特定协议
  };
}

// 自定义条件函数类型
export type CustomConditionEvaluator = (
  context: AlertEvaluationContext,
  params: CustomCondition['params'],
) => boolean;

// 自定义条件注册表
const customConditionRegistry = new Map<string, CustomConditionEvaluator>();

/**
 * 注册自定义条件评估函数
 */
export function registerCustomCondition(name: string, evaluator: CustomConditionEvaluator): void {
  customConditionRegistry.set(name, evaluator);
  logger.info(`Registered custom condition: ${name}`);
}

/**
 * 获取已注册的自定义条件
 */
export function getCustomCondition(name: string): CustomConditionEvaluator | undefined {
  return customConditionRegistry.get(name);
}

/**
 * 注销自定义条件
 */
export function unregisterCustomCondition(name: string): void {
  customConditionRegistry.delete(name);
  logger.info(`Unregistered custom condition: ${name}`);
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
  triggered: boolean;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  context: AlertEvaluationContext;
}

// ============================================================================
// Rule Engine
// ============================================================================

export class AlertRuleEngine {
  private rules: Map<string, AlertRule> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();

  /**
   * 加载所有启用的告警规则
   */
  async loadRules(): Promise<void> {
    try {
      const result = await query(`
        SELECT * FROM alert_rules WHERE enabled = true ORDER BY priority DESC
      `);

      this.rules.clear();

      for (const row of result.rows) {
        const rule: AlertRule = {
          id: row.id,
          name: row.name,
          description: row.description,
          enabled: row.enabled,
          priority: row.priority,
          conditions: JSON.parse(row.conditions),
          conditionLogic: row.condition_logic,
          notificationChannels: row.notification_channels,
          throttleMinutes: row.throttle_minutes,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          createdBy: row.created_by,
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
  ): Promise<AlertEvaluationResult | null> {
    // 检查是否需要节流
    if (this.isThrottled(rule)) {
      return null;
    }

    // 评估所有条件
    const conditionResults = await Promise.all(
      rule.conditions.map((condition) => this.evaluateCondition(condition, context)),
    );

    // 根据逻辑组合条件结果
    let triggered: boolean;
    if (rule.conditionLogic === 'AND') {
      triggered = conditionResults.every((r) => r);
    } else {
      triggered = conditionResults.some((r) => r);
    }

    if (!triggered) {
      return null;
    }

    // 生成告警结果
    const severity = this.determineSeverity(rule, context);
    const message = this.generateAlertMessage(rule, context);

    // 更新最后告警时间
    this.lastAlertTime.set(rule.id, new Date());

    return {
      triggered: true,
      ruleId: rule.id,
      ruleName: rule.name,
      severity,
      message,
      details: {
        conditions: rule.conditions,
        conditionResults,
        context,
      },
      context,
    };
  }

  /**
   * 评估所有规则
   */
  async evaluateAllRules(context: AlertEvaluationContext): Promise<AlertEvaluationResult[]> {
    const results: AlertEvaluationResult[] = [];

    for (const rule of this.rules.values()) {
      // 检查规则是否适用于当前上下文
      if (!this.isRuleApplicable(rule, context)) {
        continue;
      }

      const result = await this.evaluateRule(rule, context);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 评估单个条件
   */
  private async evaluateCondition(
    condition: AlertCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    switch (condition.type) {
      case 'price_deviation':
        return this.evaluatePriceDeviation(condition as PriceDeviationCondition, context);
      case 'price_threshold':
        return this.evaluatePriceThreshold(condition as PriceThresholdCondition, context);
      case 'stale_data':
        return this.evaluateStaleData(condition as StaleDataCondition, context);
      case 'sync_failure':
        return this.evaluateSyncFailure(condition as SyncFailureCondition, context);
      case 'protocol_down':
        return this.evaluateProtocolDown(condition as ProtocolDownCondition, context);
      case 'assertion_created':
        return this.evaluateAssertionCreated(condition as AssertionCreatedCondition, context);
      case 'dispute_created':
        return this.evaluateDisputeCreated(condition as DisputeCreatedCondition, context);
      case 'assertion_disputed':
        return this.evaluateAssertionDisputed(condition as AssertionDisputedCondition, context);
      case 'assertion_resolved':
        return this.evaluateAssertionResolved(condition as AssertionResolvedCondition, context);
      case 'high_gas_price':
        return this.evaluateHighGasPrice(condition as HighGasPriceCondition, context);
      case 'low_liquidity':
        return this.evaluateLowLiquidity(condition as LowLiquidityCondition, context);
      case 'price_volatility':
        return this.evaluatePriceVolatility(condition as PriceVolatilityCondition, context);
      case 'oracle_lag':
        return this.evaluateOracleLag(condition as OracleLagCondition, context);
      case 'custom':
        return this.evaluateCustomCondition(condition, context);
      default:
        return false;
    }
  }

  /**
   * 评估价格偏差条件
   */
  private async evaluatePriceDeviation(
    condition: PriceDeviationCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    if (!context.symbol || !context.price) {
      return false;
    }

    try {
      // 获取参考价格
      let referencePrice: number;

      if (condition.params.reference === 'median') {
        const result = await query(
          `
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
          FROM unified_price_feeds
          WHERE symbol = $1 AND timestamp > NOW() - INTERVAL '5 minutes'
        `,
          [context.symbol],
        );
        referencePrice = parseFloat(result.rows[0]?.median_price || 0);
      } else if (condition.params.reference === 'average') {
        const result = await query(
          `
          SELECT AVG(price) as avg_price
          FROM unified_price_feeds
          WHERE symbol = $1 AND timestamp > NOW() - INTERVAL '5 minutes'
        `,
          [context.symbol],
        );
        referencePrice = parseFloat(result.rows[0]?.avg_price || 0);
      } else if (
        condition.params.reference === 'specific_protocol' &&
        condition.params.referenceProtocol
      ) {
        const result = await query(
          `
          SELECT price
          FROM unified_price_feeds
          WHERE symbol = $1 AND protocol = $2 AND timestamp > NOW() - INTERVAL '5 minutes'
          ORDER BY timestamp DESC
          LIMIT 1
        `,
          [context.symbol, condition.params.referenceProtocol],
        );
        referencePrice = parseFloat(result.rows[0]?.price || 0);
      } else {
        return false;
      }

      if (referencePrice === 0) {
        return false;
      }

      // 计算偏差
      const deviation = (Math.abs(context.price - referencePrice) / referencePrice) * 100;

      return deviation > condition.params.threshold;
    } catch (error) {
      logger.error('Failed to evaluate price deviation', { error, condition, context });
      return false;
    }
  }

  /**
   * 评估价格阈值条件
   */
  private evaluatePriceThreshold(
    condition: PriceThresholdCondition,
    context: AlertEvaluationContext,
  ): boolean {
    if (!context.price) {
      return false;
    }

    const { operator, value } = condition.params;

    switch (operator) {
      case 'gt':
        return context.price > value;
      case 'lt':
        return context.price < value;
      case 'gte':
        return context.price >= value;
      case 'lte':
        return context.price <= value;
      case 'eq':
        return context.price === value;
      default:
        return false;
    }
  }

  /**
   * 评估数据新鲜度条件
   */
  private evaluateStaleData(
    condition: StaleDataCondition,
    context: AlertEvaluationContext,
  ): boolean {
    if (!context.timestamp) {
      return false;
    }

    const age = Date.now() - context.timestamp.getTime();
    const maxAge = condition.params.maxAgeMinutes * 60 * 1000;

    return age > maxAge;
  }

  /**
   * 评估同步失败条件
   */
  private async evaluateSyncFailure(
    condition: SyncFailureCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    if (!context.protocol) {
      return false;
    }

    try {
      const result = await query(
        `
        SELECT COUNT(*) as failure_count
        FROM unified_sync_state
        WHERE protocol = $1 AND status = 'error'
        AND last_sync_at > NOW() - INTERVAL '1 hour'
      `,
        [context.protocol],
      );

      const failureCount = parseInt(result.rows[0]?.failure_count || 0);
      return failureCount >= condition.params.consecutiveFailures;
    } catch (error) {
      logger.error('Failed to evaluate sync failure', { error });
      return false;
    }
  }

  /**
   * 评估协议下线条件
   */
  private async evaluateProtocolDown(
    condition: ProtocolDownCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    if (!context.protocol) {
      return false;
    }

    try {
      const result = await query(
        `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'healthy') as healthy
        FROM unified_sync_state
        WHERE protocol = $1
      `,
        [context.protocol],
      );

      const total = parseInt(result.rows[0]?.total || 0);
      const healthy = parseInt(result.rows[0]?.healthy || 0);

      return total > 0 && healthy < condition.params.minHealthyInstances;
    } catch (error) {
      logger.error('Failed to evaluate protocol down', { error });
      return false;
    }
  }

  /**
   * 评估断言创建条件 (UMA)
   */
  private async evaluateAssertionCreated(
    condition: AssertionCreatedCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    if (context.protocol !== 'uma') {
      return false;
    }

    try {
      const { assertionType, minBond } = condition.params;
      
      // 查询最近创建的断言
      const result = await query(
        `SELECT COUNT(*) as count 
         FROM uma_assertions 
         WHERE created_at > NOW() - INTERVAL '1 hour'
         AND ($1::text IS NULL OR assertion_type = $1)
         AND ($2::numeric IS NULL OR bond >= $2)`,
        [assertionType || null, minBond || null],
      );

      return parseInt(result.rows[0]?.count || 0) > 0;
    } catch (error) {
      logger.error('Failed to evaluate assertion created', { error });
      return false;
    }
  }

  /**
   * 评估争议创建条件 (UMA)
   */
  private async evaluateDisputeCreated(
    condition: DisputeCreatedCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    if (context.protocol !== 'uma') {
      return false;
    }

    try {
      const { minDisputeBond } = condition.params;
      
      // 查询最近创建的争议
      const result = await query(
        `SELECT COUNT(*) as count 
         FROM uma_disputes 
         WHERE created_at > NOW() - INTERVAL '1 hour'
         AND ($1::numeric IS NULL OR bond >= $1)`,
        [minDisputeBond || null],
      );

      return parseInt(result.rows[0]?.count || 0) > 0;
    } catch (error) {
      logger.error('Failed to evaluate dispute created', { error });
      return false;
    }
  }

  /**
   * 评估断言被争议条件 (UMA)
   */
  private async evaluateAssertionDisputed(
    condition: AssertionDisputedCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    if (context.protocol !== 'uma') {
      return false;
    }

    try {
      const { assertionId } = condition.params;
      
      // 查询特定断言是否被争议
      const result = await query(
        `SELECT COUNT(*) as count 
         FROM uma_disputes 
         WHERE created_at > NOW() - INTERVAL '1 hour'
         AND ($1::text IS NULL OR assertion_id = $1)`,
        [assertionId || null],
      );

      return parseInt(result.rows[0]?.count || 0) > 0;
    } catch (error) {
      logger.error('Failed to evaluate assertion disputed', { error });
      return false;
    }
  }

  /**
   * 评估断言已解决条件 (UMA)
   */
  private async evaluateAssertionResolved(
    condition: AssertionResolvedCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    if (context.protocol !== 'uma') {
      return false;
    }

    try {
      const { assertionId, resolution } = condition.params;
      
      // 查询特定断言是否已解决
      const result = await query(
        `SELECT COUNT(*) as count 
         FROM uma_assertions 
         WHERE resolved_at > NOW() - INTERVAL '1 hour'
         AND resolved = true
         AND ($1::text IS NULL OR assertion_id = $1)
         AND ($2::boolean IS NULL OR settlement_resolution = $2)`,
        [assertionId || null, resolution ?? null],
      );

      return parseInt(result.rows[0]?.count || 0) > 0;
    } catch (error) {
      logger.error('Failed to evaluate assertion resolved', { error });
      return false;
    }
  }

  /**
   * 评估高 Gas 价格条件
   */
  private async evaluateHighGasPrice(
    condition: HighGasPriceCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    try {
      const { thresholdGwei, chain } = condition.params;
      
      // 查询最近记录的 Gas 价格
      const result = await query(
        `SELECT gas_price_gwei 
         FROM oracle_network_metrics 
         WHERE ($1::text IS NULL OR chain = $1)
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [chain || context.chain || null],
      );

      const gasPrice = parseFloat(result.rows[0]?.gas_price_gwei || 0);
      return gasPrice > thresholdGwei;
    } catch (error) {
      logger.error('Failed to evaluate high gas price', { error });
      return false;
    }
  }

  /**
   * 评估低流动性条件
   */
  private async evaluateLowLiquidity(
    condition: LowLiquidityCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    try {
      const { minLiquidityUsd, symbol } = condition.params;
      const targetSymbol = symbol || context.symbol;
      
      // 查询流动性数据
      const result = await query(
        `SELECT liquidity_usd 
         FROM oracle_liquidity 
         WHERE ($1::text IS NULL OR symbol = $1)
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [targetSymbol || null],
      );

      const liquidity = parseFloat(result.rows[0]?.liquidity_usd || 0);
      return liquidity < minLiquidityUsd;
    } catch (error) {
      logger.error('Failed to evaluate low liquidity', { error });
      return false;
    }
  }

  /**
   * 评估价格波动率条件
   */
  private async evaluatePriceVolatility(
    condition: PriceVolatilityCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    try {
      const { windowMinutes, volatilityThreshold, symbol } = condition.params;
      const targetSymbol = symbol || context.symbol;
      
      if (!targetSymbol) {
        return false;
      }

      // 计算时间窗口内的价格波动率
      const result = await query(
        `SELECT 
          STDDEV(price) / AVG(price) * 100 as volatility
         FROM unified_price_feeds 
         WHERE symbol = $1 
         AND timestamp > NOW() - INTERVAL '${windowMinutes} minutes'`,
        [targetSymbol],
      );

      const volatility = parseFloat(result.rows[0]?.volatility || 0);
      return volatility > volatilityThreshold;
    } catch (error) {
      logger.error('Failed to evaluate price volatility', { error });
      return false;
    }
  }

  /**
   * 评估预言机延迟条件
   */
  private async evaluateOracleLag(
    condition: OracleLagCondition,
    context: AlertEvaluationContext,
  ): Promise<boolean> {
    try {
      const { maxLagBlocks, protocol } = condition.params;
      const targetProtocol = protocol || context.protocol;
      
      if (!targetProtocol) {
        return false;
      }

      // 查询预言机延迟
      const result = await query(
        `SELECT 
          MAX(current_block - last_updated_block) as lag
         FROM oracle_sync_state 
         WHERE protocol = $1`,
        [targetProtocol],
      );

      const lag = parseInt(result.rows[0]?.lag || 0);
      return lag > maxLagBlocks;
    } catch (error) {
      logger.error('Failed to evaluate oracle lag', { error });
      return false;
    }
  }

  /**
   * 评估自定义条件
   * 支持两种模式：
   * 1. 通过 expression 字段使用简单的 JavaScript 表达式
   * 2. 通过注册自定义评估函数
   */
  private evaluateCustomCondition(
    condition: AlertCondition,
    context: AlertEvaluationContext,
  ): boolean {
    const params = condition.params as CustomCondition['params'];

    try {
      // 检查是否有注册的自定义评估器
      if (params.expression && customConditionRegistry.has(params.expression)) {
        const evaluator = customConditionRegistry.get(params.expression);
        if (evaluator) {
          return evaluator(context, params);
        }
      }

      // 使用表达式评估
      if (params.expression) {
        return this.evaluateExpression(params.expression, context, params.variables || {});
      }

      logger.warn('Custom condition missing expression', { condition });
      return false;
    } catch (error) {
      logger.error('Failed to evaluate custom condition', {
        error: error instanceof Error ? error.message : String(error),
        condition,
      });
      return false;
    }
  }

  /**
   * 评估表达式
   *
   * 使用 SafeExpressionEvaluator 替代 new Function()，提供更强的安全保障：
   * 1. 表达式长度限制（防止 DoS）
   * 2. 禁止危险关键字（eval, Function, require 等）
   * 3. 只允许白名单中的操作符和函数
   * 4. 自定义词法分析和语法解析，无代码执行风险
   */
  private evaluateExpression(
    expression: string,
    context: AlertEvaluationContext,
    variables: Record<string, unknown>,
  ): boolean {
    // 构建评估上下文
    const evalContext = {
      // 上下文数据
      protocol: context.protocol,
      chain: context.chain,
      symbol: context.symbol,
      price: context.price,
      timestamp: context.timestamp,
      metadata: context.metadata,
      // 额外变量（只接受基本类型）
      ...this.sanitizeVariables(variables),
    };

    // 使用安全的表达式评估器
    return SafeExpressionEvaluator.evaluate(expression, evalContext);
  }

  /**
   * 清理变量，只允许基本类型
   */
  private sanitizeVariables(variables: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(variables)) {
      // 只允许基本类型
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // 数组只保留基本类型元素
        sanitized[key] = value.filter(
          (item) =>
            typeof item === 'number' || typeof item === 'string' || typeof item === 'boolean',
        );
      }
      // 其他类型（对象、函数等）被忽略
    }

    return sanitized;
  }

  /**
   * 检查规则是否需要节流
   */
  private isThrottled(rule: AlertRule): boolean {
    const lastTime = this.lastAlertTime.get(rule.id);
    if (!lastTime) {
      return false;
    }

    const elapsed = Date.now() - lastTime.getTime();
    const throttleMs = rule.throttleMinutes * 60 * 1000;

    return elapsed < throttleMs;
  }

  /**
   * 检查规则是否适用于当前上下文
   */
  private isRuleApplicable(rule: AlertRule, context: AlertEvaluationContext): boolean {
    // 检查规则的过滤条件
    for (const condition of rule.conditions) {
      if (condition.protocol && condition.protocol !== context.protocol) {
        return false;
      }
      if (condition.chain && condition.chain !== context.chain) {
        return false;
      }
      if (condition.symbol && condition.symbol !== context.symbol) {
        return false;
      }
    }

    return true;
  }

  /**
   * 确定告警严重性
   */
  private determineSeverity(rule: AlertRule, _context: AlertEvaluationContext): AlertSeverity {
    // 根据规则优先级和上下文确定严重性
    if (rule.priority >= 80) {
      return 'critical';
    } else if (rule.priority >= 50) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(rule: AlertRule, context: AlertEvaluationContext): string {
    let message = rule.description || `Alert: ${rule.name}`;

    if (context.protocol) {
      message += ` [Protocol: ${context.protocol}]`;
    }
    if (context.chain) {
      message += ` [Chain: ${context.chain}]`;
    }
    if (context.symbol) {
      message += ` [Symbol: ${context.symbol}]`;
    }
    if (context.price) {
      message += ` [Price: ${context.price}]`;
    }

    return message;
  }

  /**
   * 添加新规则
   */
  async addRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const id = crypto.randomUUID();
    const now = new Date();

    const newRule: AlertRule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await query(
      `
      INSERT INTO alert_rules (
        id, name, description, enabled, priority, conditions, condition_logic,
        notification_channels, throttle_minutes, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        newRule.id,
        newRule.name,
        newRule.description,
        newRule.enabled,
        newRule.priority,
        JSON.stringify(newRule.conditions),
        newRule.conditionLogic,
        newRule.notificationChannels,
        newRule.throttleMinutes,
        newRule.createdAt,
        newRule.updatedAt,
        newRule.createdBy,
      ],
    );

    this.rules.set(newRule.id, newRule);

    logger.info(`Added alert rule: ${newRule.name}`);

    return newRule;
  }

  /**
   * 更新规则
   */
  async updateRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const rule = this.rules.get(id);
    if (!rule) {
      return null;
    }

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    await query(
      `
      UPDATE alert_rules SET
        name = $1,
        description = $2,
        enabled = $3,
        priority = $4,
        conditions = $5,
        condition_logic = $6,
        notification_channels = $7,
        throttle_minutes = $8,
        updated_at = $9
      WHERE id = $10
    `,
      [
        updatedRule.name,
        updatedRule.description,
        updatedRule.enabled,
        updatedRule.priority,
        JSON.stringify(updatedRule.conditions),
        updatedRule.conditionLogic,
        updatedRule.notificationChannels,
        updatedRule.throttleMinutes,
        updatedRule.updatedAt,
        id,
      ],
    );

    this.rules.set(id, updatedRule);

    logger.info(`Updated alert rule: ${updatedRule.name}`);

    return updatedRule;
  }

  /**
   * 删除规则
   */
  async deleteRule(id: string): Promise<boolean> {
    const rule = this.rules.get(id);
    if (!rule) {
      return false;
    }

    await query(`DELETE FROM alert_rules WHERE id = $1`, [id]);

    this.rules.delete(id);
    this.lastAlertTime.delete(id);

    logger.info(`Deleted alert rule: ${rule.name}`);

    return true;
  }

  /**
   * 获取所有规则
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取单个规则
   */
  getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  /**
   * 获取规则数量
   */
  getRuleCount(): number {
    return this.rules.size;
  }
}

// ============================================================================
// Alert Manager
// ============================================================================

export class AlertManager {
  private ruleEngine: AlertRuleEngine;

  constructor() {
    this.ruleEngine = new AlertRuleEngine();
  }

  /**
   * 初始化告警管理器
   */
  async initialize(): Promise<void> {
    await this.ruleEngine.loadRules();
    logger.info('Alert manager initialized');
  }

  /**
   * 处理价格更新事件
   */
  async handlePriceUpdate(context: AlertEvaluationContext): Promise<void> {
    const results = await this.ruleEngine.evaluateAllRules(context);

    for (const result of results) {
      await this.triggerAlert(result);
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(result: AlertEvaluationResult): Promise<void> {
    const rule = this.ruleEngine.getRule(result.ruleId);
    if (!rule) {
      return;
    }

    // 创建告警记录
    const alertId = crypto.randomUUID();
    await query(
      `
      INSERT INTO unified_alerts (
        id, protocol, chain, alert_type, severity, message, details, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        alertId,
        result.context.protocol || null,
        result.context.chain || null,
        'rule_triggered',
        result.severity,
        result.message,
        JSON.stringify(result.details),
        'open',
        new Date(),
      ],
    );

    // 发送通知
    const notification: AlertNotification = {
      id: crypto.randomUUID(),
      alertId,
      severity: result.severity,
      title: result.ruleName,
      message: result.message,
      details: result.details,
      timestamp: new Date(),
      protocol: result.context.protocol,
      chain: result.context.chain,
      symbol: result.context.symbol,
    };

    for (const channelName of rule.notificationChannels) {
      try {
        await notificationService.sendNotification(channelName, notification);
      } catch (error) {
        logger.error(`Failed to send notification to ${channelName}`, { error });
      }
    }

    logger.info(`Alert triggered: ${result.ruleName}`, {
      alertId,
      severity: result.severity,
    });
  }

  /**
   * 获取规则引擎
   */
  getRuleEngine(): AlertRuleEngine {
    return this.ruleEngine;
  }
}

// 导出单例实例
export const alertManager = new AlertManager();

// ============================================================================
// 内置自定义条件示例
// ============================================================================

/**
 * 注册内置的自定义条件
 */
function registerBuiltInCustomConditions(): void {
  // 1. 价格范围检查 - 检查价格是否在指定范围内
  registerCustomCondition('price_in_range', (context, params) => {
    const { min = 0, max = Infinity } = params.variables || {};
    if (context.price === undefined) return false;
    return context.price >= Number(min) && context.price <= Number(max);
  });

  // 2. 价格变化率检查 - 检查价格变化率是否超过阈值
  registerCustomCondition('price_change_rate', (context, params) => {
    const { threshold = 0.05, previousPrice } = params.variables || {};
    if (context.price === undefined || previousPrice === undefined) return false;
    const changeRate = Math.abs(context.price - Number(previousPrice)) / Number(previousPrice);
    return changeRate >= Number(threshold);
  });

  // 3. 多协议价格一致性检查 - 检查多个协议的价格是否一致
  registerCustomCondition('multi_protocol_consistency', (_context, params) => {
    const { prices = [], maxDeviation = 0.01 } = params.variables || {};
    if (!Array.isArray(prices) || prices.length < 2) return true;

    const priceValues = prices.map((p) => Number(p));
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const maxDiff = Math.max(...priceValues.map((p) => Math.abs(p - avg)));
    const deviation = maxDiff / avg;

    return deviation <= Number(maxDeviation);
  });

  // 4. 时间窗口检查 - 检查是否在指定时间窗口内
  registerCustomCondition('time_window', (_context, params) => {
    const { startHour = 0, endHour = 24 } = params.variables || {};
    const now = new Date();
    const hours = now.getHours();
    return hours >= Number(startHour) && hours <= Number(endHour);
  });

  // 5. 元数据字段检查 - 检查元数据中的特定字段
  registerCustomCondition('metadata_field_check', (context, params) => {
    const { field, expectedValue, operator = 'eq' } = params.variables || {};
    if (!context.metadata || !field) return false;

    const actualValue = context.metadata[field as string];

    switch (operator) {
      case 'eq':
        return actualValue === expectedValue;
      case 'neq':
        return actualValue !== expectedValue;
      case 'gt':
        return Number(actualValue) > Number(expectedValue);
      case 'gte':
        return Number(actualValue) >= Number(expectedValue);
      case 'lt':
        return Number(actualValue) < Number(expectedValue);
      case 'lte':
        return Number(actualValue) <= Number(expectedValue);
      default:
        return false;
    }
  });

  logger.info('Built-in custom conditions registered');
}

// 初始化时注册内置条件
registerBuiltInCustomConditions();
