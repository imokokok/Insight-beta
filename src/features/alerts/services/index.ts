export async function fetchAlerts(): Promise<unknown> {
  const response = await fetch('/api/alerts');
  return response.json();
}
