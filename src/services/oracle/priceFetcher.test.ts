import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('priceFetcher fetchCurrentPrice', () => {
  it('falls back to deterministic defaults when providers are unavailable', async () => {
    vi.stubEnv('INSIGHT_REFERENCE_PRICE_PROVIDER', 'binance');
    vi.stubEnv('INSIGHT_DEX_TWAP_POOL', '');
    vi.stubEnv('INSIGHT_DEX_TWAP_RPC_URL', '');
    vi.stubEnv('INSIGHT_FALLBACK_ETH_PRICE', '3500');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed');
      }),
    );

    const mod = await import('@/features/oracle/services/priceFetcher');
    const out = await mod.fetchCurrentPrice('ETH');
    expect(out.referencePrice).toBe(3500);
    expect(out.oraclePrice).toBe(3500);
  });
});
