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
}

export type RealtimeEventHandler = (event: RealtimeEvent) => void;

export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private handlers: Map<RealtimeEventType, Set<RealtimeEventHandler>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isConnected: boolean = false;

  constructor(private url: string = "/api/events") {}

  connect(instanceId?: string): void {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      const params = new URLSearchParams();
      if (instanceId) params.set("instanceId", instanceId);

      const fullUrl = `${this.url}${params.toString() ? `?${params.toString()}` : ""}`;
      this.eventSource = new EventSource(fullUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        logger.info("Realtime connection established", { url: fullUrl });
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        logger.error("Realtime connection error", { error });

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          logger.info("Attempting to reconnect", {
            attempt: this.reconnectAttempts,
            delay,
          });
          setTimeout(() => this.connect(instanceId), delay);
        }
      };

      this.eventSource.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent;
          this.dispatchEvent(data);
        } catch (error) {
          logger.error("Failed to parse realtime event", { error, data: event.data });
        }
      });
    } catch (error) {
      logger.error("Failed to create EventSource", { error });
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      logger.info("Realtime connection closed");
    }
  }

  on(eventType: RealtimeEventType, handler: RealtimeEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.off(eventType, handler);
    };
  }

  off(eventType: RealtimeEventType, handler: RealtimeEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  private dispatchEvent(event: RealtimeEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
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

  getConnectionStatus(): boolean {
    return this.isConnected;
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
      if (client.getConnectionStatus()) {
        client.disconnect();
      }
    };
  }, [eventType, instanceId, handler]);
}