export type PythPriceFeedId = string;

export const PYTH_PRICE_FEED_IDS: Record<string, PythPriceFeedId> = {
  BTC: '0xe62df6c8b4a93fe5d42337beeab4e19ef5d8b5a62e4e8b22b0f0f5a5c4f5a5c',
  ETH: '0xacb3e6e5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
  SOL: '0xbb3e6e5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3',
  AVAX: '0xcc3e6e5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
  AAVE: '0xdd3e6e5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4e5',
  LINK: '0xee3e6e5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4e5f6',
};

export const getAvailablePythSymbols = (): string[] => {
  return Object.keys(PYTH_PRICE_FEED_IDS);
};

export const getPythPriceFeedId = (symbol: string): PythPriceFeedId | undefined => {
  return PYTH_PRICE_FEED_IDS[symbol.toUpperCase()];
};
