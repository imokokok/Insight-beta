export async function fetchCrossChainComparison(): Promise<unknown[]> {
  const response = await fetch('/api/cross-chain/comparison');
  return response.json();
}

export async function fetchBridgeStatus(): Promise<unknown[]> {
  const response = await fetch('/api/cross-chain/bridges');
  return response.json();
}

export async function fetchArbitrageOpportunities(): Promise<unknown[]> {
  const response = await fetch('/api/cross-chain/arbitrage');
  return response.json();
}
