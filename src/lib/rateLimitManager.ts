export type RateLimitScope = "global" | "user" | "api_key" | "ip" | "endpoint";
export type RateLimitTier = "free" | "basic" | "pro" | "enterprise";

export interface RateLimitConfig {
  id: string;
  name: string;
  description: string;
  scope: RateLimitScope;
  tier: RateLimitTier;
  rules: RateLimitRule[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface RateLimitRule {
  id: string;
  endpointPattern: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "*";
  maxRequests: number;
  windowSeconds: number;
  responseType: "error" | "throttle" | "delay";
  delayMs: number;
  bypassForUsers: string[];
  tierLimits: Record<
    RateLimitTier,
    { maxRequests: number; windowSeconds: number }
  >;
}

export interface RateLimitTierConfig {
  tier: RateLimitTier;
  displayName: string;
  description: string;
  limits: {
    requestsPerHour: number;
    requestsPerDay: number;
    requestsPerMonth: number;
    burstLimit: number;
    concurrentLimit: number;
  };
  features: string[];
  overageAllowed: boolean;
  overageRate: number;
}

export interface RateLimitUsage {
  configId: string;
  userId?: string;
  apiKey?: string;
  ip?: string;
  endpoint: string;
  method: string;
  timestamp: string;
  requestCount: number;
  windowRemaining: number;
  limited: boolean;
  limitType: "global" | "tier" | "custom";
}

export interface RateLimitStats {
  totalRequests: number;
  limitedRequests: number;
  limitRate: number;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  requestsByTier: Record<RateLimitTier, number>;
  topLimitedEndpoints: Array<{ endpoint: string; count: number }>;
  usageTrend: Array<{ timestamp: string; requests: number; limited: number }>;
}

export interface RateLimitAlert {
  id: string;
  configId: string;
  type: "threshold_exceeded" | "abuse_detected" | "limit_approaching";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  threshold: number;
  current: number;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export class RateLimitManager {
  private configs: Map<string, RateLimitConfig> = new Map();
  private usageRecords: Map<string, RateLimitUsage[]> = new Map();
  private alerts: RateLimitAlert[] = [];
  private readonly TIERS: Record<RateLimitTier, RateLimitTierConfig> = {
    free: {
      tier: "free",
      displayName: "Free",
      description: "Basic access for development and testing",
      limits: {
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        requestsPerMonth: 100000,
        burstLimit: 10,
        concurrentLimit: 5,
      },
      features: ["Basic endpoints", "Community support"],
      overageAllowed: false,
      overageRate: 0,
    },
    basic: {
      tier: "basic",
      displayName: "Basic",
      description: "Standard access for small applications",
      limits: {
        requestsPerHour: 10000,
        requestsPerDay: 100000,
        requestsPerMonth: 1000000,
        burstLimit: 50,
        concurrentLimit: 20,
      },
      features: ["All basic endpoints", "Email support", "Analytics"],
      overageAllowed: true,
      overageRate: 0.001,
    },
    pro: {
      tier: "pro",
      displayName: "Pro",
      description: "Enhanced access for production applications",
      limits: {
        requestsPerHour: 100000,
        requestsPerDay: 1000000,
        requestsPerMonth: 10000000,
        burstLimit: 200,
        concurrentLimit: 100,
      },
      features: [
        "All endpoints",
        "Priority support",
        "Advanced analytics",
        "Custom rate limits",
      ],
      overageAllowed: true,
      overageRate: 0.0005,
    },
    enterprise: {
      tier: "enterprise",
      displayName: "Enterprise",
      description: "Unlimited access with dedicated support",
      limits: {
        requestsPerHour: 1000000,
        requestsPerDay: 10000000,
        requestsPerMonth: 100000000,
        burstLimit: 1000,
        concurrentLimit: 500,
      },
      features: [
        "All endpoints",
        "Dedicated support",
        "Custom SLAs",
        "White-glove onboarding",
      ],
      overageAllowed: true,
      overageRate: 0.0001,
    },
  };

  private readonly DEFAULT_CONFIGS: RateLimitConfig[] = [
    {
      id: "global_default",
      name: "Global Default Limits",
      description: "Default rate limits for all API requests",
      scope: "global",
      tier: "free",
      rules: [
        {
          id: "default_read",
          endpointPattern: "/api/*/GET",
          method: "GET",
          maxRequests: 100,
          windowSeconds: 60,
          responseType: "error",
          delayMs: 0,
          bypassForUsers: [],
          tierLimits: {
            free: { maxRequests: 100, windowSeconds: 60 },
            basic: { maxRequests: 300, windowSeconds: 60 },
            pro: { maxRequests: 1000, windowSeconds: 60 },
            enterprise: { maxRequests: 5000, windowSeconds: 60 },
          },
        },
        {
          id: "default_write",
          endpointPattern: "/api/*/POST",
          method: "POST",
          maxRequests: 20,
          windowSeconds: 60,
          responseType: "error",
          delayMs: 0,
          bypassForUsers: [],
          tierLimits: {
            free: { maxRequests: 20, windowSeconds: 60 },
            basic: { maxRequests: 50, windowSeconds: 60 },
            pro: { maxRequests: 200, windowSeconds: 60 },
            enterprise: { maxRequests: 1000, windowSeconds: 60 },
          },
        },
      ],
      isActive: true,
      priority: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "user_specific",
      name: "User-Specific Limits",
      description: "Per-user rate limit configurations",
      scope: "user",
      tier: "basic",
      rules: [
        {
          id: "user_dashboard",
          endpointPattern: "/api/oracle/dashboard",
          method: "GET",
          maxRequests: 60,
          windowSeconds: 60,
          responseType: "throttle",
          delayMs: 500,
          bypassForUsers: [],
          tierLimits: {
            free: { maxRequests: 30, windowSeconds: 60 },
            basic: { maxRequests: 60, windowSeconds: 60 },
            pro: { maxRequests: 120, windowSeconds: 60 },
            enterprise: { maxRequests: 300, windowSeconds: 60 },
          },
        },
        {
          id: "user_export",
          endpointPattern: "/api/export/*",
          method: "*",
          maxRequests: 10,
          windowSeconds: 3600,
          responseType: "error",
          delayMs: 0,
          bypassForUsers: ["admin"],
          tierLimits: {
            free: { maxRequests: 5, windowSeconds: 3600 },
            basic: { maxRequests: 10, windowSeconds: 3600 },
            pro: { maxRequests: 25, windowSeconds: 3600 },
            enterprise: { maxRequests: 100, windowSeconds: 3600 },
          },
        },
      ],
      isActive: true,
      priority: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "critical_endpoints",
      name: "Critical Endpoint Protection",
      description: "Enhanced protection for critical endpoints",
      scope: "endpoint",
      tier: "pro",
      rules: [
        {
          id: "critical_sync",
          endpointPattern: "/api/oracle/sync",
          method: "POST",
          maxRequests: 5,
          windowSeconds: 60,
          responseType: "error",
          delayMs: 0,
          bypassForUsers: [],
          tierLimits: {
            free: { maxRequests: 1, windowSeconds: 60 },
            basic: { maxRequests: 3, windowSeconds: 60 },
            pro: { maxRequests: 5, windowSeconds: 60 },
            enterprise: { maxRequests: 10, windowSeconds: 60 },
          },
        },
        {
          id: "critical_dispute",
          endpointPattern: "/api/oracle/disputes",
          method: "POST",
          maxRequests: 3,
          windowSeconds: 300,
          responseType: "error",
          delayMs: 0,
          bypassForUsers: [],
          tierLimits: {
            free: { maxRequests: 1, windowSeconds: 300 },
            basic: { maxRequests: 2, windowSeconds: 300 },
            pro: { maxRequests: 3, windowSeconds: 300 },
            enterprise: { maxRequests: 10, windowSeconds: 300 },
          },
        },
      ],
      isActive: true,
      priority: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  constructor() {
    this.DEFAULT_CONFIGS.forEach((config) => {
      this.configs.set(config.id, config);
    });
  }

  createConfig(
    config: Omit<RateLimitConfig, "id" | "createdAt" | "updatedAt">,
  ): RateLimitConfig {
    const id = `ratelimit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const fullConfig: RateLimitConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.configs.set(id, fullConfig);
    return fullConfig;
  }

  updateConfig(
    id: string,
    updates: Partial<RateLimitConfig>,
  ): RateLimitConfig | null {
    const config = this.configs.get(id);
    if (!config) return null;

    const updatedConfig: RateLimitConfig = {
      ...config,
      ...updates,
      id: config.id,
      createdAt: config.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.configs.set(id, updatedConfig);
    return updatedConfig;
  }

  deleteConfig(id: string): boolean {
    const config = this.configs.get(id);
    if (!config) return false;

    if (config.scope === "global") {
      return false;
    }

    return this.configs.delete(id);
  }

  getConfig(id: string): RateLimitConfig | null {
    return this.configs.get(id) || null;
  }

  getAllConfigs(): RateLimitConfig[] {
    return Array.from(this.configs.values()).sort(
      (a, b) => a.priority - b.priority,
    );
  }

  getConfigsByScope(scope: RateLimitScope): RateLimitConfig[] {
    return this.getAllConfigs().filter((c) => c.scope === scope);
  }

  checkRateLimit(
    userId: string,
    apiKey: string | undefined,
    ip: string,
    endpoint: string,
    method: string,
    tier: RateLimitTier,
  ): {
    allowed: boolean;
    remaining: number;
    resetAt: string;
    retryAfter?: number;
  } {
    const applicableConfigs = this.getApplicableConfigs(endpoint, method, tier);

    for (const config of applicableConfigs) {
      for (const rule of config.rules) {
        if (!this.matchesRule(endpoint, method, rule)) continue;

        const tierLimit = rule.tierLimits[tier];
        const key = this.getUsageKey(userId, apiKey, ip, config.id, rule.id);
        const usage = this.getUsage(key);

        const now = Date.now();
        const windowStart = now - tierLimit.windowSeconds * 1000;
        const recentUsage = usage.filter(
          (u) => new Date(u.timestamp).getTime() > windowStart,
        );

        if (recentUsage.length >= tierLimit.maxRequests) {
          const oldestInWindow = recentUsage[0];
          if (!oldestInWindow) break;
          const resetAt = new Date(
            new Date(oldestInWindow.timestamp).getTime() +
              tierLimit.windowSeconds * 1000,
          );

          return {
            allowed: false,
            remaining: 0,
            resetAt: resetAt.toISOString(),
            retryAfter: Math.ceil((resetAt.getTime() - now) / 1000),
          };
        }

        this.recordUsage(key, endpoint, method);
        const remaining = tierLimit.maxRequests - recentUsage.length - 1;
        const resetAt = new Date(now + tierLimit.windowSeconds * 1000);

        return {
          allowed: true,
          remaining,
          resetAt: resetAt.toISOString(),
        };
      }
    }

    return {
      allowed: true,
      remaining: -1,
      resetAt: new Date(Date.now() + 60000).toISOString(),
    };
  }

  getTierConfig(tier: RateLimitTier): RateLimitTierConfig {
    return this.TIERS[tier];
  }

  getAllTiers(): RateLimitTierConfig[] {
    return Object.values(this.TIERS);
  }

  updateTierLimits(
    tier: RateLimitTier,
    limits: Partial<RateLimitTierConfig["limits"]>,
  ): RateLimitTierConfig {
    const config = this.TIERS[tier];
    this.TIERS[tier] = {
      ...config,
      limits: { ...config.limits, ...limits },
    };
    return this.TIERS[tier];
  }

  getStats(filter?: {
    configId?: string;
    startDate?: string;
    endDate?: string;
  }): RateLimitStats {
    let allUsage = Array.from(this.usageRecords.values()).flat();

    if (filter?.configId) {
      allUsage = allUsage.filter((u) => u.configId === filter.configId);
    }

    if (filter?.startDate) {
      const start = new Date(filter.startDate).getTime();
      allUsage = allUsage.filter(
        (u) => new Date(u.timestamp).getTime() >= start,
      );
    }

    if (filter?.endDate) {
      const end = new Date(filter.endDate).getTime();
      allUsage = allUsage.filter((u) => new Date(u.timestamp).getTime() <= end);
    }

    const totalRequests = allUsage.length;
    const limitedRequests = allUsage.filter((u) => u.limited).length;
    const limitRate =
      totalRequests > 0 ? (limitedRequests / totalRequests) * 100 : 0;

    const requestsByEndpoint: Record<string, number> = {};
    const requestsByUser: Record<string, number> = {};

    allUsage.forEach((usage) => {
      requestsByEndpoint[usage.endpoint] =
        (requestsByEndpoint[usage.endpoint] || 0) + 1;
      if (usage.userId) {
        requestsByUser[usage.userId] = (requestsByUser[usage.userId] || 0) + 1;
      }
    });

    const requestsByTier = Object.keys(this.TIERS).reduce(
      (acc, tier) => {
        acc[tier as RateLimitTier] = Math.floor(Math.random() * 10000);
        return acc;
      },
      {} as Record<RateLimitTier, number>,
    );

    const topLimitedEndpoints = Object.entries(requestsByEndpoint)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalRequests,
      limitedRequests,
      limitRate: Number(limitRate.toFixed(2)),
      requestsByEndpoint,
      requestsByUser,
      requestsByTier,
      topLimitedEndpoints,
      usageTrend: [],
    };
  }

  createAlert(
    configId: string,
    type: RateLimitAlert["type"],
    severity: RateLimitAlert["severity"],
    message: string,
    threshold: number,
    current: number,
  ): RateLimitAlert {
    const alert: RateLimitAlert = {
      id: this.generateId(),
      configId,
      type,
      severity,
      message,
      threshold,
      current,
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
    };

    this.alerts.push(alert);
    return alert;
  }

  getAlerts(configId?: string, acknowledged?: boolean): RateLimitAlert[] {
    let filtered = this.alerts;

    if (configId) {
      filtered = filtered.filter((a) => a.configId === configId);
    }

    if (acknowledged !== undefined) {
      filtered = filtered.filter((a) =>
        acknowledged ? a.acknowledgedAt !== null : a.acknowledgedAt === null,
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId;
    return true;
  }

  generateRateLimitHeader(
    remaining: number,
    resetAt: string,
    limit: number,
  ): Record<string, string> {
    return {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": Math.max(0, remaining).toString(),
      "X-RateLimit-Reset": Math.floor(
        new Date(resetAt).getTime() / 1000,
      ).toString(),
    };
  }

  private getApplicableConfigs(
    _endpoint: string,
    _method: string,
    tier: RateLimitTier,
  ): RateLimitConfig[] {
    return this.getAllConfigs().filter((config) => {
      if (!config.isActive) return false;
      return (
        config.tier === "free" ||
        config.tier === tier ||
        config.scope === "global"
      );
    });
  }

  private matchesRule(
    endpoint: string,
    method: string,
    rule: RateLimitRule,
  ): boolean {
    if (rule.method !== "*" && rule.method !== method) return false;

    const pattern = rule.endpointPattern
      .replace(/\*/g, ".*")
      .replace(/\/api\//g, "/api/");
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`^${escapedPattern}$`);
    return regex.test(endpoint);
  }

  private getUsageKey(
    userId: string,
    apiKey: string | undefined,
    ip: string,
    configId: string,
    ruleId: string,
  ): string {
    return `${configId}:${ruleId}:${apiKey || userId}:${ip}`;
  }

  private getUsage(key: string): RateLimitUsage[] {
    return this.usageRecords.get(key) || [];
  }

  private recordUsage(key: string, endpoint: string, method: string): void {
    if (!this.usageRecords.has(key)) {
      this.usageRecords.set(key, []);
    }

    const usage: RateLimitUsage = {
      configId: key.split(":")[0] || "",
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      requestCount: 1,
      windowRemaining: 0,
      limited: false,
      limitType: "tier",
    };

    const records = this.usageRecords.get(key)!;
    records.push(usage);

    if (records.length > 10000) {
      records.shift();
    }
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const rateLimitManager = new RateLimitManager();

export function getDefaultRateLimits(tier: RateLimitTier): RateLimitTierConfig {
  return rateLimitManager.getTierConfig(tier);
}

export function checkApiRateLimit(
  userId: string,
  apiKey: string | undefined,
  ip: string,
  endpoint: string,
  method: string,
  tier: RateLimitTier = "free",
): { allowed: boolean; headers: Record<string, string> } {
  const result = rateLimitManager.checkRateLimit(
    userId,
    apiKey,
    ip,
    endpoint,
    method,
    tier,
  );

  const headers = rateLimitManager.generateRateLimitHeader(
    result.remaining,
    result.resetAt,
    result.remaining + (!result.allowed ? 0 : 1),
  );

  if (!result.allowed && result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return {
    allowed: result.allowed,
    headers,
  };
}
