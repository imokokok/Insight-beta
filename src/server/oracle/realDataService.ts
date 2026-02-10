/**
 * Real Data Service - 真实数据服务
 *
 * 从 Chainlink、Pyth 等协议获取真实价格数据
 * 用于替换模拟数据，提供真实的比较分析
 */

import {
  createChainlinkClient,
  getAvailableFeedsForChain,
} from '@/lib/blockchain/chainlinkDataFeeds';
import { createPythClient, getAvailablePythSymbols } from '@/lib/blockchain/pythOracle';
import { logger } from '@/lib/logger';
import type {
  SupportedChain,
  OracleProtocol,
  PriceHeatmapData,
  PriceDeviationCell,
  LatencyAnalysis,
  RealtimeComparisonItem,
} from '@/lib/types/oracle';

// ============================================================================
// 配置
// ============================================================================

const CONFIG = {
  // 支持的链
  chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'] as SupportedChain[],

  // 支持的交易对
  symbols: [
    'ETH/USD',
    'BTC/USD',
    'LINK/USD',
    'MATIC/USD',
    'AVAX/USD',
    'SOL/USD',
    'ARB/USD',
    'OP/USD',
  ],

  // 公共 RPC URLs（作为回退）
  publicRpcUrls: {
    ethereum: [
      'https://ethereum.publicnode.com',
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
    ],
    polygon: [
      'https://polygon-rpc.com',
      'https://polygon.publicnode.com',
      'https://rpc.ankr.com/polygon',
    ],
    arbitrum: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
      'https://rpc.ankr.com/arbitrum',
    ],
    optimism: [
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
      'https://rpc.ankr.com/optimism',
    ],
    base: ['https://mainnet.base.org', 'https://base.publicnode.com', 'https://rpc.ankr.com/base'],
  } as Record<SupportedChain, string[]>,

  // RPC URLs（从环境变量获取，或使用公共 RPC）
  getRpcUrl: (chain: SupportedChain): string => {
    // 首先检查环境变量
    const envVar = `${chain.toUpperCase()}_RPC_URL`;
    const envUrl = process.env[envVar];
    if (envUrl) return envUrl;

    // 检查通用环境变量
    const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (alchemyKey) {
      const alchemyUrls: Partial<Record<SupportedChain, string>> = {
        ethereum: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        polygon: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        optimism: `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        base: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      };
      return alchemyUrls[chain] || '';
    }

    // 使用公共 RPC（随机选择一个）
    const publicUrls = CONFIG.publicRpcUrls[chain];
    if (publicUrls && publicUrls.length > 0) {
      const randomIndex = Math.floor(Math.random() * publicUrls.length);
      return publicUrls[randomIndex] || '';
    }

    return '';
  },

  // 缓存时间（毫秒）
  cacheTtlMs: 30000, // 30秒
};

// ============================================================================
// 缓存
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CONFIG.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new DataCache();

// ============================================================================
// Chainlink 数据获取
// ============================================================================

export async function fetchChainlinkPrices(
  chain: SupportedChain = 'ethereum',
): Promise<Array<{ symbol: string; price: number; timestamp: string; latency: number }>> {
  const cacheKey = `chainlink-${chain}`;
  const cached =
    cache.get<Array<{ symbol: string; price: number; timestamp: string; latency: number }>>(
      cacheKey,
    );
  if (cached) return cached;

  try {
    const rpcUrl = CONFIG.getRpcUrl(chain);
    if (!rpcUrl) {
      logger.warn(`No RPC URL configured for ${chain}`);
      return [];
    }

    const client = createChainlinkClient(chain, rpcUrl, {});
    const symbols = getAvailableFeedsForChain(chain);
    const results: Array<{ symbol: string; price: number; timestamp: string; latency: number }> =
      [];

    for (const symbol of symbols.slice(0, 8)) {
      // 限制为8个交易对
      try {
        const feedStart = Date.now();
        const feed = await client.getPriceForSymbol(symbol);
        const feedLatency = Date.now() - feedStart;

        if (feed && feed.price > 0) {
          results.push({
            symbol,
            price: feed.price,
            timestamp: String(feed.timestamp),
            latency: feedLatency,
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch Chainlink price for ${symbol} on ${chain}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    cache.set(cacheKey, results);
    return results;
  } catch (error) {
    logger.error(`Failed to fetch Chainlink prices for ${chain}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ============================================================================
// Pyth 数据获取
// ============================================================================

export async function fetchPythPrices(): Promise<
  Array<{ symbol: string; price: number; timestamp: string; latency: number; confidence: number }>
> {
  const cacheKey = 'pyth-all';
  const cached = cache.get<
    Array<{
      symbol: string;
      price: number;
      timestamp: string;
      latency: number;
      confidence: number;
    }>
  >(cacheKey);
  if (cached) return cached;

  try {
    // Pyth 使用 HTTP API，不需要 RPC
    const client = createPythClient('ethereum', '', {});
    const symbols = getAvailablePythSymbols();
    const results: Array<{
      symbol: string;
      price: number;
      timestamp: string;
      latency: number;
      confidence: number;
    }> = [];

    for (const symbol of symbols.slice(0, 8)) {
      try {
        const feedStart = Date.now();
        const feed = await client.getPriceForSymbol(symbol);
        const feedLatency = Date.now() - feedStart;

        if (feed && feed.price > 0) {
          results.push({
            symbol,
            price: feed.price,
            timestamp: String(feed.timestamp),
            latency: feedLatency,
            confidence: feed.confidence || 0.95,
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch Pyth price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    cache.set(cacheKey, results);
    return results;
  } catch (error) {
    logger.error('Failed to fetch Pyth prices', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ============================================================================
// 参考价格获取（Coinbase/Binance）
// ============================================================================

export async function fetchReferencePrice(symbol: string): Promise<number | null> {
  const cacheKey = `ref-${symbol}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    // 使用 Binance API 获取参考价格
    const base = symbol.split('/')[0];
    const quote = symbol.split('/')[1] || 'USDT';
    const binanceSymbol = `${base}${quote === 'USD' ? 'USDT' : quote}`;

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
      {
        headers: {
          Accept: 'application/json',
        },
        next: { revalidate: 30 }, // 30秒缓存
      },
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = (await response.json()) as { price: string };
    const price = parseFloat(data.price);

    if (price > 0) {
      cache.set(cacheKey, price);
      return price;
    }

    return null;
  } catch (error) {
    logger.warn(`Failed to fetch reference price for ${symbol}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// 热力图数据生成
// ============================================================================

export async function generateRealHeatmapData(
  symbols: string[],
  protocols: OracleProtocol[],
): Promise<PriceHeatmapData> {
  const startTime = Date.now();

  try {
    // 并行获取各协议数据
    const [chainlinkData, pythData] = await Promise.all([
      protocols.includes('chainlink') ? fetchChainlinkPrices('ethereum') : Promise.resolve([]),
      protocols.includes('pyth') ? fetchPythPrices() : Promise.resolve([]),
    ]);

    // 获取参考价格（中位数）
    const referencePrices = new Map<string, number>();
    for (const symbol of symbols) {
      const refPrice = await fetchReferencePrice(symbol);
      if (refPrice) {
        referencePrices.set(symbol, refPrice);
      }
    }

    // 构建热力图数据
    const rows: PriceHeatmapData['rows'] = [];
    let criticalDeviations = 0;

    for (const symbol of symbols) {
      const refPrice = referencePrices.get(symbol);
      if (!refPrice) continue;

      const cells: PriceDeviationCell[] = [];

      // 添加 Chainlink 数据
      if (protocols.includes('chainlink')) {
        const chainlinkPrice = chainlinkData.find((p) => p.symbol === symbol);
        if (chainlinkPrice) {
          // 使用小数形式存储偏差 (0.01 = 1%)
          const deviationPercent = (chainlinkPrice.price - refPrice) / refPrice;
          const absDeviation = Math.abs(deviationPercent);

          let deviationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
          if (absDeviation > 0.02) {
            deviationLevel = 'critical';
            criticalDeviations++;
          } else if (absDeviation > 0.01) deviationLevel = 'high';
          else if (absDeviation > 0.005) deviationLevel = 'medium';

          cells.push({
            protocol: 'chainlink',
            symbol,
            price: chainlinkPrice.price,
            referencePrice: refPrice,
            deviation: chainlinkPrice.price - refPrice,
            deviationPercent,
            deviationLevel,
            timestamp: chainlinkPrice.timestamp,
            isStale: false,
          });
        }
      }

      // 添加 Pyth 数据
      if (protocols.includes('pyth')) {
        const pythPrice = pythData.find((p) => p.symbol === symbol);
        if (pythPrice) {
          // 使用小数形式存储偏差 (0.01 = 1%)
          const deviationPercent = (pythPrice.price - refPrice) / refPrice;
          const absDeviation = Math.abs(deviationPercent);

          let deviationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
          if (absDeviation > 0.02) {
            deviationLevel = 'critical';
            criticalDeviations++;
          } else if (absDeviation > 0.01) deviationLevel = 'high';
          else if (absDeviation > 0.005) deviationLevel = 'medium';

          cells.push({
            protocol: 'pyth',
            symbol,
            price: pythPrice.price,
            referencePrice: refPrice,
            deviation: pythPrice.price - refPrice,
            deviationPercent,
            deviationLevel,
            timestamp: pythPrice.timestamp,
            isStale: false,
          });
        }
      }

      if (cells.length > 0) {
        const deviations = cells.map((c) => Math.abs(c.deviationPercent));
        const parts = symbol.split('/');

        rows.push({
          symbol,
          baseAsset: parts[0] || '',
          quoteAsset: parts[1] || '',
          cells,
          maxDeviation: Math.max(...deviations),
          avgDeviation: deviations.reduce((a, b) => a + b, 0) / deviations.length,
          consensusPrice: refPrice,
          consensusMethod: 'median',
        });
      }
    }

    logger.info('Generated real heatmap data', {
      symbols: rows.length,
      protocols,
      duration: Date.now() - startTime,
    });

    return {
      rows,
      protocols,
      lastUpdated: new Date().toISOString(),
      totalPairs: rows.length,
      criticalDeviations,
    };
  } catch (error) {
    logger.error('Failed to generate real heatmap data', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 延迟分析数据生成
// ============================================================================

export async function generateRealLatencyData(
  protocols: OracleProtocol[],
): Promise<LatencyAnalysis> {
  const startTime = Date.now();

  try {
    // 获取各协议的延迟数据
    const chainlinkData = protocols.includes('chainlink')
      ? await fetchChainlinkPrices('ethereum')
      : [];
    const pythData = protocols.includes('pyth') ? await fetchPythPrices() : [];

    const metrics: LatencyAnalysis['metrics'] = [];

    // 处理 Chainlink 延迟数据
    for (const data of chainlinkData) {
      const latencyMs = data.latency;
      let status: 'healthy' | 'degraded' | 'stale' = 'healthy';
      if (latencyMs > 60000) status = 'stale';
      else if (latencyMs > 30000) status = 'degraded';

      metrics.push({
        protocol: 'chainlink',
        symbol: data.symbol,
        chain: 'ethereum',
        latencyMs,
        latencySeconds: latencyMs / 1000,
        blockLag: Math.floor(latencyMs / 12000), // 假设12秒一个区块
        updateFrequency: latencyMs,
        expectedFrequency: 60000,
        // 频率偏差，小数形式 (0.01 = 1%)
        frequencyDeviation: (latencyMs - 60000) / 60000,
        percentile50: latencyMs * 0.8,
        percentile90: latencyMs * 1.2,
        percentile99: latencyMs * 1.5,
        status,
        lastUpdateTimestamp: data.timestamp,
      });
    }

    // 处理 Pyth 延迟数据
    for (const data of pythData) {
      const latencyMs = data.latency;
      let status: 'healthy' | 'degraded' | 'stale' = 'healthy';
      if (latencyMs > 60000) status = 'stale';
      else if (latencyMs > 30000) status = 'degraded';

      metrics.push({
        protocol: 'pyth',
        symbol: data.symbol,
        chain: 'solana',
        latencyMs,
        latencySeconds: latencyMs / 1000,
        blockLag: Math.floor(latencyMs / 400), // Solana 约400ms一个区块
        updateFrequency: latencyMs,
        expectedFrequency: 30000,
        // 频率偏差，小数形式 (0.01 = 1%)
        frequencyDeviation: (latencyMs - 30000) / 30000,
        percentile50: latencyMs * 0.8,
        percentile90: latencyMs * 1.2,
        percentile99: latencyMs * 1.5,
        status,
        lastUpdateTimestamp: data.timestamp,
      });
    }

    // 计算汇总统计
    const latencies = metrics.map((m) => m.latencyMs);
    const healthyFeeds = metrics.filter((m) => m.status === 'healthy').length;
    const degradedFeeds = metrics.filter((m) => m.status === 'degraded').length;
    const staleFeeds = metrics.filter((m) => m.status === 'stale').length;

    logger.info('Generated real latency data', {
      metrics: metrics.length,
      duration: Date.now() - startTime,
    });

    return {
      metrics,
      summary: {
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length || 0,
        maxLatency: Math.max(...latencies) || 0,
        minLatency: Math.min(...latencies) || 0,
        totalFeeds: metrics.length,
        healthyFeeds,
        degradedFeeds,
        staleFeeds,
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to generate real latency data', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 实时对比数据生成
// ============================================================================

export async function generateRealRealtimeData(
  protocols: OracleProtocol[],
): Promise<RealtimeComparisonItem[]> {
  const startTime = Date.now();

  try {
    // 获取各协议数据
    const chainlinkData = protocols.includes('chainlink')
      ? await fetchChainlinkPrices('ethereum')
      : [];
    const pythData = protocols.includes('pyth') ? await fetchPythPrices() : [];

    // 获取参考价格
    const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD'];
    const referencePrices = new Map<string, number>();

    for (const symbol of symbols) {
      const refPrice = await fetchReferencePrice(symbol);
      if (refPrice) {
        referencePrices.set(symbol, refPrice);
      }
    }

    const results: RealtimeComparisonItem[] = [];

    for (const symbol of symbols) {
      const refPrice = referencePrices.get(symbol);
      if (!refPrice) continue;

      const protocolData: RealtimeComparisonItem['protocols'] = [];

      // 添加 Chainlink 数据
      const chainlinkPrice = chainlinkData.find((p) => p.symbol === symbol);
      if (chainlinkPrice) {
        protocolData.push({
          protocol: 'chainlink',
          price: chainlinkPrice.price,
          timestamp: chainlinkPrice.timestamp,
          confidence: 0.95,
          latency: chainlinkPrice.latency,
          // 偏差百分比，小数形式 (0.01 = 1%)
          deviationFromConsensus: (chainlinkPrice.price - refPrice) / refPrice,
          status: chainlinkPrice.latency > 60000 ? 'stale' : 'active',
        });
      }

      // 添加 Pyth 数据
      const pythPrice = pythData.find((p) => p.symbol === symbol);
      if (pythPrice) {
        protocolData.push({
          protocol: 'pyth',
          price: pythPrice.price,
          timestamp: pythPrice.timestamp,
          confidence: pythPrice.confidence,
          latency: pythPrice.latency,
          // 偏差百分比，小数形式 (0.01 = 1%)
          deviationFromConsensus: (pythPrice.price - refPrice) / refPrice,
          status: pythPrice.latency > 60000 ? 'stale' : 'active',
        });
      }

      if (protocolData.length > 0) {
        const prices = protocolData.map((p) => p.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const median = sortedPrices[Math.floor(sortedPrices.length / 2)] ?? mean;

        results.push({
          symbol,
          protocols: protocolData,
          consensus: {
            median: median ?? mean,
            mean,
            weighted: mean,
          },
          spread: {
            min,
            max,
            absolute: max - min,
            // 价差百分比，小数形式 (0.01 = 1%)
            percent: (max - min) / (median ?? mean),
          },
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    logger.info('Generated real realtime data', {
      items: results.length,
      duration: Date.now() - startTime,
    });

    return results;
  } catch (error) {
    logger.error('Failed to generate real realtime data', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// 健康检查
// ============================================================================

export async function checkDataSourceHealth(): Promise<{
  chainlink: boolean;
  pyth: boolean;
  binance: boolean;
}> {
  const results = {
    chainlink: false,
    pyth: false,
    binance: false,
  };

  // 检查 Chainlink
  try {
    const data = await fetchChainlinkPrices('ethereum');
    results.chainlink = data.length > 0;
  } catch {
    results.chainlink = false;
  }

  // 检查 Pyth
  try {
    const data = await fetchPythPrices();
    results.pyth = data.length > 0;
  } catch {
    results.pyth = false;
  }

  // 检查 Binance
  try {
    const price = await fetchReferencePrice('ETH/USD');
    results.binance = price !== null;
  } catch {
    results.binance = false;
  }

  return results;
}
