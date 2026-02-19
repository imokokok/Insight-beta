import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import {
  BAND_CONTRACT_ADDRESSES,
  BAND_SUPPORTED_SYMBOLS,
  BAND_CHAIN_REST_URLS,
} from '@/lib/blockchain/bandOracle';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface CosmosQueryParams {
  chain?: SupportedChain;
  symbol?: string;
  network: 'mainnet' | 'testnet';
}

interface CosmosPriceData {
  symbol: string;
  price: number;
  multiplier: string;
  requestId: string;
  resolveTime: number;
  status: 'active' | 'stale' | 'unknown';
}

interface CosmosChainInfo {
  network: 'mainnet' | 'testnet';
  chainId: string;
  blockHeight: number;
  blockHash: string;
  timestamp: number;
  restUrl: string;
}

interface CosmosValidator {
  address: string;
  moniker: string;
  status: 'active' | 'jailed' | 'inactive';
  votingPower: number;
  commission: number;
}

function parseQueryParams(request: NextRequest): CosmosQueryParams {
  const { searchParams } = new URL(request.url);
  const networkParam = searchParams.get('network');
  return {
    chain: searchParams.get('chain') as SupportedChain | undefined,
    symbol: searchParams.get('symbol') ?? undefined,
    network: networkParam === 'mainnet' || networkParam === 'testnet' ? networkParam : 'mainnet',
  };
}

function isValidChain(chain: string | undefined): chain is SupportedChain {
  if (!chain) return false;
  return Object.keys(BAND_CONTRACT_ADDRESSES).includes(chain);
}

async function fetchCosmosPriceFromBandChain(
  symbol: string,
  network: 'mainnet' | 'testnet',
): Promise<CosmosPriceData | null> {
  const restUrl = BAND_CHAIN_REST_URLS[network];
  const parts = symbol.split('/');
  const base = parts[0];

  if (!base) return null;

  try {
    const response = await fetch(`${restUrl}/oracle/v1/request_prices?symbols=${base}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      price_results?: Array<{
        symbol: string;
        px: string;
        multiplier?: string;
        request_id?: string;
        resolve_time?: string;
      }>;
    };

    const priceResult = data.price_results?.find(
      (p) => p.symbol.toUpperCase() === base.toUpperCase(),
    );

    if (!priceResult) return null;

    const resolveTime = priceResult.resolve_time
      ? parseInt(priceResult.resolve_time, 10) * 1000
      : Date.now();

    const now = Date.now();
    const stalenessMs = now - resolveTime;
    const status: CosmosPriceData['status'] =
      stalenessMs > 5 * 60 * 1000 ? 'stale' : stalenessMs > 60 * 60 * 1000 ? 'unknown' : 'active';

    return {
      symbol,
      price: parseFloat(priceResult.px),
      multiplier: priceResult.multiplier ?? '1000000000',
      requestId: priceResult.request_id ?? '',
      resolveTime,
      status,
    };
  } catch {
    return null;
  }
}

async function getCosmosChainInfo(network: 'mainnet' | 'testnet'): Promise<CosmosChainInfo> {
  const restUrl = BAND_CHAIN_REST_URLS[network];

  try {
    const response = await fetch(`${restUrl}/blocks/latest`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        network,
        chainId: network === 'mainnet' ? 'band-laozi-1' : 'band-testnet-4',
        blockHeight: 0,
        blockHash: '',
        timestamp: 0,
        restUrl,
      };
    }

    const data = (await response.json()) as {
      block?: {
        header?: {
          chain_id?: string;
          height?: string;
          time?: string;
        };
      };
      block_id?: { hash?: string };
    };

    return {
      network,
      chainId: data.block?.header?.chain_id ?? '',
      blockHeight: parseInt(data.block?.header?.height ?? '0', 10),
      blockHash: data.block_id?.hash ?? '',
      timestamp: data.block?.header?.time ? new Date(data.block.header.time).getTime() : Date.now(),
      restUrl,
    };
  } catch {
    return {
      network,
      chainId: network === 'mainnet' ? 'band-laozi-1' : 'band-testnet-4',
      blockHeight: 0,
      blockHash: '',
      timestamp: 0,
      restUrl,
    };
  }
}

async function getCosmosValidators(network: 'mainnet' | 'testnet'): Promise<CosmosValidator[]> {
  const restUrl = BAND_CHAIN_REST_URLS[network];

  try {
    const response = await fetch(`${restUrl}/cosmos/staking/v1beta1/validators`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      validators?: Array<{
        operator_address?: string;
        description?: { moniker?: string };
        status?: number;
        tokens?: string;
        commission?: { commission_rates?: { rate?: string } };
      }>;
    };

    return (data.validators ?? []).map((v) => ({
      address: v.operator_address ?? '',
      moniker: v.description?.moniker ?? 'Unknown',
      status: v.status === 3 ? 'active' : v.status === 2 ? 'jailed' : 'inactive',
      votingPower: parseFloat(v.tokens ?? '0'),
      commission: parseFloat(v.commission?.commission_rates?.rate ?? '0') * 100,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { chain, symbol, network } = parseQueryParams(request);

    if (chain && !isValidChain(chain)) {
      return error({ code: 'INVALID_CHAIN', message: `Invalid chain: ${chain}` }, 400);
    }

    if (symbol) {
      const cosmosPrice = await fetchCosmosPriceFromBandChain(symbol, network);

      if (!cosmosPrice) {
        return error(
          { code: 'PRICE_NOT_FOUND', message: `Price not found for symbol: ${symbol} on Cosmos` },
          404,
        );
      }

      const chainInfo = await getCosmosChainInfo(network);

      return ok({
        symbol,
        network,
        chainInfo,
        data: cosmosPrice,
      });
    }

    if (chain) {
      const contractAddress = BAND_CONTRACT_ADDRESSES[chain];
      if (!contractAddress) {
        return error(
          { code: 'UNSUPPORTED_CHAIN', message: `Band Protocol not supported on chain: ${chain}` },
          400,
        );
      }

      const symbols = BAND_SUPPORTED_SYMBOLS[chain] ?? [];
      const cosmosPrices: CosmosPriceData[] = [];

      for (const sym of symbols) {
        const price = await fetchCosmosPriceFromBandChain(sym, network);
        if (price) cosmosPrices.push(price);
      }

      const chainInfo = await getCosmosChainInfo(network);

      return ok({
        chain,
        network,
        chainInfo,
        count: cosmosPrices.length,
        data: cosmosPrices,
      });
    }

    const supportedChains = Object.entries(BAND_CONTRACT_ADDRESSES)
      .filter(([, address]) => address !== undefined)
      .map(([chainName]) => chainName as SupportedChain);

    const [chainInfo, validators] = await Promise.all([
      getCosmosChainInfo(network),
      getCosmosValidators(network),
    ]);

    const allPrices: Array<{ chain: SupportedChain; prices: CosmosPriceData[] }> = [];

    for (const chainName of supportedChains) {
      const symbols = BAND_SUPPORTED_SYMBOLS[chainName] ?? [];
      const prices: CosmosPriceData[] = [];

      for (const sym of symbols) {
        const price = await fetchCosmosPriceFromBandChain(sym, network);
        if (price) prices.push(price);
      }

      allPrices.push({ chain: chainName, prices });
    }

    const totalPrices = allPrices.reduce((sum, item) => sum + item.prices.length, 0);

    return ok({
      network,
      chainInfo,
      validators: validators.slice(0, 10),
      totalChains: allPrices.length,
      totalPrices,
      data: allPrices,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Cosmos data';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
