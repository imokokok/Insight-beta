export async function fetchDashboardStats(): Promise<unknown> {
  const response = await fetch('/api/metrics');
  return response.json();
}

export async function fetchHealthStatus(): Promise<unknown> {
  const response = await fetch('/api/health');
  return response.json();
}
