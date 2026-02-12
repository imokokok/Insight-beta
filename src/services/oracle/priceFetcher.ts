import crypto from 'crypto';

import { createPublicClient, http, parseAbi } from 'viem';

import { LRUCache } from '@/lib/cache/lru-cache';
import { DEFAULT_FALLBACK_PRICES } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/shared/logger';
import { parseRpcUrls } from '@/shared/utils';

function secureRandom(): number {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0);
  return num / 0x100000000;
}

export interface PricePoint {
  timestamp: string;
  oraclePrice: number;
  referencePrice: number;
  deviation: number;
}

// Cache TTL configurations - can be overridden via environment variables
const SPOT_CACHE_TTL_MS = Number(env.INSIGHT_PRICE_CACHE_TTL_MS) || 10_000;
const DEX_TWAP_CACHE_TTL_MS = Number(env.INSIGHT_DEX_TWAP_CACHE_TTL_MS) || 30_000;
const POOL_META_CACHE_TTL_MS = Number(env.INSIGHT_POOL_META_CACHE_TTL_MS) || 24 * 60 * 60_000;

const LAST_GOOD_SPOT_MAX_AGE_MS = 5 * 60_000;
const LAST_GOOD_DEX_MAX_AGE_MS = 2 * 60_000;
const PROVIDER_BACKOFF_MAX_MS = 60_000;

// Synthetic price configuration for mock data
const SYNTHETIC_PRICES: Record<string, number> = {
  BTC: 65000,
  ETH: 3500,
  DEFAULT: 100,
};
const SYNTHETIC_TREND_PERIOD_MS = 24 * 60 * 60 * 1000 * 7; // 7 days
const SYNTHETIC_TREND_AMPLITUDE = 0.1; // 10%
const SYNTHETIC_NOISE_AMPLITUDE = 0.02; // 2%

// Cache size limits to prevent unbounded memory growth
const MAX_CACHE_SIZE = 1000;
const MAX_INFLIGHT_SIZE = 100;
const MAX_LAST_GOOD_SIZE = 500;
const MAX_PROVIDER_STATE_SIZE = 100;

// P1 优化：使用真正的 LRU 缓存替换 FIFO 缓存
const spotCache = new LRUCache<string, number>({
  maxSize: MAX_CACHE_SIZE,
  ttlMs: SPOT_CACHE_TTL_MS,
});
const spotInflight = new Map<string, Promise<number>>();
const lastGoodSpot = new Map<string, { price: number; atMs: number }>();

const dexCache = new LRUCache<string, number | null>({
  maxSize: MAX_CACHE_SIZE,
  ttlMs: DEX_TWAP_CACHE_TTL_MS,
});
const dexInflight = new Map<string, Promise<number | null>>();
const lastGoodDex = new Map<string, { price: number; atMs: number }>();

type ProviderState = { failCount: number; nextRetryAtMs: number };
const providerState = new Map<string, ProviderState>();

type PoolMeta = {
  token0: `0x${string}`;
  token1: `0x${string}`;
  dec0: number;
  dec1: number;
};

// P1 优化：Pool Meta 也使用 LRU 缓存
const poolMetaCache = new LRUCache<string, PoolMeta>({
  maxSize: 100,
  ttlMs: POOL_META_CACHE_TTL_MS,
});

function getDependencyTimeoutMs() {
  const raw = Number(env.INSIGHT_DEPENDENCY_TIMEOUT_MS || 10_000);
  if (!Number.isFinite(raw) || raw <= 0) return 10_000;
  return Math.min(60_000, Math.round(raw));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getDependencyTimeoutMs());
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      let text = '';
      try {
        text = await res.text();
      } catch {
        text = 'Failed to read response body';
      }
      // 提供更结构化的错误信息
      const errorInfo = {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        body: text.slice(0, 200),
      };
      throw new Error(`HTTP_ERROR: ${JSON.stringify(errorInfo)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSymbol(raw: string) {
  const sym = (raw ?? '').trim().toUpperCase();
  if (!sym) return 'ETH';
  return sym;
}

function fallbackSpotUsd(sym: string) {
  const symbol = normalizeSymbol(sym);
  const rawBtc = env.INSIGHT_FALLBACK_BTC_PRICE;
  const rawEth = env.INSIGHT_FALLBACK_ETH_PRICE;
  const rawDefault = env.INSIGHT_FALLBACK_DEFAULT_PRICE;
  const fallbackBtc = rawBtc ? Number(rawBtc) : DEFAULT_FALLBACK_PRICES.BTC;
  const fallbackEth = rawEth ? Number(rawEth) : DEFAULT_FALLBACK_PRICES.ETH;
  const fallbackDefault = rawDefault ? Number(rawDefault) : DEFAULT_FALLBACK_PRICES.DEFAULT;
  return symbol === 'BTC' ? fallbackBtc : symbol === 'ETH' ? fallbackEth : fallbackDefault;
}

function toBinanceSymbol(sym: string) {
  const s = normalizeSymbol(sym);
  return `${s}USDT`;
}

function toCoinbaseProduct(sym: string) {
  const s = normalizeSymbol(sym);
  return `${s}-USD`;
}

async function fetchBinanceSpotUsdUncached(sym: string): Promise<number> {
  const symbol = toBinanceSymbol(sym);
  const data = await fetchJson<{ price?: string }>(
    `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
  );
  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error('binance_bad_price');
  return price;
}

async function fetchCoinbaseSpotUsdUncached(sym: string): Promise<number> {
  const productId = toCoinbaseProduct(sym);
  const data = await fetchJson<{ price?: string }>(
    `https://api.exchange.coinbase.com/products/${encodeURIComponent(productId)}/ticker`,
  );
  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error('coinbase_bad_price');
  return price;
}

async function cachedNumber(
  cache: LRUCache<string, number>,
  inflight: Map<string, Promise<number>>,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<number>,
  maxInflightSize: number = MAX_INFLIGHT_SIZE,
): Promise<number> {
  // P1 优化：使用 LRU 缓存的 get 方法
  const hit = cache.get(key);
  if (hit !== null) return hit;

  // 检查是否已有进行中的请求，避免竞态条件
  const existing = inflight.get(key);
  if (existing) return existing;

  // Enforce inflight size limit before adding new request
  if (inflight.size >= maxInflightSize) {
    const oldestKey = inflight.keys().next().value;
    if (oldestKey) {
      inflight.delete(oldestKey);
    }
  }

  // 创建新请求
  const p = fetcher()
    .then((v) => {
      // P1 优化：使用 LRU 缓存的 set 方法
      cache.set(key, v, ttlMs);
      return v;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

async function fetchSpotUsdWithCache(
  sym: string,
  provider: 'binance' | 'coinbase',
): Promise<number> {
  const symbol = normalizeSymbol(sym);
  const key = `spot:${provider}:${symbol}`;
  const ttlMs = SPOT_CACHE_TTL_MS;
  return cachedNumber(spotCache, spotInflight, key, ttlMs, async () => {
    const raw =
      provider === 'binance'
        ? await fetchBinanceSpotUsdUncached(symbol)
        : await fetchCoinbaseSpotUsdUncached(symbol);
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0) throw new Error('spot_bad_price');
    return v;
  });
}

function canAttemptProvider(key: string) {
  const state = providerState.get(key);
  if (!state) return true;
  return Date.now() >= state.nextRetryAtMs;
}

function recordProviderOk(key: string) {
  // P1 优化：限制 providerState 大小
  if (providerState.size >= MAX_PROVIDER_STATE_SIZE) {
    const oldestKey = providerState.keys().next().value;
    if (oldestKey) {
      providerState.delete(oldestKey);
    }
  }
  providerState.set(key, { failCount: 0, nextRetryAtMs: 0 });
}

function recordProviderFail(key: string) {
  // P1 优化：限制 providerState 大小
  if (providerState.size >= MAX_PROVIDER_STATE_SIZE) {
    const oldestKey = providerState.keys().next().value;
    if (oldestKey) {
      providerState.delete(oldestKey);
    }
  }
  const prev = providerState.get(key) ?? { failCount: 0, nextRetryAtMs: 0 };
  const failCount = Math.min(20, prev.failCount + 1);
  const backoff = Math.min(PROVIDER_BACKOFF_MAX_MS, 1000 * 2 ** (failCount - 1));
  providerState.set(key, { failCount, nextRetryAtMs: Date.now() + backoff });
}

async function fetchSpotUsdResilient(
  sym: string,
  preferred: 'binance' | 'coinbase',
): Promise<number> {
  const symbol = normalizeSymbol(sym);
  const candidates: Array<'binance' | 'coinbase'> = [
    preferred,
    preferred === 'binance' ? 'coinbase' : 'binance',
  ];

  let lastErr: unknown = null;
  for (const provider of candidates) {
    const key = `spot_provider:${provider}:${symbol}`;
    if (!canAttemptProvider(key)) continue;
    try {
      const v = await fetchSpotUsdWithCache(symbol, provider);
      recordProviderOk(key);
      // P1 优化：限制 lastGoodSpot 大小
      if (lastGoodSpot.size >= MAX_LAST_GOOD_SIZE) {
        const oldestKey = lastGoodSpot.keys().next().value;
        if (oldestKey) {
          lastGoodSpot.delete(oldestKey);
        }
      }
      lastGoodSpot.set(symbol, { price: v, atMs: Date.now() });
      return v;
    } catch (error: unknown) {
      lastErr = error;
      recordProviderFail(key);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('spot_unavailable');
}

async function fetchBinanceDailyClosesUsd(
  sym: string,
  days: number,
): Promise<Array<{ timestamp: string; close: number }>> {
  const limit = Math.min(1000, Math.max(2, Math.floor(days) + 1));
  const symbol = toBinanceSymbol(sym);
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(
    symbol,
  )}&interval=1d&limit=${limit}`;
  const data = await fetchJson<Array<[number, string, string, string, string, string]>>(url);
  const out: Array<{ timestamp: string; close: number }> = [];
  for (const row of data) {
    const openTimeMs = Number(row[0]);
    const close = Number(row[4]);
    if (!Number.isFinite(openTimeMs) || !Number.isFinite(close) || close <= 0) continue;
    out.push({ timestamp: new Date(openTimeMs).toISOString(), close });
  }
  return out;
}

async function fetchCoinbaseDailyClosesUsd(
  sym: string,
  days: number,
): Promise<Array<{ timestamp: string; close: number }>> {
  const productId = toCoinbaseProduct(sym);
  const nowMs = Date.now();
  const startMs = nowMs - Math.max(1, Math.floor(days)) * 24 * 60 * 60_000;
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(nowMs).toISOString();
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(
    productId,
  )}/candles?granularity=86400&start=${encodeURIComponent(
    startIso,
  )}&end=${encodeURIComponent(endIso)}`;
  const data = await fetchJson<Array<[number, number, number, number, number]>>(url);
  const rows = data
    .map((r) => {
      const timeS = Number(r[0]);
      const close = Number(r[4]);
      if (!Number.isFinite(timeS) || !Number.isFinite(close) || close <= 0) return null;
      return { timestamp: new Date(timeS * 1000).toISOString(), close };
    })
    .filter(Boolean) as Array<{ timestamp: string; close: number }>;
  rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return rows;
}

function getDexRpcUrl(explicitRpcUrl?: string | null) {
  const raw =
    (explicitRpcUrl ?? '').trim() ||
    env.INSIGHT_RPC_URL ||
    env.POLYGON_AMOY_RPC_URL ||
    env.POLYGON_RPC_URL ||
    env.ARBITRUM_RPC_URL ||
    env.OPTIMISM_RPC_URL ||
    '';
  const urls = raw ? parseRpcUrls(raw) : [];
  return urls[0] ?? raw;
}

function divFloor(a: bigint, b: bigint) {
  if (b === 0n) throw new Error('div_by_zero');
  let q = a / b;
  const r = a % b;
  if (r !== 0n && a < 0n !== b < 0n) q -= 1n;
  return q;
}

function clampTick(tick: bigint) {
  const min = -887272n;
  const max = 887272n;
  if (tick < min) return min;
  if (tick > max) return max;
  return tick;
}

const poolAbi = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
]);

const erc20Abi = parseAbi(['function decimals() view returns (uint8)']);

async function fetchDexTwapPriceUsdUncached(
  input: { rpcUrl?: string | null } = {},
): Promise<number | null> {
  const pool = (env.INSIGHT_DEX_TWAP_POOL || '').trim();
  if (!pool) return null;

  const secondsRaw = Number(env.INSIGHT_DEX_TWAP_SECONDS || 1800);
  const seconds = Number.isFinite(secondsRaw)
    ? Math.min(7 * 24 * 3600, Math.max(60, Math.floor(secondsRaw)))
    : 1800;

  const invert = env.INSIGHT_DEX_PRICE_INVERT;

  const rpcUrl = getDexRpcUrl(input.rpcUrl);
  if (!rpcUrl) return null;

  try {
    const client = createPublicClient({
      transport: http(rpcUrl, { timeout: getDependencyTimeoutMs() }),
    });

    const poolKey = `${pool.toLowerCase()}`;
    // P1 优化：使用 LRU 缓存的 get 方法
    const cachedMeta = poolMetaCache.get(poolKey);

    const meta =
      cachedMeta ??
      (await (async () => {
        const [token0, token1] = await Promise.all([
          client.readContract({
            address: pool as `0x${string}`,
            abi: poolAbi,
            functionName: 'token0',
            args: [],
          }) as Promise<`0x${string}`>,
          client.readContract({
            address: pool as `0x${string}`,
            abi: poolAbi,
            functionName: 'token1',
            args: [],
          }) as Promise<`0x${string}`>,
        ]);

        const [dec0, dec1] = await Promise.all([
          client.readContract({
            address: token0,
            abi: erc20Abi,
            functionName: 'decimals',
            args: [],
          }) as Promise<number>,
          client.readContract({
            address: token1,
            abi: erc20Abi,
            functionName: 'decimals',
            args: [],
          }) as Promise<number>,
        ]);

        const m: PoolMeta = {
          token0,
          token1,
          dec0: Number(dec0),
          dec1: Number(dec1),
        };
        // P1 优化：使用 LRU 缓存的 set 方法
        poolMetaCache.set(poolKey, m, POOL_META_CACHE_TTL_MS);
        return m;
      })());

    const [tickCumulatives] = (await client.readContract({
      address: pool as `0x${string}`,
      abi: poolAbi,
      functionName: 'observe',
      args: [[seconds, 0]],
    })) as [bigint[], bigint[]];

    // 检查数组长度和元素存在性
    if (!Array.isArray(tickCumulatives) || tickCumulatives.length < 2) {
      logger.error('Invalid tickCumulatives response', { tickCumulatives });
      return null;
    }

    const c0 = tickCumulatives[0];
    const c1 = tickCumulatives[1];
    if (c0 === undefined || c1 === undefined) return null;
    const avgTickBig = clampTick(divFloor(c1 - c0, BigInt(seconds)));
    const avgTick = Number(avgTickBig);
    if (!Number.isFinite(avgTick)) return null;

    const priceBase = Math.exp(avgTick * Math.log(1.0001));
    const scale = 10 ** (meta.dec0 - meta.dec1);
    const price = priceBase * scale;
    if (!Number.isFinite(price) || price <= 0) return null;
    const out = invert ? 1 / price : price;
    return Number.isFinite(out) && out > 0 ? out : null;
  } catch {
    return null;
  }
}

async function fetchDexTwapPriceUsdCached(
  input: { rpcUrl?: string | null } = {},
): Promise<number | null> {
  const pool = env.INSIGHT_DEX_TWAP_POOL;
  if (!pool) return null;
  const seconds = env.INSIGHT_DEX_TWAP_SECONDS;
  const invert = env.INSIGHT_DEX_PRICE_INVERT;
  const rpcUrl = getDexRpcUrl(input.rpcUrl);
  const key = `dex:${pool.toLowerCase()}:${Math.floor(
    Number.isFinite(seconds) ? seconds : 1800,
  )}:${invert ? '1' : '0'}:${rpcUrl || ''}`;

  // P1 优化：使用 LRU 缓存的 get 方法
  const hit = dexCache.get(key);
  if (hit !== null) return hit;

  const existing = dexInflight.get(key);
  if (existing) return existing;
  const p = fetchDexTwapPriceUsdUncached(input)
    .then((v) => {
      // P1 优化：使用 LRU 缓存的 set 方法
      dexCache.set(key, v, DEX_TWAP_CACHE_TTL_MS);
      return v;
    })
    .finally(() => {
      dexInflight.delete(key);
    });
  dexInflight.set(key, p);
  return p;
}

function syntheticSpotUsd(sym: string) {
  const symbol = normalizeSymbol(sym);
  const basePrice = (SYNTHETIC_PRICES[symbol] ?? SYNTHETIC_PRICES.DEFAULT) as number;
  const time = Date.now();
  const trend = Math.sin(time / SYNTHETIC_TREND_PERIOD_MS) * (basePrice * SYNTHETIC_TREND_AMPLITUDE);
  const noise = (secureRandom() - 0.5) * (basePrice * SYNTHETIC_NOISE_AMPLITUDE);
  const refPrice = basePrice + trend + noise;
  return Number(refPrice.toFixed(2));
}

function generateMockHistory(symbol: string, safeDays: number): PricePoint[] {
  const points: PricePoint[] = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  const sym = normalizeSymbol(symbol);
  const basePrice = (SYNTHETIC_PRICES[sym] ?? SYNTHETIC_PRICES.DEFAULT) as number;

  // 预计算常量，避免在循环中重复计算
  const trendAmplitude = basePrice * SYNTHETIC_TREND_AMPLITUDE;
  const noiseAmplitude = basePrice * SYNTHETIC_NOISE_AMPLITUDE;
  const oracleNoiseAmplitude = basePrice * 0.01;
  const deviationThreshold = 0.9;
  const deviationEventAmplitude = basePrice * 0.03;

  for (let i = safeDays; i >= 0; i--) {
    const time = now - i * msPerDay;
    const date = new Date(time).toISOString();
    const trend = Math.sin(time / (msPerDay * 7)) * trendAmplitude;
    const noise = (secureRandom() - 0.5) * noiseAmplitude;
    const refPrice = basePrice + trend + noise;
    const deviationEvent = secureRandom() > deviationThreshold ? deviationEventAmplitude : 0;
    const oraclePrice = refPrice + (secureRandom() - 0.5) * oracleNoiseAmplitude + deviationEvent;
    const deviation = Math.abs(oraclePrice - refPrice) / refPrice;

    points.push({
      timestamp: date,
      oraclePrice: Number(oraclePrice.toFixed(2)),
      referencePrice: Number(refPrice.toFixed(2)),
      deviation: Number(deviation.toFixed(4)),
    });
  }

  return points;
}

export async function fetchReferencePriceHistory(
  symbol: string = 'ETH',
  days: number = 30,
  opts?: { rpcUrl?: string | null },
): Promise<PricePoint[]> {
  const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
  const provider = (env.INSIGHT_REFERENCE_PRICE_PROVIDER || 'mock').trim().toLowerCase();

  if (provider !== 'mock') {
    let closes: Array<{ timestamp: string; close: number }> | null = null;
    try {
      closes =
        provider === 'binance'
          ? await fetchBinanceDailyClosesUsd(symbol, safeDays)
          : await fetchCoinbaseDailyClosesUsd(symbol, safeDays);
    } catch {
      try {
        closes =
          provider === 'binance'
            ? await fetchCoinbaseDailyClosesUsd(symbol, safeDays)
            : await fetchBinanceDailyClosesUsd(symbol, safeDays);
      } catch {
        closes = null;
      }
    }

    const normalizedSymbol = normalizeSymbol(symbol);
    if (!closes || closes.length === 0) {
      const msPerDay = 24 * 60 * 60_000;
      const nowMs = Date.now();
      const last = lastGoodSpot.get(normalizedSymbol);
      const basePrice =
        last && nowMs - last.atMs <= LAST_GOOD_SPOT_MAX_AGE_MS
          ? last.price
          : (fallbackSpotUsd(normalizedSymbol) ?? 0);
      const points: PricePoint[] = [];
      for (let i = safeDays; i >= 0; i -= 1) {
        const at = new Date(nowMs - i * msPerDay).toISOString();
        points.push({
          timestamp: at,
          oraclePrice: Number(basePrice.toFixed(6)),
          referencePrice: Number(basePrice.toFixed(6)),
          deviation: 0,
        });
      }
      return points;
    }

    const { referencePrice, oraclePrice } = await fetchCurrentPrice(symbol, {
      rpcUrl: opts?.rpcUrl ?? null,
    });
    const ratio = referencePrice > 0 && oraclePrice > 0 ? oraclePrice / referencePrice : 1;
    const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;

    return closes.map((c) => {
      const ref = c.close;
      const ora = ref * safeRatio;
      const dev = ref > 0 ? Math.abs(ora - ref) / ref : 0;
      return {
        timestamp: c.timestamp,
        oraclePrice: Number(ora.toFixed(6)),
        referencePrice: Number(ref.toFixed(6)),
        deviation: Number(dev.toFixed(6)),
      };
    });
  }

  return generateMockHistory(symbol, safeDays);
}

/**
 * Fetches the current reference price and oracle price (simulated).
 * Used for real-time monitoring and alerting.
 */
export async function fetchCurrentPrice(
  symbol: string = 'ETH',
  opts?: { rpcUrl?: string | null },
): Promise<{ referencePrice: number; oraclePrice: number }> {
  const provider = (env.INSIGHT_REFERENCE_PRICE_PROVIDER || 'mock').trim().toLowerCase();

  if (provider !== 'mock') {
    const normalizedSymbol = normalizeSymbol(symbol);
    const preferred = provider === 'binance' ? 'binance' : 'coinbase';

    let referencePrice: number | null = null;
    try {
      referencePrice = await fetchSpotUsdResilient(normalizedSymbol, preferred);
    } catch {
      referencePrice = null;
    }

    const dex = await fetchDexTwapPriceUsdCached({
      rpcUrl: opts?.rpcUrl ?? null,
    });
    const nowMs = Date.now();
    if (dex !== null) {
      // P1 优化：限制 lastGoodDex 大小
      if (lastGoodDex.size >= MAX_LAST_GOOD_SIZE) {
        const oldestKey = lastGoodDex.keys().next().value;
        if (oldestKey) {
          lastGoodDex.delete(oldestKey);
        }
      }
      lastGoodDex.set(normalizedSymbol, { price: dex, atMs: nowMs });
    }

    const lastSpot = lastGoodSpot.get(normalizedSymbol);
    const lastDex = lastGoodDex.get(normalizedSymbol);

    const lastSpotPrice =
      lastSpot && nowMs - lastSpot.atMs <= LAST_GOOD_SPOT_MAX_AGE_MS ? lastSpot.price : null;
    const lastDexPrice =
      lastDex && nowMs - lastDex.atMs <= LAST_GOOD_DEX_MAX_AGE_MS ? lastDex.price : null;
    const fallback = fallbackSpotUsd(normalizedSymbol);

    const resolvedReference =
      referencePrice ?? dex ?? lastSpotPrice ?? lastDexPrice ?? fallback ?? 0;
    const resolvedOracle = dex ?? lastDexPrice ?? referencePrice ?? lastSpotPrice ?? fallback ?? 0;

    return {
      referencePrice: Number(resolvedReference.toFixed(6)),
      oraclePrice: Number(resolvedOracle.toFixed(6)),
    };
  }

  const refPrice = syntheticSpotUsd(symbol);
  const basePrice =
    normalizeSymbol(symbol) === 'BTC' ? 65000 : normalizeSymbol(symbol) === 'ETH' ? 3500 : 100;
  const deviationEvent = secureRandom() > 0.9 ? basePrice * 0.03 : 0;
  const oraclePrice = refPrice + (secureRandom() - 0.5) * (basePrice * 0.01) + deviationEvent;
  return {
    referencePrice: refPrice,
    oraclePrice: Number(oraclePrice.toFixed(2)),
  };
}

// P2 优化：批量价格获取接口
export async function fetchCurrentPricesBatch(
  symbols: string[],
  opts?: { rpcUrl?: string | null },
): Promise<Map<string, { referencePrice: number; oraclePrice: number }>> {
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => ({
      symbol,
      price: await fetchCurrentPrice(symbol, opts),
    })),
  );

  const priceMap = new Map<string, { referencePrice: number; oraclePrice: number }>();
  symbols.forEach((symbol, idx) => {
    const result = results[idx];
    if (result && result.status === 'fulfilled') {
      priceMap.set(
        symbol,
        (
          result as PromiseFulfilledResult<{
            symbol: string;
            price: { referencePrice: number; oraclePrice: number };
          }>
        ).value.price,
      );
    }
  });
  return priceMap;
}

export function calculateHealthScore(points: PricePoint[]): number {
  if (points.length === 0) return 100;

  // Calculate average deviation
  const avgDeviation = points.reduce((sum, p) => sum + p.deviation, 0) / points.length;

  // Score formula: Start at 100.
  // Deduct 1 point for every 0.1% average deviation.
  // So 1% avg deviation = -10 points.
  const deviationPenalty = avgDeviation * 1000 * 1;

  // Cap penalty
  const score = Math.max(0, Math.min(100, 100 - deviationPenalty));

  return Math.round(score);
}
