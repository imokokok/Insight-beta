export async function fetchAlerts(): Promise<any> {
  const response = await fetch('/api/alerts');
  return response.json();
}
