import { useCallback, useState } from 'react';

import type { CrossChainPriceData } from "@/lib/types/crossChainAnalysisTypes";
import { isPriceData, isPriceDataArray, isPriceUpdateMessage } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useEventSource } from "./useEventSource";

export interface UsePriceFeedOptions {
  symbols?: string[];
  autoConnect?: boolean;
  onPriceUpdate?: (data: CrossChainPriceData[]) => void;
  onError?: (error: Error) => void;
}

export interface UsePriceFeedReturn {
  prices: CrossChainPriceData[];
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * 价格喂价数据 Hook
 * 
 * 使用 SSE 连接获取实时价格数据，并应用类型守卫验证数据
 * 
 * @example
 * const { prices, isConnected } = usePriceFeed({
 *   symbols: ['ETH/USD', 'BTC/USD'],
 *   onPriceUpdate: (data) => console.log(data),
 * });
 */
export function usePriceFeed(options: UsePriceFeedOptions = {}): UsePriceFeedReturn {
  const { symbols = ['ETH/USD'], autoConnect = true, onPriceUpdate, onError } = options;

  const [prices, setPrices] = useState<CrossChainPriceData[]>([]);
  const [validationError, setValidationError] = useState<Error | null>(null);

  const symbolsParam = symbols.join(',');
  const url = `/api/sse/price?symbols=${encodeURIComponent(symbolsParam)}`;

  const handleMessage = useCallback(
    (data: unknown) => {
      // 验证消息格式
      if (isPriceUpdateMessage(data)) {
        // 数据已通过类型守卫验证
        setPrices(data.data);
        onPriceUpdate?.(data.data);
        setValidationError(null);
        return;
      }

      // 尝试直接验证数据数组
      if (isPriceDataArray(data)) {
        setPrices(data);
        onPriceUpdate?.(data);
        setValidationError(null);
        return;
      }

      // 尝试验证单个数据对象
      if (isPriceData(data)) {
        setPrices((prev) => {
          const filtered = prev.filter(
            (p) => !(p.chain === data.chain && p.protocol === data.protocol && p.symbol === data.symbol)
          );
          return [...filtered, data];
        });
        setValidationError(null);
        return;
      }

      // 数据验证失败
      const error = new Error('Invalid price data received');
      logger.warn('Price data validation failed', { data });
      setValidationError(error);
      onError?.(error);
    },
    [onPriceUpdate, onError]
  );

  const { isConnected, isConnecting, error: connectionError, connect, disconnect, reconnect } = useEventSource(url, {
    autoConnect,
    onMessage: handleMessage,
    onError: (event) => {
      const error = event instanceof Error ? event : new Error('Connection error');
      onError?.(error);
    },
  });

  // 合并连接错误和验证错误
  const error = connectionError || validationError;

  return {
    prices,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    reconnect,
  };
}
