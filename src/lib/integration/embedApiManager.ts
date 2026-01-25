export interface EmbedConfig {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  embedType: EmbedType;
  sourceUrl: string;
  dimensions: {
    width: string;
    height: string;
  };
  options: EmbedOptions;
  security: EmbedSecurity;
  analytics: EmbedAnalytics;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
  isActive: boolean;
}

export type EmbedType =
  | "iframe"
  | "widget"
  | "api"
  | "widget_chart"
  | "status_badge"
  | "metrics_card"
  | "full_dashboard";

export interface EmbedOptions {
  theme: "light" | "dark" | "auto";
  locale: string;
  refreshInterval: number;
  showHeader: boolean;
  showFooter: boolean;
  showControls: boolean;
  customCss: string;
  customJs: string;
  parameters: Record<string, string>;
}

export interface EmbedSecurity {
  allowedDomains: string[];
  requireAuthentication: boolean;
  tokenExpiry: number;
  rateLimit: number;
  rateLimitWindow: number;
  ipWhitelist: string[];
  ipBlacklist: string[];
  encryptionAlgorithm: string;
  signatureKey: string;
}

export interface EmbedAnalytics {
  trackViews: boolean;
  trackClicks: boolean;
  trackErrors: boolean;
  retentionDays: number;
  sampleRate: number;
}

export interface EmbedToken {
  token: string;
  configId: string;
  expiresAt: string;
  permissions: EmbedPermission[];
  metadata: Record<string, string>;
}

export interface EmbedPermission {
  resource: string;
  actions: ("read" | "write" | "delete")[];
}

export interface EmbedUsageStats {
  totalViews: number;
  uniqueVisitors: number;
  viewsByDay: Record<string, number>;
  topReferrers: Array<{ domain: string; count: number }>;
  averageLoadTime: number;
  errorRate: number;
}

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  size: "small" | "medium" | "large" | "full";
  dataSource: string;
  refreshInterval: number;
  options: Record<string, unknown>;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: WidgetDefinition[];
  layout: DashboardLayout;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  areas: Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export class EmbedApiManager {
  private configs: Map<string, EmbedConfig> = new Map();
  private tokens: Map<string, EmbedToken> = new Map();
  private usageData: Map<string, EmbedUsageStats> = new Map();

  private readonly WIDGET_DEFINITIONS: WidgetDefinition[] = [
    {
      type: "health_score",
      name: "Health Score",
      description: "Current oracle health score indicator",
      size: "small",
      dataSource: "/api/oracle/stats",
      refreshInterval: 30000,
      options: { showTrend: true, colorScheme: "auto" },
    },
    {
      type: "assertion_count",
      name: "Assertion Count",
      description: "Number of assertions in specified period",
      size: "medium",
      dataSource: "/api/oracle/assertions",
      refreshInterval: 60000,
      options: { period: "24h", showChart: true },
    },
    {
      type: "dispute_rate",
      name: "Dispute Rate",
      description: "Current dispute rate percentage",
      size: "small",
      dataSource: "/api/oracle/disputes",
      refreshInterval: 60000,
      options: { showTrend: true, threshold: 5 },
    },
    {
      type: "sync_status",
      name: "Sync Status",
      description: "Current synchronization status",
      size: "medium",
      dataSource: "/api/oracle/sync",
      refreshInterval: 10000,
      options: { showDetails: true },
    },
    {
      type: "cost_analysis",
      name: "Cost Analysis",
      description: "Cost efficiency metrics",
      size: "large",
      dataSource: "/api/oracle/analytics/cost",
      refreshInterval: 300000,
      options: { period: "7d", showBreakdown: true },
    },
    {
      type: "performance_metrics",
      name: "Performance Metrics",
      description: "System performance indicators",
      size: "large",
      dataSource: "/api/oracle/analytics/performance",
      refreshInterval: 60000,
      options: { showCharts: true, period: "1h" },
    },
  ];

  private readonly DASHBOARD_TEMPLATES: DashboardTemplate[] = [
    {
      id: "executive_summary",
      name: "Executive Summary",
      description: "High-level overview for executives",
      widgets: [
        {
          type: "health_score",
          name: "Health",
          description: "Health score widget",
          size: "small",
          dataSource: "",
          refreshInterval: 0,
          options: {},
        },
        {
          type: "assertion_count",
          name: "Assertions",
          description: "Assertion count widget",
          size: "medium",
          dataSource: "",
          refreshInterval: 0,
          options: {},
        },
        {
          type: "dispute_rate",
          name: "Disputes",
          description: "Dispute rate widget",
          size: "small",
          dataSource: "",
          refreshInterval: 0,
          options: {},
        },
      ],
      layout: {
        columns: 3,
        rows: 1,
        areas: [
          { name: "health", x: 0, y: 0, width: 1, height: 1 },
          { name: "assertions", x: 1, y: 0, width: 1, height: 1 },
          { name: "disputes", x: 2, y: 0, width: 1, height: 1 },
        ],
      },
    },
    {
      id: "operations_dashboard",
      name: "Operations Dashboard",
      description: "Detailed operational metrics",
      widgets: [
        {
          type: "sync_status",
          name: "Sync",
          description: "Sync status widget",
          size: "medium",
          dataSource: "",
          refreshInterval: 0,
          options: {},
        },
        {
          type: "performance_metrics",
          name: "Performance",
          description: "Performance metrics widget",
          size: "large",
          dataSource: "",
          refreshInterval: 0,
          options: {},
        },
        {
          type: "cost_analysis",
          name: "Costs",
          description: "Cost analysis widget",
          size: "large",
          dataSource: "",
          refreshInterval: 0,
          options: {},
        },
      ],
      layout: {
        columns: 3,
        rows: 2,
        areas: [
          { name: "sync", x: 0, y: 0, width: 1, height: 1 },
          { name: "performance", x: 1, y: 0, width: 2, height: 1 },
          { name: "costs", x: 0, y: 1, width: 3, height: 1 },
        ],
      },
    },
  ];

  createConfig(
    ownerId: string,
    name: string,
    embedType: EmbedType,
    options?: Partial<EmbedConfig>,
  ): EmbedConfig {
    const id = this.generateId();
    const now = new Date().toISOString();

    const config: EmbedConfig = {
      id,
      name,
      description: options?.description || "",
      ownerId,
      embedType,
      sourceUrl: options?.sourceUrl || this.generateSourceUrl(id, embedType),
      dimensions: options?.dimensions || { width: "100%", height: "400px" },
      options: {
        theme: options?.options?.theme || "auto",
        locale: options?.options?.locale || "en",
        refreshInterval: options?.options?.refreshInterval || 0,
        showHeader: options?.options?.showHeader ?? true,
        showFooter: options?.options?.showFooter ?? true,
        showControls: options?.options?.showControls ?? true,
        customCss: options?.options?.customCss || "",
        customJs: options?.options?.customJs || "",
        parameters: options?.options?.parameters || {},
      },
      security: {
        allowedDomains: options?.security?.allowedDomains || ["*"],
        requireAuthentication: options?.security?.requireAuthentication ?? true,
        tokenExpiry: options?.security?.tokenExpiry || 3600,
        rateLimit: options?.security?.rateLimit || 1000,
        rateLimitWindow: options?.security?.rateLimitWindow || 3600,
        ipWhitelist: options?.security?.ipWhitelist || [],
        ipBlacklist: options?.security?.ipBlacklist || [],
        encryptionAlgorithm:
          options?.security?.encryptionAlgorithm || "aes-256-gcm",
        signatureKey:
          options?.security?.signatureKey || this.generateSignatureKey(),
      },
      analytics: {
        trackViews: options?.analytics?.trackViews ?? true,
        trackClicks: options?.analytics?.trackClicks ?? true,
        trackErrors: options?.analytics?.trackErrors ?? true,
        retentionDays: options?.analytics?.retentionDays || 30,
        sampleRate: options?.analytics?.sampleRate || 1.0,
      },
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: null,
      accessCount: 0,
      isActive: true,
    };

    this.configs.set(id, config);
    this.usageData.set(id, {
      totalViews: 0,
      uniqueVisitors: 0,
      viewsByDay: {},
      topReferrers: [],
      averageLoadTime: 0,
      errorRate: 0,
    });

    return config;
  }

  updateConfig(id: string, updates: Partial<EmbedConfig>): EmbedConfig | null {
    const config = this.configs.get(id);
    if (!config) return null;

    const updatedConfig: EmbedConfig = {
      ...config,
      ...updates,
      id: config.id,
      ownerId: config.ownerId,
      createdAt: config.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.configs.set(id, updatedConfig);
    return updatedConfig;
  }

  deleteConfig(id: string): boolean {
    const config = this.configs.get(id);
    if (!config) return false;

    this.configs.delete(id);
    this.usageData.delete(id);

    for (const [token, tokenData] of this.tokens) {
      if (tokenData.configId === id) {
        this.tokens.delete(token);
      }
    }

    return true;
  }

  getConfig(id: string): EmbedConfig | null {
    return this.configs.get(id) || null;
  }

  getConfigsByOwner(ownerId: string): EmbedConfig[] {
    return Array.from(this.configs.values()).filter(
      (c) => c.ownerId === ownerId,
    );
  }

  generateEmbedToken(
    configId: string,
    permissions: EmbedPermission[],
    metadata: Record<string, string> = {},
    expirySeconds: number = 3600,
  ): EmbedToken | null {
    const config = this.configs.get(configId);
    if (!config || !config.isActive) return null;

    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();

    const embedToken: EmbedToken = {
      token,
      configId,
      expiresAt,
      permissions,
      metadata,
    };

    this.tokens.set(token, embedToken);
    return embedToken;
  }

  validateEmbedToken(token: string): EmbedToken | null {
    const embedToken = this.tokens.get(token);
    if (!embedToken) return null;

    if (new Date(embedToken.expiresAt) < new Date()) {
      this.tokens.delete(token);
      return null;
    }

    return embedToken;
  }

  generateEmbedCode(configId: string, token: string): string {
    const config = this.configs.get(configId);
    if (!config) return "";

    const embedUrl = `${config.sourceUrl}?token=${token}&theme=${config.options.theme}&locale=${config.options.locale}`;

    const dimensions = config.dimensions;

    return `<iframe
  src="${embedUrl}"
  width="${dimensions.width}"
  height="${dimensions.height}"
  frameborder="0"
  allow="clipboard-read; clipboard-write"
  style="border: none; border-radius: 8px;"
  title="${config.name}"
></iframe>`;
  }

  generateWidgetCode(
    widgetType: string,
    options: Record<string, unknown> = {},
  ): string {
    const widget = this.WIDGET_DEFINITIONS.find((w) => w.type === widgetType);
    if (!widget) return "";

    const widgetId = `widget_${Date.now()}`;
    const config = this.createConfig("system", widget.name, "widget_chart", {
      description: widget.description,
      dimensions: { width: "300px", height: "200px" },
      options: {
        theme: "auto",
        locale: "en",
        refreshInterval: widget.refreshInterval,
        showHeader: true,
        showFooter: false,
        showControls: true,
        customCss: "",
        customJs: "",
        parameters: { widgetType, ...options },
      },
    });

    const token = this.generateEmbedToken(config.id, [
      { resource: widgetType, actions: ["read"] },
    ]);

    return `<div
  id="${widgetId}"
  data-widget="${widgetType}"
  data-config="${config.id}"
  data-token="${token?.token}"
  style="width: 100%; height: 100%;"
></div>
<script src="https://insight.foresight.build/embed/widget.js"></script>`;
  }

  recordView(configId: string, referrer: string, loadTime: number): void {
    const config = this.configs.get(configId);
    if (!config) return;

    config.accessCount++;
    config.lastAccessedAt = new Date().toISOString();

    const stats = this.usageData.get(configId);
    if (!stats) return;

    stats.totalViews++;
    stats.averageLoadTime =
      (stats.averageLoadTime * (stats.totalViews - 1) + loadTime) /
      stats.totalViews;

    const todayDate = new Date().toISOString().split("T")[0];
    const today = todayDate ?? "unknown";
    const viewsByDayRecord = stats.viewsByDay;
    if (viewsByDayRecord) {
      const currentValue = viewsByDayRecord[today];
      if (currentValue !== undefined) {
        viewsByDayRecord[today] = currentValue + 1;
      } else {
        viewsByDayRecord[today] = 1;
      }
    }

    if (referrer) {
      const domain = this.extractDomain(referrer);
      const existing = stats.topReferrers.find((r) => r.domain === domain);
      if (existing) {
        existing.count++;
      } else {
        stats.topReferrers.push({ domain, count: 1 });
        stats.topReferrers.sort((a, b) => b.count - a.count);
        stats.topReferrers = stats.topReferrers.slice(0, 10);
      }
    }
  }

  getUsageStats(configId: string): EmbedUsageStats | null {
    return this.usageData.get(configId) || null;
  }

  getAllWidgets(): WidgetDefinition[] {
    return [...this.WIDGET_DEFINITIONS];
  }

  getAllTemplates(): DashboardTemplate[] {
    return [...this.DASHBOARD_TEMPLATES];
  }

  getEmbedStats(): {
    totalConfigs: number;
    activeConfigs: number;
    totalViews: number;
    topConfigs: Array<{ id: string; name: string; views: number }>;
  } {
    const configs = Array.from(this.configs.values());
    const totalViews = configs.reduce((sum, c) => sum + c.accessCount, 0);

    const topConfigs = configs
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map((c) => ({ id: c.id, name: c.name, views: c.accessCount }));

    return {
      totalConfigs: configs.length,
      activeConfigs: configs.filter((c) => c.isActive).length,
      totalViews,
      topConfigs,
    };
  }

  private generateId(): string {
    return `embed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSourceUrl(id: string, type: EmbedType): string {
    const baseUrl = "https://insight.foresight.build/embed";
    const typePath = {
      iframe: "view",
      widget: "widget",
      api: "api",
      widget_chart: "widget/chart",
      status_badge: "badge",
      metrics_card: "card",
      full_dashboard: "dashboard",
    };

    return `${baseUrl}/${typePath[type]}/${id}`;
  }

  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  private generateSignatureKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return "unknown";
    }
  }
}

export const embedApiManager = new EmbedApiManager();

export function createEmbedWidget(
  widgetType: string,
  containerId: string,
  options?: Record<string, unknown>,
): void {
  const code = embedApiManager.generateWidgetCode(widgetType, options);
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = code;
  }
}

export function initializeEmbed(
  configId: string,
  token: string,
  container: HTMLElement,
): void {
  const config = embedApiManager.getConfig(configId);
  const embedToken = embedApiManager.validateEmbedToken(token);

  if (!config || !embedToken) {
    container.innerHTML =
      '<div class="error">Invalid embed configuration</div>';
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = `${config.sourceUrl}?token=${token}&theme=${config.options.theme}`;
  iframe.width = config.dimensions.width;
  iframe.height = config.dimensions.height;
  iframe.frameBorder = "0";
  iframe.style.border = "none";
  iframe.style.borderRadius = "8px";

  container.appendChild(iframe);
}
