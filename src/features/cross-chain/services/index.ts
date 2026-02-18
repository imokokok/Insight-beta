export async function fetchCrossChainComparison(): Promise<any[]> {
  const response = await fetch('/api/cross-chain/comparison');
  return response.json();
}

export async function fetchBridgeStatus(): Promise<any[]> {
  const response = await fetch('/api/cross-chain/bridges');
  return response.json();
}

export async function fetchArbitrageOpportunities(): Promise<any[]> {
  const response = await fetch('/api/cross-chain/arbitrage');
  return response.json();
}
