export async function fetchMarketOverview(): Promise<unknown> {
  const response = await fetch('/api/explore/market-overview');
  return response.json();
}

export async function searchFeeds(query: string): Promise<unknown[]> {
  const response = await fetch(`/api/explore/search?q=${encodeURIComponent(query)}`);
  return response.json();
}

export async function fetchTrendingFeeds(): Promise<unknown[]> {
  const response = await fetch('/api/explore/trending');
  return response.json();
}
