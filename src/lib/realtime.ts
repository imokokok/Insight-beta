"use client";

import React from "react";
import { logger } from "@/lib/logger";

export type RealtimeEventType =
  | "assertion_created"
  | "assertion_disputed"
  | "assertion_resolved"
  | "dispute_created"
  | "dispute_updated"
  | "alert_created"
  | "alert_updated"
  | "sync_status_changed"
  | "health_score_changed";

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: unknown;
  timestamp: string;
  instanceId?: string;
  eventId?: string;
}

export interface RealtimeEventFilter {
  eventTypes?: RealtimeEventType[];
  instanceId?: string;
  minTimestamp?: string;
}

export type RealtimeEventHandler = (event: RealtimeEvent) => void;
export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";
export type RealtimeStatusCallback = (status: RealtimeConnectionStatus) => void;

const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private handlers: Map<RealtimeEventType, Set<RealtimeEventHandler>> =
    new Map();
  private statusHandlers: Set<RealtimeStatusCallback> = new Set();
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionStatus: RealtimeConnectionStatus = "disconnected";
  private messageQueue: RealtimeEvent[] = [];
  private filters: RealtimeEventFilter[] = [];
  private lastHeartbeat: number = Date.now();
  private messageCount: number = 0;
  private errorCount: number = 0;

  constructor(private url: string = "/api/events") {}

  connect(instanceId?: string, filters?: RealtimeEventFilter): void {
    if (this.eventSource && this.connectionStatus === "connected") {
      logger.debug("Realtime already connected, skipping");
      return;
    }

    this.updateConnectionStatus("connecting");
    this.disconnect();

    if (filters) {
      this.filters = [filters];
    }

    try {
      const params = new URLSearchParams();
      if (instanceId) params.set("instanceId", instanceId);

      const fullUrl = `${this.url}${params.toString() ? `?${params.toString()}` : ""}`;
      this.eventSource = new EventSource(fullUrl);

      this.setupEventHandlers(fullUrl);
      this.startHeartbeat();

      logger.info("Realtime connection initiated", { url: fullUrl, filters });
    } catch (error) {
      this.updateConnectionStatus("disconnected");
      logger.error("Failed to create EventSource", { error });
      this.scheduleReconnect(instanceId);
    }
  }

  private setupEventHandlers(fullUrl: string): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.updateConnectionStatus("connected");
      this.reconnectAttempts = 0;
      this.errorCount = 0;
      this.processMessageQueue();
      logger.info("Realtime connection established", {
        url: fullUrl,
        queueSize: this.messageQueue.length,
      });
    };

    this.eventSource.onerror = (error) => {
      this.errorCount++;
      logger.error("Realtime connection error", {
        error,
        attempt: this.reconnectAttempts,
        errorCount: this.errorCount,
      });

      if (this.connectionStatus !== "disconnected") {
        this.updateConnectionStatus("disconnected");
        this.scheduleReconnect(this.getInstanceIdFromUrl(fullUrl));
      }
    };

    this.eventSource.addEventListener("message", (event) => {
      this.handleMessage(event);
    });

    this.eventSource.addEventListener("heartbeat", () => {
      this.lastHeartbeat = Date.now();
      logger.debug("Realtime heartbeat received");
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as RealtimeEvent;
      this.messageCount++;

      if (this.shouldDispatchEvent(data)) {
        this.dispatchEvent(data);
      } else {
        logger.debug("Event filtered out", { eventType: data.type });
      }
    } catch (error) {
      logger.error("Failed to parse realtime event", {
        error,
        data: event.data,
      });
    }
  }

  private shouldDispatchEvent(event: RealtimeEvent): boolean {
    if (this.filters.length === 0) return true;

    return this.filters.some((filter) => {
      if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
        return false;
      }

      if (filter.instanceId && event.instanceId !== filter.instanceId) {
        return false;
      }

      if (filter.minTimestamp && event.timestamp < filter.minTimestamp) {
        return false;
      }

      return true;
    });
  }

  private getInstanceIdFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.searchParams.get("instanceId") || undefined;
    } catch {
      return undefined;
    }
  }

  private scheduleReconnect(instanceId?: string): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error("Max reconnect attempts reached, giving up");
      this.updateConnectionStatus("disconnected");
      return;
    }

    this.updateConnectionStatus("reconnecting");
    this.reconnectAttempts++;

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY,
    );

    logger.info("Scheduling reconnect attempt", {
      attempt: this.reconnectAttempts,
      delay,
    });

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect(instanceId, this.filters[0]);
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;

      if (timeSinceLastHeartbeat > HEARTBEAT_INTERVAL * 2) {
        logger.warn("Heartbeat timeout detected", {
          timeSinceLastHeartbeat,
        });
        this.updateConnectionStatus("disconnected");
        this.scheduleReconnect();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    logger.info("Processing message queue", { size: this.messageQueue.length });

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach((event) => {
      this.dispatchEvent(event);
    });
  }

  disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.updateConnectionStatus("disconnected");
      logger.info("Realtime connection closed", {
        messageCount: this.messageCount,
        errorCount: this.errorCount,
      });
    }
  }

  on(eventType: RealtimeEventType, handler: RealtimeEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    logger.debug("Event handler registered", {
      eventType,
      handlerCount: this.handlers.get(eventType)!.size,
    });

    return () => {
      this.off(eventType, handler);
    };
  }

  onStatusChange(callback: RealtimeStatusCallback): () => void {
    this.statusHandlers.add(callback);

    callback(this.connectionStatus);

    return () => {
      this.statusHandlers.delete(callback);
    };
  }

  off(eventType: RealtimeEventType, handler: RealtimeEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
      logger.debug("Event handler removed", {
        eventType,
        remainingHandlers: handlers.size,
      });
    }
  }

  private dispatchEvent(event: RealtimeEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          logger.error("Error in realtime event handler", {
            eventType: event.type,
            error,
          });
        }
      });
    }
  }

  private updateConnectionStatus(status: RealtimeConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      logger.info("Connection status changed", { status });

      this.statusHandlers.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          logger.error("Error in status callback", { error, status });
        }
      });
    }
  }

  getConnectionStatus(): RealtimeConnectionStatus {
    return this.connectionStatus;
  }

  getStats(): {
    messageCount: number;
    errorCount: number;
    reconnectAttempts: number;
    queueSize: number;
  } {
    return {
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length,
    };
  }

  updateFilters(filters: RealtimeEventFilter[]): void {
    this.filters = filters;
    logger.info("Event filters updated", { filters });
  }
}

let realtimeClient: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (!realtimeClient) {
    realtimeClient = new RealtimeClient();
  }
  return realtimeClient;
}

export function useRealtimeEvents(
  eventType: RealtimeEventType,
  handler: RealtimeEventHandler,
  instanceId?: string,
) {
  React.useEffect(() => {
    const client = getRealtimeClient();
    client.connect(instanceId);
    const unsubscribe = client.on(eventType, handler);

    return () => {
      unsubscribe();
      if (!client.getConnectionStatus()) {
        client.disconnect();
      }
    };
  }, [eventType, instanceId, handler]);
}

export function useRealtimeStatus(callback: RealtimeStatusCallback) {
  React.useEffect(() => {
    const client = getRealtimeClient();
    const unsubscribe = client.onStatusChange(callback);

    return unsubscribe;
  }, [callback]);
}

export function useRealtimeStats() {
  const [stats, setStats] = React.useState(() =>
    getRealtimeClient().getStats(),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(getRealtimeClient().getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
