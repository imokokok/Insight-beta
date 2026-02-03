/**
 * GraphQL Query Complexity Analysis
 *
 * 防止深度查询攻击和复杂查询导致的性能问题
 */

// ============================================================================
// Complexity Configuration
// ============================================================================

interface ComplexityConfig {
  maxComplexity: number;
  maxDepth: number;
  maxAliases: number;
  maxDirectives: number;
}

export const DEFAULT_COMPLEXITY_CONFIG: ComplexityConfig = {
  maxComplexity: 1000, // 最大复杂度分数
  maxDepth: 10, // 最大查询深度
  maxAliases: 20, // 最大别名数量
  maxDirectives: 10, // 最大指令数量
};

// ============================================================================
// Field Complexity Weights
// ============================================================================

const FIELD_COMPLEXITY_WEIGHTS: Record<string, number> = {
  // 基础字段 - 低成本
  id: 1,
  name: 1,
  protocol: 1,
  chain: 1,
  symbol: 1,
  price: 1,
  timestamp: 1,
  status: 1,
  severity: 1,
  enabled: 1,

  // 关联字段 - 中等成本
  metadata: 5,
  config: 5,
  context: 5,
  syncStatus: 10,

  // 列表字段 - 高成本（乘以limit）
  priceFeeds: 10,
  oracleInstances: 10,
  alerts: 10,
  historicalPrices: 20,
  latestPrices: 15,
  crossProtocolComparison: 25,

  // 统计字段 - 中等成本
  alertStats: 15,
  protocolStats: 20,
  globalStats: 25,
  priceComparison: 15,
};

// ============================================================================
// Complexity Calculator
// ============================================================================

interface ComplexityResult {
  complexity: number;
  depth: number;
  aliases: number;
  directives: number;
  isValid: boolean;
  errors: string[];
}

/**
 * 计算 GraphQL 查询的复杂度
 */
export function calculateQueryComplexity(
  query: string,
  _variables?: Record<string, unknown>,
  config: Partial<ComplexityConfig> = {},
): ComplexityResult {
  const fullConfig = { ...DEFAULT_COMPLEXITY_CONFIG, ...config };
  const errors: string[] = [];

  // 简单的复杂度估算（基于字符串分析）
  let complexity = 0;
  let depth = 0;
  let aliases = 0;
  let directives = 0;

  // 计算查询深度
  const depthMatches = query.match(/\{/g);
  if (depthMatches) {
    depth = depthMatches.length;
  }

  // 计算别名数量
  const aliasMatches = query.match(/\w+:\s*\w+/g);
  if (aliasMatches) {
    aliases = aliasMatches.length;
  }

  // 计算指令数量
  const directiveMatches = query.match(/@\w+/g);
  if (directiveMatches) {
    directives = directiveMatches.length;
  }

  // 计算字段复杂度
  for (const [field, weight] of Object.entries(FIELD_COMPLEXITY_WEIGHTS)) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`\\b${field}\\b`, 'g');
    const matches = query.match(regex);
    if (matches) {
      // 列表字段需要乘以 limit
      if (['priceFeeds', 'oracleInstances', 'alerts', 'historicalPrices'].includes(field)) {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const limitMatch = query.match(new RegExp(`${field}\\s*\\([^)]*limit:\\s*(\\d+)`));
        const limit = limitMatch && limitMatch[1] ? parseInt(limitMatch[1], 10) : 10;
        complexity += weight * Math.min(limit, 100); // 限制最大乘数
      } else {
        complexity += weight * matches.length;
      }
    }
  }

  // 基础复杂度（每个查询至少10分）
  complexity = Math.max(complexity, 10);

  // 验证限制
  if (complexity > fullConfig.maxComplexity) {
    errors.push(`Query complexity ${complexity} exceeds maximum ${fullConfig.maxComplexity}`);
  }
  if (depth > fullConfig.maxDepth) {
    errors.push(`Query depth ${depth} exceeds maximum ${fullConfig.maxDepth}`);
  }
  if (aliases > fullConfig.maxAliases) {
    errors.push(`Query aliases ${aliases} exceeds maximum ${fullConfig.maxAliases}`);
  }
  if (directives > fullConfig.maxDirectives) {
    errors.push(`Query directives ${directives} exceeds maximum ${fullConfig.maxDirectives}`);
  }

  return {
    complexity,
    depth,
    aliases,
    directives,
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Query Validator
// ============================================================================

/**
 * 验证 GraphQL 查询
 * 在解析前进行快速检查
 */
export function validateQuery(
  query: string,
  config?: Partial<ComplexityConfig>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查查询大小
  if (query.length > 10000) {
    errors.push('Query too large (max 10KB)');
    return { valid: false, errors };
  }

  // 检查是否为有效的 GraphQL 查询
  if (!query.includes('{') || !query.includes('}')) {
    errors.push('Invalid GraphQL query structure');
    return { valid: false, errors };
  }

  // 检查是否包含禁止的操作
  const forbiddenPatterns = [
    { pattern: /__schema/, message: 'Introspection queries are not allowed' },
    { pattern: /__type/, message: 'Type queries are not allowed' },
    { pattern: /\$\{/, message: 'Template literals are not allowed' },
  ];

  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(query)) {
      errors.push(message);
    }
  }

  // 计算复杂度
  const complexity = calculateQueryComplexity(query, undefined, config);
  if (!complexity.isValid) {
    errors.push(...complexity.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Rate Limiting by Complexity
// ============================================================================

interface ComplexityRateLimit {
  points: number;
  windowMs: number;
}

const COMPLEXITY_RATE_LIMITS: Record<string, ComplexityRateLimit> = {
  default: { points: 1000, windowMs: 60000 }, // 1000 points per minute
  authenticated: { points: 5000, windowMs: 60000 }, // 5000 points per minute
  admin: { points: 20000, windowMs: 60000 }, // 20000 points per minute
};

class ComplexityRateLimiter {
  private usage = new Map<string, { points: number; resetTime: number }>();

  checkComplexity(
    identifier: string,
    complexity: number,
    tier: 'default' | 'authenticated' | 'admin' = 'default',
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const limit = COMPLEXITY_RATE_LIMITS[tier]!;
    const now = Date.now();

    let usage = this.usage.get(identifier);
    if (!usage || now > usage.resetTime) {
      usage = { points: 0, resetTime: now + limit.windowMs };
      this.usage.set(identifier, usage);
    }

    const allowed = usage.points + complexity <= limit.points;
    if (allowed) {
      usage.points += complexity;
    }

    return {
      allowed,
      remaining: limit.points - usage.points,
      resetTime: usage.resetTime,
    };
  }
}

export const complexityRateLimiter = new ComplexityRateLimiter();

// ============================================================================
// Query Cost Headers
// ============================================================================

export function createComplexityHeaders(
  complexity: number,
  limit: number,
  remaining: number,
  resetTime: number,
): Record<string, string> {
  return {
    'X-Query-Complexity': complexity.toString(),
    'X-Query-Complexity-Limit': limit.toString(),
    'X-Query-Complexity-Remaining': remaining.toString(),
    'X-Query-Complexity-Reset': Math.ceil(resetTime / 1000).toString(),
  };
}
