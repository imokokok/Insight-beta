export async function fetchPriceComparison(symbol: string): Promise<unknown[]> {
  const response = await fetch(`/api/comparison/${symbol}/history`);
  return response.json();
}

export async function fetchComparisonHeatmap(): Promise<unknown> {
  const response = await fetch('/api/comparison/heatmap');
  return response.json();
}
