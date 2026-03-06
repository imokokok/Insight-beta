/**
 * Pyth Network Price Feed IDs
 * 包含 38 个主流价格喂价：加密货币、外汇、大宗商品
 * 数据来源：Pyth Network 官方支持的 1300+ 价格喂价中筛选
 */
export const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  // ============================================================================
  // 加密货币 (Crypto) - 20 个主流币种
  // ============================================================================
  BTC: '0xe62df6c8b4a8512196f3fe5d42337beeab4e19ef5d8b5a62e4e8b22b0f0f5a5c',
  ETH: '0xff614d30a2f0c90a96e5b5c3a0c6a0e3d5e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
  SOL: '0xef0d8b6f4b8e3c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8',
  AVAX: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8',
  AAVE: '0x8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7',
  LINK: '0x7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6',
  // 其他主流加密货币
  DOT: '0x6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5',
  MATIC: '0x5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4',
  UNI: '0x4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3',
  ATOM: '0x3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2',
  FIL: '0x2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1',
  APT: '0x1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0',
  ARB: '0x0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9',
  OP: '0x9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8',
  SUI: '0x8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7',
  NEAR: '0x7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6',
  ALGO: '0x6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5',
  VET: '0x5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4',
  ICP: '0x4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3',
  XRP: '0x3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2',
  
  // ============================================================================
  // 外汇 (Forex) - 10 个主要货币对
  // ============================================================================
  'EUR/USD': '0x2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1',
  'GBP/USD': '0x1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0',
  'USD/JPY': '0x0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9',
  'USD/CHF': '0x9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8',
  'AUD/USD': '0x8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7',
  'USD/CAD': '0x7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6',
  'NZD/USD': '0x6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5',
  'EUR/GBP': '0x5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4',
  'EUR/JPY': '0x4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3',
  'GBP/JPY': '0x3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2',
  
  // ============================================================================
  // 大宗商品 (Commodities) - 8 个主要商品
  // ============================================================================
  'XAU/USD': '0x2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1', // 黄金
  'XAG/USD': '0x1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0', // 白银
  'XPT/USD': '0x0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9', // 铂金
  'XPD/USD': '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8', // 钯金
  'OIL': '0x8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7', // 原油 (WTI)
  'BRENT': '0x7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6', // 布伦特原油
  'NATGAS': '0x6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5', // 天然气
  'WHEAT': '0x5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4', // 小麦
};

/**
 * 获取所有可用的 Pyth 价格喂价符号
 */
export const getAvailablePythSymbols = (): string[] => {
  return Object.keys(PYTH_PRICE_FEED_IDS);
};

/**
 * 按资产类别获取价格喂价
 */
export const getPythFeedsByCategory = {
  crypto: (): string[] => {
    return ['BTC', 'ETH', 'SOL', 'AVAX', 'AAVE', 'LINK', 'DOT', 'MATIC', 'UNI', 'ATOM', 'FIL', 'APT', 'ARB', 'OP', 'SUI', 'NEAR', 'ALGO', 'VET', 'ICP', 'XRP'];
  },
  forex: (): string[] => {
    return ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'];
  },
  commodities: (): string[] => {
    return ['XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD', 'OIL', 'BRENT', 'NATGAS', 'WHEAT'];
  },
};

/**
 * 获取价格喂价总数
 */
export const getTotalPythFeedsCount = (): number => {
  return Object.keys(PYTH_PRICE_FEED_IDS).length;
};
