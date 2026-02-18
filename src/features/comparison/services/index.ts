export async function fetchPriceComparison(symbol: string): Promise<any[]> {
  const response = await fetch(`/api/comparison/${symbol}/history`);
  return response.json();
}

export async function fetchComparisonHeatmap(): Promise<any> {
  const response = await fetch('/api/comparison/heatmap');
  return response.json();
}
