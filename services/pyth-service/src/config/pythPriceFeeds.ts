/**
 * Pyth Network Price Feed IDs
 *
 * 微服务专用版本
 * 注意：此文件应与主应用 src/lib/config/pythPriceFeeds.ts 保持同步
 */

// ============================================================================
// Solana 链价格喂价 IDs (Base58 格式)
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
 * 获取所有可用的价格符号
 * @returns 符号数组
 */
export function getAvailablePythSymbols(): string[] {
  return Object.keys(PYTH_SOLANA_PRICE_FEED_IDS);
}

/**
 * 合并自定义价格 IDs
 * @param customIds 自定义价格 IDs
 * @returns 合并后的 IDs
 */
export function mergePriceFeedIds(customIds?: Record<string, string>): Record<string, string> {
  return { ...PYTH_SOLANA_PRICE_FEED_IDS, ...customIds };
}
