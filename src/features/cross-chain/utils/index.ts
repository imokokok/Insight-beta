export function formatChainName(chain: string): string {
  const chainNames: Record<string, string> = {
    ethereum: 'Ethereum',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    base: 'Base',
  };
  return chainNames[chain] || chain;
}

export function calculateArbitrageProfit(
  priceA: number,
  priceB: number,
  gasFee: number
): number {
  const priceDiff = Math.abs(priceA - priceB);
  return priceDiff - gasFee;
}
