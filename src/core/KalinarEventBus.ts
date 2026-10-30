/**
 * KALINAR EVENT BUS (v0.1.0-alpha)
 * Strongly typed in-process event coordinator
 * Strictly Zero Emojis
 */

import { KalinarEventMap } from '../types/kalinar.js';

type EventHandler<T> = (data: T) => void | Promise<void>;

export class KalinarEventBus {
  private static instance: KalinarEventBus;
  private listeners: Map<keyof KalinarEventMap, Set<EventHandler<any>>> = new Map();
  private eventHistory: Array<{ timestamp: string; event: string; payload: unknown }> = [];
  private maxHistorySize = 1000;

  private constructor() {}

  public static getInstance(): KalinarEventBus {
    if (!KalinarEventBus.instance) {
      KalinarEventBus.instance = new KalinarEventBus();
    }
    return KalinarEventBus.instance;
  }

  public on<K extends keyof KalinarEventMap>(event: K, handler: EventHandler<KalinarEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off<K extends keyof KalinarEventMap>(event: K, handler: EventHandler<KalinarEventMap[K]>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<K extends keyof KalinarEventMap>(event: K, data: KalinarEventMap[K]): void {
    const timestamp = new Date().toISOString();
    
    // Maintain append-only telemetry history buffer
    this.eventHistory.push({ timestamp, event: event as string, payload: data });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          const res = handler(data);
          if (res instanceof Promise) {
            res.catch((err) => {
              console.error(`[EVENT_BUS_ASYNC_ERR] Event ${String(event)}:`, err);
            });
          }
        } catch (err) {
          console.error(`[EVENT_BUS_SYNC_ERR] Event ${String(event)}:`, err);
        }
      }
    }
  }

  public getHistory(): ReadonlyArray<{ timestamp: string; event: string; payload: unknown }> {
    return this.eventHistory;
  }

  public clearAllListeners(): void {
    this.listeners.clear();
  }
}

export const eventBus = KalinarEventBus.getInstance();
