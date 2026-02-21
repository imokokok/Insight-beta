import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import {
  BAND_CONTRACT_ADDRESSES,
  BAND_SUPPORTED_SYMBOLS,
  BAND_CHAIN_REST_URLS,
} from '@/lib/blockchain/bandOracle';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface SourceQueryParams {
  chain?: SupportedChain;
  symbol?: string;
  type?: 'evm' | 'cosmos' | 'all';
}

interface DataSource {
  sourceId: string;
  name: string;
  symbol: string;
  chain: SupportedChain;
  sourceType: 'evm' | 'cosmos';
  status: 'active' | 'inactive';
  updateIntervalSeconds: number;
  lastUpdateAt: string;
  reliabilityScore: number;
  updateFrequency: number;
  lastUpdateLatency: number;
  historicalReliability: number[];
  anomalyCount: number;
}

interface DataSourceConfig {
  chain: SupportedChain;
  type: 'evm' | 'cosmos';
  contractAddress?: string;
  restUrl?: string;
  symbols: string[];
  totalSources: number;
}

function parseQueryParams(request: NextRequest): SourceQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    chain: searchParams.get('chain') as SupportedChain | undefined,
    symbol: searchParams.get('symbol') ?? undefined,
    type: (searchParams.get('type') as SourceQueryParams['type']) ?? 'all',
  };
}

function isValidChain(chain: string | undefined): chain is SupportedChain {
  if (!chain) return false;
  return Object.keys(BAND_CONTRACT_ADDRESSES).includes(chain);
}

function generateHistoricalReliability(baseScore: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = (Math.random() - 0.5) * 4;
    const score = Math.min(100, Math.max(85, baseScore + variation));
    result.push(Math.round(score * 10) / 10);
  }
  return result;
}

function generatePerformanceData(
  symbol: string,
  chain: SupportedChain,
): {
  reliabilityScore: number;
  updateFrequency: number;
  lastUpdateLatency: number;
  historicalReliability: number[];
  anomalyCount: number;
} {
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const chainHash = chain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = (symbolHash + chainHash) % 100;

  const baseReliability = 95 + (seed % 5);
  const reliabilityScore = Math.min(99.9, baseReliability + Math.random() * 2);

  const updateFrequency = 5 + Math.floor(seed / 20);
  const lastUpdateLatency = 50 + Math.floor(Math.random() * 200);
  const historicalReliability = generateHistoricalReliability(reliabilityScore);
  const anomalyCount = reliabilityScore >= 99 ? 0 : Math.floor(Math.random() * 3);

  return {
    reliabilityScore: Math.round(reliabilityScore * 10) / 10,
    updateFrequency,
    lastUpdateLatency,
    historicalReliability,
    anomalyCount,
  };
}

function getEvmSources(chain: SupportedChain): DataSource[] {
  const contractAddress = BAND_CONTRACT_ADDRESSES[chain];
  const symbols = BAND_SUPPORTED_SYMBOLS[chain] ?? [];

  if (!contractAddress) return [];

  return symbols.map((symbol) => {
    const perf = generatePerformanceData(symbol, chain);
    return {
      sourceId: `evm-${chain}-${symbol}`,
      name: `${symbol} Price Feed`,
      symbol,
      chain,
      sourceType: 'evm' as const,
      status: 'active' as const,
      updateIntervalSeconds: perf.updateFrequency,
      lastUpdateAt: new Date(Date.now() - Math.random() * 60000).toISOString(),
      ...perf,
    };
  });
}

function getCosmosSources(chain: SupportedChain): DataSource[] {
  const symbols = BAND_SUPPORTED_SYMBOLS[chain] ?? [];

  return symbols.map((symbol) => {
    const perf = generatePerformanceData(symbol, chain);
    return {
      sourceId: `cosmos-${chain}-${symbol}`,
      name: `${symbol} Oracle`,
      symbol,
      chain,
      sourceType: 'cosmos' as const,
      status: 'active' as const,
      updateIntervalSeconds: perf.updateFrequency,
      lastUpdateAt: new Date(Date.now() - Math.random() * 60000).toISOString(),
      ...perf,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { chain, symbol, type } = parseQueryParams(request);

    if (chain) {
      if (!isValidChain(chain)) {
        return error({ code: 'INVALID_CHAIN', message: `Invalid chain: ${chain}` }, 400);
      }

      const contractAddress = BAND_CONTRACT_ADDRESSES[chain];
      const symbols = BAND_SUPPORTED_SYMBOLS[chain] ?? [];

      if (!contractAddress) {
        return error(
          { code: 'UNSUPPORTED_CHAIN', message: `Band Protocol not supported on chain: ${chain}` },
          400,
        );
      }

      let sources: DataSource[] = [];

      if (type === 'evm' || type === 'all') {
        sources = sources.concat(getEvmSources(chain));
      }

      if (type === 'cosmos' || type === 'all') {
        sources = sources.concat(getCosmosSources(chain));
      }

      if (symbol) {
        sources = sources.filter((s) => s.symbol === symbol);
      }

      const config: DataSourceConfig = {
        chain,
        type: type === 'all' || type === undefined ? 'evm' : type,
        contractAddress,
        restUrl: BAND_CHAIN_REST_URLS.mainnet,
        symbols,
        totalSources: sources.length,
      };

      return ok({
        chain,
        config,
        count: sources.length,
        dataSources: sources,
      });
    }

    const supportedChains = Object.entries(BAND_CONTRACT_ADDRESSES)
      .filter(([, address]) => address !== undefined)
      .map(([chainName]) => chainName as SupportedChain);

    const allConfigs: DataSourceConfig[] = [];
    const allSources: DataSource[] = [];

    for (const chainName of supportedChains) {
      const contractAddress = BAND_CONTRACT_ADDRESSES[chainName];
      const symbols = BAND_SUPPORTED_SYMBOLS[chainName] ?? [];

      if (!contractAddress) continue;

      let chainSources: DataSource[] = [];

      if (type === 'evm' || type === 'all') {
        chainSources = chainSources.concat(getEvmSources(chainName));
      }

      if (type === 'cosmos' || type === 'all') {
        chainSources = chainSources.concat(getCosmosSources(chainName));
      }

      if (symbol) {
        chainSources = chainSources.filter((s) => s.symbol === symbol);
      }

      allSources.push(...chainSources);

      allConfigs.push({
        chain: chainName,
        type: type === 'all' || type === undefined ? 'evm' : type,
        contractAddress,
        restUrl: BAND_CHAIN_REST_URLS.mainnet,
        symbols,
        totalSources: chainSources.length,
      });
    }

    return ok({
      totalChains: allConfigs.length,
      totalSources: allSources.length,
      configs: allConfigs,
      dataSources: allSources,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch data sources';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
