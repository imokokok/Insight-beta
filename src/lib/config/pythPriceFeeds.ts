/**
 * Pyth Network Price Feed IDs
 *
 * 统一的价格喂价 ID 配置
 * 用于所有 Pyth 相关服务（主应用和微服务）
 */

// ============================================================================
// EVM 链价格喂价 IDs (32字节 hex 格式)
// ============================================================================

export const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  // 主流加密货币
  'BTC/USD': '0xe62df6c8b4a85fe1f67dab44abcabdeb54c0f983b2d28b4583c5d9483c324d5b',
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'AVAX/USD': '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'BNB/USD': '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',

  // Layer 2 代币
  'ARB/USD': '0x3fa4252848f9f0a1450fbbf400fc13e3461d0919e0aaaf49facf448471fd3ce4',
  'OP/USD': '0x385e76cc5f875b51cf3554064d092f422d62b4755e385b5e6219d8a5b1cc1c3c',
  'BASE/USD': '0x0e9ec6a9de8e4c7c3caeb3c8f87eeb5b7e2e7e3f3e3e3e3e3e3e3e3e3e3e3e3e', // 示例

  // DeFi 代币
  'LINK/USD': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433617cbb900000000000000000000',
  'UNI/USD': '0x78d185a741d07edb3412b120000000000000000000000000000000000000000',
  'AAVE/USD': '0x2b9ab1e972000000000000000000000000000000000000000000000000000000',
  'CRV/USD': '0x5dbbdb28d1e0b1a0000000000000000000000000000000000000000000000000',
  'SNX/USD': '0x39d020f000000000000000000000000000000000000000000000000000000000',
  'COMP/USD': '0x4a8e0c8d6c9e5f00000000000000000000000000000000000000000000000000',
  'MKR/USD': '0x3a810ff000000000000000000000000000000000000000000000000000000000',
  'YFI/USD': '0x2d5a570000000000000000000000000000000000000000000000000000000000',
  '1INCH/USD': '0x2495a3b000000000000000000000000000000000000000000000000000000000',
  'SUSHI/USD': '0x26b3800000000000000000000000000000000000000000000000000000000000',

  // 稳定币
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'DAI/USD': '0x87c5ccb6f4d1f7a0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e', // 示例
};

// ============================================================================
// Solana 链价格喂价 IDs (Base58 格式)
// 用于 Solana 原生 Pyth 客户端
// ============================================================================

export const PYTH_SOLANA_PRICE_FEED_IDS: Record<string, string> = {
  'BTC/USD': 'GVXRSBjFk6e6J3NbVPXohRJetcUXxt93nkhU233t2Jnp',
  'ETH/USD': 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB',
  'SOL/USD': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712k4LcF21',
  'AVAX/USD': 'FVb5h1VmHPfVb1RfqZckchq18GxRv4iKt8T4eVTQAqdz',
  'ARB/USD': '4mRGHzjGnQNKeCbWdmytccPYyxyGoJtZWSrVfPFa9D6f',
  'MATIC/USD': '7j1y5d7f8g9h0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5',
  'BNB/USD': '8k2z6e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h',
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取价格喂价 ID
 * @param symbol 交易对符号 (如 'BTC/USD')
 * @param useSolanaIds 是否使用 Solana 格式 IDs
 * @returns 价格喂价 ID 或 undefined
 */
export function getPriceFeedId(symbol: string, useSolanaIds = false): string | undefined {
  const ids = useSolanaIds ? PYTH_SOLANA_PRICE_FEED_IDS : PYTH_PRICE_FEED_IDS;
  return ids[symbol];
}

/**
 * 获取所有可用的价格符号
 * @param useSolanaIds 是否使用 Solana 格式 IDs
 * @returns 符号数组
 */
export function getAvailablePythSymbols(useSolanaIds = false): string[] {
  const ids = useSolanaIds ? PYTH_SOLANA_PRICE_FEED_IDS : PYTH_PRICE_FEED_IDS;
  return Object.keys(ids);
}

/**
 * 检查符号是否支持
 * @param symbol 交易对符号
 * @param useSolanaIds 是否使用 Solana 格式 IDs
 * @returns 是否支持
 */
export function isSymbolSupported(symbol: string, useSolanaIds = false): boolean {
  const ids = useSolanaIds ? PYTH_SOLANA_PRICE_FEED_IDS : PYTH_PRICE_FEED_IDS;
  return symbol in ids;
}

/**
 * 根据价格 ID 查找对应的符号
 * @param priceId 价格喂价 ID
 * @param useSolanaIds 是否使用 Solana 格式 IDs
 * @returns 符号或 undefined
 */
export function getSymbolByPriceId(priceId: string, useSolanaIds = false): string | undefined {
  const ids = useSolanaIds ? PYTH_SOLANA_PRICE_FEED_IDS : PYTH_PRICE_FEED_IDS;
  return Object.entries(ids).find(([_, id]) => id.toLowerCase() === priceId.toLowerCase())?.[0];
}

/**
 * 获取价格喂价 IDs 映射
 * @param symbols 交易对符号数组
 * @param useSolanaIds 是否使用 Solana 格式 IDs
 * @returns 符号到 ID 的映射
 */
export function getPriceFeedIdsForSymbols(
  symbols: string[],
  useSolanaIds = false,
): Record<string, string> {
  const ids = useSolanaIds ? PYTH_SOLANA_PRICE_FEED_IDS : PYTH_PRICE_FEED_IDS;
  const result: Record<string, string> = {};

  for (const symbol of symbols) {
    if (ids[symbol]) {
      result[symbol] = ids[symbol];
    }
  }

  return result;
}

/**
 * 合并自定义价格 IDs
 * @param customIds 自定义价格 IDs
 * @param useSolanaIds 是否使用 Solana 格式 IDs
 * @returns 合并后的 IDs
 */
export function mergePriceFeedIds(
  customIds?: Record<string, string>,
  useSolanaIds = false,
): Record<string, string> {
  const baseIds = useSolanaIds ? PYTH_SOLANA_PRICE_FEED_IDS : PYTH_PRICE_FEED_IDS;
  return { ...baseIds, ...customIds };
}
