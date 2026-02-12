import { logger } from '@/shared/logger';
import type {
  CrossChainGasEstimation,
  GasEstimationRequest,
  GasEstimationResult,
  GasPriceConfig,
  GasPriceData,
  GasPriceHistoryEntry,
  GasPriceStatistics,
  GasPriceTrend,
  GasProvider,
  GasProviderResponse,
  ProviderHealth,
} from '@/types/gasPriceTypes';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface GasCacheEntry {
  data: GasPriceData;
  timestamp: number;
}

interface HistoryEntry {
  chain: SupportedChain;
  provider: GasProvider;
  priceLevel: 'slow' | 'average' | 'fast' | 'fastest';
  price: number;
  timestamp: number;
}

interface ProviderStats {
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  consecutiveFailures: number;
  lastSuccessTime: number;
  lastFailureTime?: number;
  latencies: number[];
}

export class GasPriceService {
  private config: GasPriceConfig;
  private cache: Map<string, GasCacheEntry>;
  private history: HistoryEntry[];
  private maxHistorySize: number;
  private providerStats: Map<GasProvider, ProviderStats>;
  private readonly ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

  constructor(config?: Partial<GasPriceConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      providers: config?.providers ?? ['etherscan', 'gasnow'],
      defaultProvider: config?.defaultProvider ?? 'etherscan',
      cacheTtlMs: config?.cacheTtlMs ?? 30000,
      fallbackToEstimate: config?.fallbackToEstimate ?? true,
      chains: config?.chains ?? [
        'ethereum',
        'bsc',
        'polygon',
        'avalanche',
        'arbitrum',
        'optimism',
        'base',
        'solana',
        'near',
        'fantom',
        'celo',
        'gnosis',
        'linea',
        'scroll',
        'mantle',
        'mode',
        'blast',
        'aptos',
      ],
      retryConfig: config?.retryConfig ?? {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      },
    };
    this.cache = new Map();
    this.history = [];
    this.maxHistorySize = 10000;
    this.providerStats = new Map();
  }

  private getCacheKey(chain: SupportedChain, provider: GasProvider): string {
    return `${chain}-${provider}`;
  }

  private getFromCache(chain: SupportedChain, provider: GasProvider): GasPriceData | null {
    const key = this.getCacheKey(chain, provider);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.config.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(data: GasPriceData): void {
    const key = this.getCacheKey(data.chain, data.provider);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private addToHistory(data: GasPriceData): void {
    const levels: ('slow' | 'average' | 'fast' | 'fastest')[] = [
      'slow',
      'average',
      'fast',
      'fastest',
    ];

    for (const level of levels) {
      const price = this.getGasPriceByLevel(data, level);
      this.history.push({
        chain: data.chain,
        provider: data.provider,
        priceLevel: level,
        price,
        timestamp: Date.now(),
      });
    }

    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  private updateProviderStats(provider: GasProvider, success: boolean, latencyMs: number): void {
    let stats = this.providerStats.get(provider);

    if (!stats) {
      stats = {
        totalRequests: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        consecutiveFailures: 0,
        lastSuccessTime: 0,
        latencies: [],
      };
      this.providerStats.set(provider, stats);
    }

    stats.totalRequests++;

    if (success) {
      stats.totalSuccesses++;
      stats.consecutiveFailures = 0;
      stats.lastSuccessTime = Date.now();
    } else {
      stats.totalFailures++;
      stats.consecutiveFailures++;
      stats.lastFailureTime = Date.now();
    }

    stats.latencies.push(latencyMs);
    if (stats.latencies.length > 100) {
      stats.latencies = stats.latencies.slice(-100);
    }
  }

  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    provider: GasProvider,
  ): Promise<{ data: T; retryCount: number }> {
    const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = this.config.retryConfig;
    let lastError: Error | undefined;
    let delay = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const data = await fn();
        if (attempt > 0) {
          logger.info('Gas price fetch retry succeeded', {
            provider,
            attempt: attempt + 1,
            delay,
          });
        }
        return { data, retryCount: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          logger.warn('Gas price fetch failed, retrying...', {
            provider,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            error: lastError.message,
            nextRetryInMs: delay,
          });

          await this.sleep(delay);
          delay = Math.min(delay * backoffMultiplier, maxDelayMs);
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getGasPrice(chain: SupportedChain, provider?: GasProvider): Promise<GasPriceData> {
    const targetProvider = provider ?? this.config.defaultProvider;

    const cached = this.getFromCache(chain, targetProvider);
    if (cached) {
      logger.debug('Gas price cache hit', { chain, provider: targetProvider });
      return cached;
    }

    const providers = this.config.providers;

    for (const p of providers) {
      try {
        const { data: response, retryCount } = await this.fetchWithRetry(
          () => this.fetchFromProvider(chain, p),
          p,
        );

        if (response.success && response.data) {
          this.setCache(response.data);
          this.addToHistory(response.data);
          this.updateProviderStats(p, true, response.latencyMs);

          logger.info('Gas price fetched successfully', {
            chain,
            provider: p,
            latencyMs: response.latencyMs,
            retryCount,
          });

          return response.data;
        }

        this.updateProviderStats(p, false, response.latencyMs);
      } catch (error) {
        logger.error('Failed to fetch gas price from provider', {
          provider: p,
          chain,
          error: error instanceof Error ? error.message : String(error),
        });
        this.updateProviderStats(p, false, 0);
      }
    }

    if (this.config.fallbackToEstimate) {
      logger.warn('All providers failed, using fallback estimation', { chain });
      const fallback = this.getFallbackEstimation(chain);
      this.addToHistory(fallback);
      return fallback;
    }

    throw new Error(`Failed to fetch gas price for ${chain} from all providers`);
  }

  async getGasPricesForChains(
    chains: SupportedChain[],
  ): Promise<Map<SupportedChain, GasPriceData>> {
    const results = new Map<SupportedChain, GasPriceData>();

    const promises = chains.map(async (chain) => {
      try {
        const gasPrice = await this.getGasPrice(chain);
        return { chain, gasPrice };
      } catch (error) {
        logger.warn('Failed to fetch gas price for chain', {
          chain,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        results.set(result.value.chain, result.value.gasPrice);
      }
    }

    return results;
  }

  async estimateGasCost(request: GasEstimationRequest): Promise<GasEstimationResult> {
    const gasPriceData = await this.getGasPrice(request.chain);
    const gasPriceLevel = request.gasPrice ?? 'average';

    const gasPrice = this.getGasPriceByLevel(gasPriceData, gasPriceLevel);
    const gasLimit = request.gasLimit ?? 21000;

    const estimatedCost = (gasPrice * gasLimit) / 1e9;
    const estimatedCostUsd = this.convertToUsd(estimatedCost, request.chain);

    return {
      chain: request.chain,
      gasPrice,
      gasLimit,
      estimatedCost,
      estimatedCostUsd,
      currency: 'ETH',
      timestamp: new Date(),
    };
  }

  async estimateCrossChainGasCost(
    fromChain: SupportedChain,
    toChain: SupportedChain,
  ): Promise<CrossChainGasEstimation> {
    const [fromGasPrice, toGasPrice] = await Promise.all([
      this.getGasPrice(fromChain),
      this.getGasPrice(toChain),
    ]);

    const fromGasCost = this.convertToUsd((fromGasPrice.average * 21000) / 1e9, fromChain);
    const toGasCost = this.convertToUsd((toGasPrice.average * 21000) / 1e9, toChain);
    const bridgeCost = this.getBridgeCost(fromChain, toChain);

    return {
      fromChain,
      toChain,
      fromGasCost,
      toGasCost,
      bridgeCost,
      totalCost: fromGasCost + toGasCost + bridgeCost,
      currency: 'USD',
      timestamp: new Date(),
    };
  }

  getHistory(
    chain?: SupportedChain,
    provider?: GasProvider,
    limit: number = 100,
  ): GasPriceHistoryEntry[] {
    let filtered = this.history;

    if (chain) {
      filtered = filtered.filter((h) => h.chain === chain);
    }
    if (provider) {
      filtered = filtered.filter((h) => h.provider === provider);
    }

    return filtered.slice(-limit).map((h) => ({
      chain: h.chain,
      provider: h.provider,
      priceLevel: h.priceLevel,
      price: h.price,
      timestamp: new Date(h.timestamp),
    }));
  }

  getStatistics(
    chain: SupportedChain,
    provider: GasProvider,
    priceLevel: 'slow' | 'average' | 'fast' | 'fastest',
  ): GasPriceStatistics {
    const entries = this.history.filter(
      (h) => h.chain === chain && h.provider === provider && h.priceLevel === priceLevel,
    );

    if (entries.length === 0) {
      return {
        chain,
        provider,
        priceLevel,
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        stdDev: 0,
        p25: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        count: 0,
        startTime: new Date(),
        endTime: new Date(),
      };
    }

    const prices = entries.map((e) => e.price).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const median = prices[Math.floor(prices.length / 2)] ?? avg;

    const variance = prices.reduce((acc, p) => acc + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    const getPercentile = (p: number): number => {
      const index = Math.floor((p / 100) * prices.length);
      return prices[index] ?? avg;
    };

    return {
      chain,
      provider,
      priceLevel,
      min: prices[0]!,
      max: prices[prices.length - 1]!,
      avg,
      median,
      stdDev,
      p25: getPercentile(25),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
      count: prices.length,
      startTime: new Date(entries[0]!.timestamp),
      endTime: new Date(entries[entries.length - 1]!.timestamp),
    };
  }

  getTrend(
    chain: SupportedChain,
    priceLevel: 'slow' | 'average' | 'fast' | 'fastest',
  ): GasPriceTrend {
    const entries = this.history
      .filter((h) => h.chain === chain && h.priceLevel === priceLevel)
      .slice(-168);

    if (entries.length < 2) {
      return {
        chain,
        priceLevel,
        direction: 'stable',
        changePercent: 0,
        changeValue: 0,
        ma7: 0,
        ma24: 0,
        ma168: 0,
        volatility: 0,
        timestamp: new Date(),
      };
    }

    const prices = entries.map((e) => e.price);
    const currentPrice = prices[prices.length - 1]!;
    const previousPrice = prices[0]!;

    const changeValue = currentPrice - previousPrice;
    const changePercent = previousPrice > 0 ? (changeValue / previousPrice) * 100 : 0;

    const calculateMA = (period: number): number => {
      if (prices.length < period) return avg(prices);
      const slice = prices.slice(-period);
      return avg(slice);
    };

    const ma7 = calculateMA(7);
    const ma24 = calculateMA(24);
    const ma168 = calculateMA(168);

    const avgPrice = avg(prices);
    const variance = prices.reduce((acc, p) => acc + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = (Math.sqrt(variance) / avgPrice) * 100;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'up' : 'down';
    }

    return {
      chain,
      priceLevel,
      direction,
      changePercent,
      changeValue,
      ma7,
      ma24,
      ma168,
      volatility,
      timestamp: new Date(),
    };
  }

  getProviderHealth(): ProviderHealth[] {
    const results: ProviderHealth[] = [];

    for (const [provider, stats] of this.providerStats.entries()) {
      const successRate =
        stats.totalRequests > 0 ? (stats.totalSuccesses / stats.totalRequests) * 100 : 100;

      const avgLatency =
        stats.latencies.length > 0
          ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
          : 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (successRate < 50 || stats.consecutiveFailures >= 5) {
        status = 'unhealthy';
      } else if (successRate < 80 || stats.consecutiveFailures >= 3) {
        status = 'degraded';
      }

      results.push({
        provider,
        status,
        successRate,
        avgLatencyMs: avgLatency,
        lastSuccessTime: new Date(stats.lastSuccessTime || Date.now()),
        lastFailureTime: stats.lastFailureTime ? new Date(stats.lastFailureTime) : undefined,
        consecutiveFailures: stats.consecutiveFailures,
        totalRequests: stats.totalRequests,
        totalSuccesses: stats.totalSuccesses,
        totalFailures: stats.totalFailures,
      });
    }

    return results;
  }

  async warmCache(chains?: SupportedChain[]): Promise<void> {
    const targetChains = chains ?? this.config.chains;
    logger.info('Warming up gas price cache', { chains: targetChains });

    const promises = targetChains.map(async (chain) => {
      try {
        await this.getGasPrice(chain);
      } catch (error) {
        logger.warn('Failed to warm cache for chain', {
          chain,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.allSettled(promises);
    logger.info('Gas price cache warmed up', { chains: targetChains });
  }

  private async fetchFromProvider(
    chain: SupportedChain,
    provider: GasProvider,
  ): Promise<GasProviderResponse> {
    const startTime = Date.now();

    try {
      let data: GasPriceData;

      switch (provider) {
        case 'etherscan':
          data = await this.fetchFromEtherscan(chain);
          break;
        case 'gasnow':
          data = await this.fetchFromGasNow(chain);
          break;
        case 'blocknative':
          data = await this.fetchFromBlocknative(chain);
          break;
        case 'ethgasstation':
          data = await this.fetchFromEthGasStation(chain);
          break;
        case 'gasprice':
          data = await this.fetchFromGasPrice(chain);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return {
        provider,
        success: true,
        data,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Failed to fetch from gas provider', {
        provider,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        provider,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private async fetchFromEtherscan(chain: SupportedChain): Promise<GasPriceData> {
    const apiUrl = this.getEtherscanApiUrl(chain);
    if (!apiUrl) {
      throw new Error(`Etherscan API not available for ${chain}`);
    }

    const url = new URL(apiUrl);
    url.searchParams.append('module', 'gastracker');
    url.searchParams.append('action', 'gasoracle');
    if (this.ETHERSCAN_API_KEY) {
      url.searchParams.append('apikey', this.ETHERSCAN_API_KEY);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== '1') {
      throw new Error(`Etherscan API error: ${data.message || 'Unknown error'}`);
    }

    const result = data.result;

    return {
      chain,
      provider: 'etherscan',
      slow: parseFloat(result.SafeGasPrice) * 1e9,
      average: parseFloat(result.ProposeGasPrice) * 1e9,
      fast: parseFloat(result.FastGasPrice) * 1e9,
      fastest: parseFloat(result.FastGasPrice) * 1e9,
      baseFee: parseFloat(result.gasUsedRatio) * 1e9,
      timestamp: new Date(),
      currency: 'Gwei',
    };
  }

  private async fetchFromGasNow(chain: SupportedChain): Promise<GasPriceData> {
    if (chain !== 'ethereum') {
      throw new Error(`GasNow API only supports ethereum`);
    }

    const url = 'https://www.gasnow.org/api/v3/gas/price';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GasNow API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      chain,
      provider: 'gasnow',
      slow: data.data.slow * 1e9,
      average: data.data.standard * 1e9,
      fast: data.data.fast * 1e9,
      fastest: data.data.rapid * 1e9,
      timestamp: new Date(),
      currency: 'Wei',
    };
  }

  private async fetchFromBlocknative(chain: SupportedChain): Promise<GasPriceData> {
    if (chain !== 'ethereum') {
      throw new Error(`Blocknative API only supports ethereum`);
    }

    const url = 'https://api.blocknative.com/gasprices/blockprices';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Blocknative API error: ${response.status}`);
    }

    const data = await response.json();
    const blockPrices = data.blockPrices?.[0];
    if (!blockPrices) {
      throw new Error('Invalid Blocknative API response');
    }

    const estimatedPrices = blockPrices.estimatedPrices;

    return {
      chain,
      provider: 'blocknative',
      slow: estimatedPrices[0]?.price || 10e9,
      average: estimatedPrices[1]?.price || 20e9,
      fast: estimatedPrices[2]?.price || 30e9,
      fastest: estimatedPrices[3]?.price || 50e9,
      baseFee: blockPrices.baseFeePerGas,
      priorityFee: estimatedPrices[0]?.maxPriorityFeePerGas,
      timestamp: new Date(),
      currency: 'Wei',
    };
  }

  private async fetchFromEthGasStation(chain: SupportedChain): Promise<GasPriceData> {
    if (chain !== 'ethereum') {
      throw new Error(`ETH Gas Station API only supports ethereum`);
    }

    const url = 'https://ethgasstation.info/api/ethgasAPI.json';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ETH Gas Station API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      chain,
      provider: 'ethgasstation',
      slow: data.safeLow * 1e8,
      average: data.average * 1e8,
      fast: data.fast * 1e8,
      fastest: data.fastest * 1e8,
      timestamp: new Date(),
      currency: 'Gwei',
    };
  }

  private async fetchFromGasPrice(chain: SupportedChain): Promise<GasPriceData> {
    const chainId = this.getChainId(chain);
    if (!chainId) {
      throw new Error(`Unsupported chain for GasPrice API: ${chain}`);
    }

    const url = `https://api.gasprice.io/v1/estimates?chainId=${chainId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GasPrice API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      chain,
      provider: 'gasprice',
      slow: data.slow?.estimatedFee || 10e9,
      average: data.average?.estimatedFee || 20e9,
      fast: data.fast?.estimatedFee || 30e9,
      fastest: data.instant?.estimatedFee || 50e9,
      timestamp: new Date(),
      currency: 'Wei',
    };
  }

  private getEtherscanApiUrl(chain: SupportedChain): string | null {
    const urls: Partial<Record<SupportedChain, string>> = {
      ethereum: 'https://api.etherscan.io/api',
      bsc: 'https://api.bscscan.com/api',
      polygon: 'https://api.polygonscan.com/api',
      avalanche: 'https://api.snowtrace.io/api',
      arbitrum: 'https://api.arbiscan.io/api',
      optimism: 'https://api-optimistic.etherscan.io/api',
      fantom: 'https://api.ftmscan.com/api',
      celo: 'https://api.celoscan.io/api',
      gnosis: 'https://api.gnosisscan.io/api',
      base: 'https://api.basescan.org/api',
      blast: 'https://api.blastscan.io/api',
    };

    return urls[chain] ?? null;
  }

  private getChainId(chain: SupportedChain): number | null {
    const chainIds: Partial<Record<SupportedChain, number>> = {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      avalanche: 43114,
      arbitrum: 42161,
      optimism: 10,
      base: 8453,
      fantom: 250,
      celo: 42220,
      gnosis: 100,
      linea: 59144,
      scroll: 534352,
      mantle: 5000,
      mode: 34443,
      blast: 81457,
      aptos: 1,
    };

    return chainIds[chain] ?? null;
  }

  private getGasPriceByLevel(
    gasPriceData: GasPriceData,
    level: 'slow' | 'average' | 'fast' | 'fastest',
  ): number {
    switch (level) {
      case 'slow':
        return gasPriceData.slow;
      case 'average':
        return gasPriceData.average;
      case 'fast':
        return gasPriceData.fast;
      case 'fastest':
        return gasPriceData.fastest;
    }
  }

  private convertToUsd(amount: number, chain: SupportedChain): number {
    const nativePrices: Partial<Record<SupportedChain, number>> = {
      ethereum: 3500,
      bsc: 600,
      polygon: 0.8,
      avalanche: 40,
      arbitrum: 3500,
      optimism: 3500,
      base: 3500,
      solana: 150,
      near: 5,
      fantom: 0.7,
      celo: 0.8,
      gnosis: 300,
      linea: 3500,
      scroll: 3500,
      mantle: 0.5,
      mode: 2,
      blast: 1,
      aptos: 10,
    };

    const price = nativePrices[chain] ?? 1;
    return amount * price;
  }

  private getBridgeCost(fromChain: SupportedChain, toChain: SupportedChain): number {
    if (fromChain === toChain) return 0;

    const bridgeCosts: Partial<Record<SupportedChain, number>> = {
      ethereum: 5.0,
      bsc: 2.0,
      polygon: 0.5,
      avalanche: 1.0,
      arbitrum: 1.5,
      optimism: 1.5,
      base: 1.0,
      solana: 0.01,
      near: 0.1,
      fantom: 0.2,
      celo: 0.1,
      gnosis: 0.1,
      linea: 0.5,
      scroll: 0.5,
      mantle: 0.3,
      mode: 0.3,
      blast: 0.3,
      aptos: 0.1,
    };

    const costA = bridgeCosts[fromChain] ?? 1.0;
    const costB = bridgeCosts[toChain] ?? 1.0;

    return (costA + costB) / 2;
  }

  private getFallbackEstimation(chain: SupportedChain): GasPriceData {
    const fallbackPrices: Partial<
      Record<SupportedChain, { slow: number; average: number; fast: number }>
    > = {
      ethereum: { slow: 15e9, average: 20e9, fast: 30e9 },
      bsc: { slow: 3e9, average: 5e9, fast: 10e9 },
      polygon: { slow: 30e9, average: 50e9, fast: 100e9 },
      avalanche: { slow: 25e9, average: 30e9, fast: 50e9 },
      arbitrum: { slow: 0.1e9, average: 0.2e9, fast: 0.5e9 },
      optimism: { slow: 0.1e9, average: 0.2e9, fast: 0.5e9 },
      base: { slow: 0.01e9, average: 0.02e9, fast: 0.05e9 },
      solana: { slow: 0.000005e9, average: 0.00001e9, fast: 0.00002e9 },
      near: { slow: 0.001e9, average: 0.002e9, fast: 0.005e9 },
      fantom: { slow: 20e9, average: 25e9, fast: 40e9 },
      celo: { slow: 5e9, average: 10e9, fast: 20e9 },
      gnosis: { slow: 5e9, average: 10e9, fast: 20e9 },
      linea: { slow: 0.1e9, average: 0.2e9, fast: 0.5e9 },
      scroll: { slow: 0.1e9, average: 0.2e9, fast: 0.5e9 },
      mantle: { slow: 0.1e9, average: 0.2e9, fast: 0.5e9 },
      mode: { slow: 0.1e9, average: 0.2e9, fast: 0.5e9 },
      blast: { slow: 0.01e9, average: 0.02e9, fast: 0.05e9 },
      aptos: { slow: 0.01e9, average: 0.02e9, fast: 0.05e9 },
    };

    const prices = fallbackPrices[chain] ?? { slow: 20e9, average: 30e9, fast: 50e9 };

    return {
      chain,
      provider: 'etherscan',
      slow: prices.slow,
      average: prices.average,
      fast: prices.fast,
      fastest: prices.fast * 1.5,
      timestamp: new Date(),
      currency: 'Wei',
    };
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Gas price cache cleared');
  }

  clearHistory(): void {
    this.history = [];
    logger.info('Gas price history cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  getHistoryStats(): { size: number; entries: number } {
    return {
      size: this.history.length,
      entries: this.history.length,
    };
  }
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export const gasPriceService = new GasPriceService();
