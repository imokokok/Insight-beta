import crypto from "crypto";

export type WebhookEvent =
  | "assertion.created"
  | "assertion.disputed"
  | "assertion.resolved"
  | "dispute.created"
  | "dispute.vote_cast"
  | "dispute.resolved"
  | "alert.triggered"
  | "alert.resolved"
  | "sync.completed"
  | "sync.failed"
  | "health.check_failed"
  | "custom";

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    retryInterval: number;
    backoffMultiplier: number;
  };
  headers: Record<string, string>;
  timeout: number;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt: string | null;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  signature: string;
  retryCount: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  status: "pending" | "success" | "failed" | "retrying";
  statusCode: number | null;
  response: string | null;
  error: string | null;
  attemptCount: number;
  createdAt: string;
  completedAt: string | null;
  duration: number | null;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode: number | null;
  response: string | null;
  error: string | null;
  duration: number;
}

export interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successRate: number;
  averageResponseTime: number;
  eventsByType: Record<WebhookEvent, number>;
  topActiveWebhooks: Array<{
    id: string;
    name: string;
    deliveryCount: number;
    successRate: number;
  }>;
}

export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveries: Map<string, WebhookDelivery[]> = new Map();
  private eventHandlers: Map<WebhookEvent, Set<string>> = new Map();

  private readonly EVENT_LABELS: Record<WebhookEvent, string> = {
    "assertion.created": "Assertion Created",
    "assertion.disputed": "Assertion Disputed",
    "assertion.resolved": "Assertion Resolved",
    "dispute.created": "Dispute Created",
    "dispute.vote_cast": "Vote Cast",
    "dispute.resolved": "Dispute Resolved",
    "alert.triggered": "Alert Triggered",
    "alert.resolved": "Alert Resolved",
    "sync.completed": "Sync Completed",
    "sync.failed": "Sync Failed",
    "health.check_failed": "Health Check Failed",
    custom: "Custom Event",
  };

  createWebhook(
    config: Omit<
      WebhookConfig,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "lastTriggeredAt"
      | "successRate"
      | "totalRequests"
      | "failedRequests"
    >,
  ): WebhookConfig {
    const id = this.generateId();
    const now = new Date().toISOString();

    const webhook: WebhookConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: null,
      successRate: 100,
      totalRequests: 0,
      failedRequests: 0,
    };

    this.webhooks.set(id, webhook);
    this.registerEventHandlers(webhook);

    return webhook;
  }

  updateWebhook(
    id: string,
    updates: Partial<WebhookConfig>,
  ): WebhookConfig | null {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;

    const updatedWebhook: WebhookConfig = {
      ...webhook,
      ...updates,
      id: webhook.id,
      createdAt: webhook.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.webhooks.set(id, updatedWebhook);

    if (updates.events) {
      this.unregisterEventHandlers(webhook);
      this.registerEventHandlers(updatedWebhook);
    }

    return updatedWebhook;
  }

  deleteWebhook(id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;

    this.unregisterEventHandlers(webhook);
    return this.webhooks.delete(id);
  }

  getWebhook(id: string): WebhookConfig | null {
    return this.webhooks.get(id) || null;
  }

  getAllWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  async triggerEvent(
    event: WebhookEvent,
    data: Record<string, unknown>,
  ): Promise<void> {
    const subscribedWebhooks = this.eventHandlers.get(event);
    if (!subscribedWebhooks || subscribedWebhooks.size === 0) return;

    const payload = this.createPayload(event, data);

    const promises = Array.from(subscribedWebhooks).map((webhookId) =>
      this.deliverWebhook(webhookId, payload),
    );

    await Promise.allSettled(promises);
  }

  private async deliverWebhook(
    webhookId: string,
    payload: WebhookPayload,
  ): Promise<void> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.isActive) return;

    const delivery = this.createDelivery(webhookId, payload.event);
    this.addDelivery(webhookId, delivery);

    let attempt = 0;
    let lastError: string | null = null;
    let statusCode: number | null = null;
    let response: string | null = null;

    while (attempt < webhook.retryPolicy.maxRetries) {
      attempt++;
      const result = await this.sendWebhookRequest(webhook, payload, attempt);

      if (result.success) {
        this.updateDeliverySuccess(delivery.id, webhookId, result);
        this.updateWebhookStats(webhookId, true);
        return;
      }

      lastError = result.error;
      statusCode = result.statusCode;
      response = result.response;

      if (attempt < webhook.retryPolicy.maxRetries) {
        const delay =
          webhook.retryPolicy.retryInterval *
          Math.pow(webhook.retryPolicy.backoffMultiplier, attempt - 1);
        await this.sleep(delay);
      }
    }

    this.updateDeliveryFailed(
      delivery.id,
      webhookId,
      lastError,
      statusCode,
      response,
    );
    this.updateWebhookStats(webhookId, false);
  }

  private async sendWebhookRequest(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attempt: number,
  ): Promise<WebhookTestResult> {
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-ID": webhook.id,
          "X-Webhook-Event": payload.event,
          "X-Webhook-Signature": payload.signature,
          "X-Webhook-Timestamp": payload.timestamp,
          "X-Webhook-Retry-Count": attempt.toString(),
          ...webhook.headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      let responseBody = "";
      try {
        responseBody = await response.text();
      } catch {
        responseBody = "";
      }

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          response: responseBody,
          error: null,
          duration,
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          response: responseBody,
          error: `HTTP ${response.status}: ${response.statusText}`,
          duration,
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      return {
        success: false,
        statusCode: null,
        response: null,
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      };
    }
  }

  async testWebhook(id: string): Promise<WebhookTestResult> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      return {
        success: false,
        statusCode: null,
        response: null,
        error: "Webhook not found",
        duration: 0,
      };
    }

    const testPayload = this.createPayload("custom", {
      type: "test",
      message: "This is a test webhook delivery from Insight Oracle",
      timestamp: new Date().toISOString(),
    });

    return this.sendWebhookRequest(webhook, testPayload, 1);
  }

  getDeliveries(webhookId: string, limit = 50): WebhookDelivery[] {
    const deliveries = this.deliveries.get(webhookId) || [];
    return deliveries.slice(-limit).reverse();
  }

  getStats(): WebhookStats {
    const webhooks = this.getAllWebhooks();
    const allDeliveries = Array.from(this.deliveries.values()).flat();

    const activeWebhooks = webhooks.filter((w) => w.isActive);
    const totalDeliveries = allDeliveries.length;
    const successfulDeliveries = allDeliveries.filter(
      (d) => d.status === "success",
    ).length;
    const successRate =
      totalDeliveries > 0
        ? (successfulDeliveries / totalDeliveries) * 100
        : 100;
    const averageResponseTime =
      allDeliveries.length > 0
        ? allDeliveries.reduce((sum, d) => sum + (d.duration || 0), 0) /
          allDeliveries.length
        : 0;

    const eventsByType = {} as Record<WebhookEvent, number>;
    webhooks.forEach((webhook) => {
      webhook.events.forEach((event) => {
        // Safe: event is a literal type from WebhookEvent union
        // eslint-disable-next-line security/detect-object-injection
        eventsByType[event] = (eventsByType[event] || 0) + 1;
      });
    });

    const topActiveWebhooks = webhooks
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 5)
      .map((w) => ({
        id: w.id,
        name: w.name,
        deliveryCount: w.totalRequests,
        successRate: w.successRate,
      }));

    return {
      totalWebhooks: webhooks.length,
      activeWebhooks: activeWebhooks.length,
      totalDeliveries,
      successRate,
      averageResponseTime,
      eventsByType,
      topActiveWebhooks,
    };
  }

  private createPayload(
    event: WebhookEvent,
    data: Record<string, unknown>,
  ): WebhookPayload {
    const timestamp = new Date().toISOString();
    const payload: WebhookPayload = {
      id: this.generateId(),
      event,
      timestamp,
      data,
      signature: "",
      retryCount: 0,
    };

    payload.signature = this.generateSignature(payload);
    return payload;
  }

  private generateSignature(payload: WebhookPayload): string {
    const message = `${payload.id}.${payload.event}.${payload.timestamp}.${JSON.stringify(payload.data)}`;
    return crypto
      .createHmac("sha256", "webhook-secret")
      .update(message)
      .digest("hex");
  }

  private createDelivery(
    webhookId: string,
    event: WebhookEvent,
  ): WebhookDelivery {
    return {
      id: this.generateId(),
      webhookId,
      event,
      status: "pending",
      statusCode: null,
      response: null,
      error: null,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      duration: null,
    };
  }

  private addDelivery(webhookId: string, delivery: WebhookDelivery): void {
    if (!this.deliveries.has(webhookId)) {
      this.deliveries.set(webhookId, []);
    }
    this.deliveries.get(webhookId)!.push(delivery);

    if (this.deliveries.get(webhookId)!.length > 100) {
      const deliveries = this.deliveries.get(webhookId)!;
      deliveries.shift();
    }
  }

  private updateDeliverySuccess(
    deliveryId: string,
    webhookId: string,
    result: WebhookTestResult,
  ): void {
    const deliveries = this.deliveries.get(webhookId);
    if (!deliveries) return;

    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;

    delivery.status = "success";
    delivery.statusCode = result.statusCode;
    delivery.response = result.response;
    delivery.completedAt = new Date().toISOString();
    delivery.duration = result.duration;
  }

  private updateDeliveryFailed(
    deliveryId: string,
    webhookId: string,
    error: string | null,
    statusCode: number | null,
    response: string | null,
  ): void {
    const deliveries = this.deliveries.get(webhookId);
    if (!deliveries) return;

    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;

    delivery.status = "failed";
    delivery.error = error;
    delivery.statusCode = statusCode;
    delivery.response = response;
    delivery.completedAt = new Date().toISOString();
  }

  private updateWebhookStats(webhookId: string, success: boolean): void {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return;

    webhook.totalRequests++;
    webhook.lastTriggeredAt = new Date().toISOString();

    if (success) {
      webhook.successRate =
        (webhook.successRate * (webhook.totalRequests - 1) + 100) /
        webhook.totalRequests;
    } else {
      webhook.failedRequests++;
      webhook.successRate =
        ((webhook.totalRequests - webhook.failedRequests) /
          webhook.totalRequests) *
        100;
    }
  }

  private registerEventHandlers(webhook: WebhookConfig): void {
    webhook.events.forEach((event) => {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set());
      }
      this.eventHandlers.get(event)!.add(webhook.id);
    });
  }

  private unregisterEventHandlers(webhook: WebhookConfig): void {
    webhook.events.forEach((event) => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(webhook.id);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    });
  }

  private generateId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getEventLabels(): Record<WebhookEvent, string> {
    return { ...this.EVENT_LABELS };
  }
}

export const webhookManager = new WebhookManager();

export function createWebhookNotification(
  url: string,
  secret: string,
  events: WebhookEvent[],
  name: string,
): WebhookConfig {
  return webhookManager.createWebhook({
    name,
    url,
    secret,
    events,
    isActive: true,
    retryPolicy: {
      maxRetries: 3,
      retryInterval: 1000,
      backoffMultiplier: 2,
    },
    headers: {},
    timeout: 5000,
  });
}

export async function sendTestNotification(
  webhookId: string,
): Promise<WebhookTestResult> {
  return webhookManager.testWebhook(webhookId);
}
