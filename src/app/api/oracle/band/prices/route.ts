import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import {
  createBandClient,
  getAvailableBandSymbols,
  BAND_SUPPORTED_SYMBOLS,
  BAND_CONTRACT_ADDRESSES,
} from '@/lib/blockchain/bandOracle';
import { getDefaultRpcUrl } from '@/lib/blockchain/chainConfig';
import type { SupportedChain, UnifiedPriceFeed } from '@/types/unifiedOracleTypes';

interface BandPriceQueryParams {
  symbol?: string;
  chain?: SupportedChain;
}

interface BandPriceResponse {
  symbol: string;
  price: number;
  timestamp: number;
  chain: SupportedChain;
  decimals: number;
  isStale: boolean;
  stalenessSeconds: number;
}

function parseQueryParams(request: NextRequest): BandPriceQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    symbol: searchParams.get('symbol') ?? undefined,
    chain: searchParams.get('chain') as SupportedChain | undefined,
  };
}

function isValidChain(chain: string | undefined): chain is SupportedChain {
  if (!chain) return false;
  return Object.keys(BAND_CONTRACT_ADDRESSES).includes(chain);
}

function formatPriceFeed(feed: UnifiedPriceFeed): BandPriceResponse {
  return {
    symbol: feed.symbol,
    price: feed.price,
    timestamp: feed.timestamp,
    chain: feed.chain ?? 'ethereum',
    decimals: feed.decimals ?? 9,
    isStale: feed.isStale ?? false,
    stalenessSeconds: feed.stalenessSeconds ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { symbol, chain } = parseQueryParams(request);

    if (symbol && chain) {
      if (!isValidChain(chain)) {
        return error({ code: 'INVALID_CHAIN', message: `Invalid chain: ${chain}` }, 400);
      }

      const contractAddress = BAND_CONTRACT_ADDRESSES[chain];
      if (!contractAddress) {
        return error(
          { code: 'UNSUPPORTED_CHAIN', message: `Band Protocol not supported on chain: ${chain}` },
          400,
        );
      }

      const rpcUrl = getDefaultRpcUrl(chain);
      const client = createBandClient(chain, rpcUrl, { enableCosmosSupport: true });

      const priceFeed = await client.getPriceForSymbol(symbol);
      if (!priceFeed) {
        return error(
          { code: 'PRICE_NOT_FOUND', message: `Price not found for symbol: ${symbol}` },
          404,
        );
      }

      return ok({
        symbol,
        chain,
        data: formatPriceFeed(priceFeed),
      });
    }

    if (chain && !symbol) {
      if (!isValidChain(chain)) {
        return error({ code: 'INVALID_CHAIN', message: `Invalid chain: ${chain}` }, 400);
      }

      const contractAddress = BAND_CONTRACT_ADDRESSES[chain];
      if (!contractAddress) {
        return error(
          { code: 'UNSUPPORTED_CHAIN', message: `Band Protocol not supported on chain: ${chain}` },
          400,
        );
      }

      const rpcUrl = getDefaultRpcUrl(chain);
      const client = createBandClient(chain, rpcUrl, { enableCosmosSupport: true });

      const symbols = getAvailableBandSymbols(chain);
      const priceFeeds = await client.getMultiplePrices(symbols);

      return ok({
        chain,
        count: priceFeeds.length,
        data: priceFeeds.map(formatPriceFeed),
      });
    }

    if (symbol && !chain) {
      const supportedChains = Object.entries(BAND_CONTRACT_ADDRESSES)
        .filter(([, address]) => address !== undefined)
        .map(([chainName]) => chainName as SupportedChain);

      const results: Array<{ chain: SupportedChain; data: BandPriceResponse | null }> = [];

      for (const chainName of supportedChains) {
        const symbols = BAND_SUPPORTED_SYMBOLS[chainName] ?? [];
        if (!symbols.includes(symbol)) continue;

        const rpcUrl = getDefaultRpcUrl(chainName);
        const client = createBandClient(chainName, rpcUrl);

        try {
          const priceFeed = await client.getPriceForSymbol(symbol);
          results.push({
            chain: chainName,
            data: priceFeed ? formatPriceFeed(priceFeed) : null,
          });
        } catch {
          results.push({ chain: chainName, data: null });
        }
      }

      return ok({
        symbol,
        count: results.filter((r) => r.data !== null).length,
        data: results,
      });
    }

    const supportedChains = Object.entries(BAND_CONTRACT_ADDRESSES)
      .filter(([, address]) => address !== undefined)
      .map(([chainName]) => chainName as SupportedChain);

    const allPrices: Array<{ chain: SupportedChain; prices: BandPriceResponse[] }> = [];

    for (const chainName of supportedChains) {
      const symbols = BAND_SUPPORTED_SYMBOLS[chainName] ?? [];
      if (symbols.length === 0) continue;

      const rpcUrl = getDefaultRpcUrl(chainName);
      const client = createBandClient(chainName, rpcUrl);

      try {
        const priceFeeds = await client.getMultiplePrices(symbols);
        allPrices.push({
          chain: chainName,
          prices: priceFeeds.map(formatPriceFeed),
        });
      } catch {
        allPrices.push({ chain: chainName, prices: [] });
      }
    }

    const totalPrices = allPrices.reduce((sum, item) => sum + item.prices.length, 0);

    return ok({
      totalChains: allPrices.length,
      totalPrices,
      data: allPrices,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Band Protocol prices';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
