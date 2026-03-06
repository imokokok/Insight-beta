/**
 * usePythStream Hook
 * 
 * 用于连接 Pyth SSE 实时价格流的自定义 Hook
 * - 自动连接和重连
 * - 价格更新订阅
 * - 连接状态管理
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PythPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  confidence: number;
}

interface PythStreamMessage {
  type: 'connected' | 'price_update' | 'heartbeat' | 'error';
  clientId?: string;
  data?: PythPriceUpdate[];
  timestamp: number;
  updateCount?: number;
}

interface UsePythStreamOptions {
  symbols?: string[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UsePythStreamReturn {
  isConnected: boolean;
  isConnecting: boolean;
  prices: Map<string, PythPriceUpdate>;
  lastUpdate: Date | null;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  updateSymbols: (symbols: string[]) => void;
  stats: {
    updateCount: number;
    reconnectCount: number;
  };
}

const DEFAULT_OPTIONS: Required<UsePythStreamOptions> = {
  symbols: ['BTC', 'ETH', 'SOL'],
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
};

export function usePythStream(options: UsePythStreamOptions = {}): UsePythStreamReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { symbols, autoReconnect, reconnectInterval, maxReconnectAttempts } = mergedOptions;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [prices, setPrices] = useState<Map<string, PythPriceUpdate>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({ updateCount: 0, reconnectCount: 0 });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentSymbolsRef = useRef<string[]>(symbols);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateSymbolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (updateSymbolsTimeoutRef.current) {
      clearTimeout(updateSymbolsTimeoutRef.current);
      updateSymbolsTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(() => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    const symbolsParam = currentSymbolsRef.current.join(',');
    const url = `/api/oracle/pyth/stream?symbols=${symbolsParam}`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        console.log('Pyth SSE connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const message: PythStreamMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log('Pyth SSE connection established', { clientId: message.clientId });
              break;

            case 'price_update':
              if (message.data) {
                setPrices((prev) => {
                  const newMap = new Map(prev);
                  message.data!.forEach((update) => {
                    newMap.set(update.symbol, update);
                  });
                  return newMap;
                });
                setLastUpdate(new Date(message.timestamp));
                setStats((prev) => ({
                  ...prev,
                  updateCount: message.updateCount || prev.updateCount,
                }));
              }
              break;

            case 'heartbeat':
              break;

            case 'error':
              setError(new Error('Pyth SSE error received'));
              break;
          }
        } catch (err) {
          console.error('Error parsing Pyth SSE message', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('Pyth SSE error', err);
        setIsConnected(false);
        setIsConnecting(false);
        setError(new Error('Pyth SSE connection error'));
        disconnect();

        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setStats((prev) => ({ ...prev, reconnectCount: reconnectAttemptsRef.current }));
          console.log(`Reconnecting... attempt ${reconnectAttemptsRef.current}`);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };
    } catch (err) {
      console.error('Failed to create Pyth SSE connection', err);
      setError(err as Error);
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, autoReconnect, reconnectInterval, maxReconnectAttempts, disconnect]);

  const updateSymbols = useCallback((newSymbols: string[]) => {
    currentSymbolsRef.current = newSymbols;
    disconnect();
    updateSymbolsTimeoutRef.current = setTimeout(connect, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    prices,
    lastUpdate,
    error,
    connect,
    disconnect,
    updateSymbols,
    stats,
  };
}
