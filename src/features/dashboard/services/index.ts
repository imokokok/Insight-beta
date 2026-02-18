export async function fetchDashboardStats(): Promise<any> {
  const response = await fetch('/api/metrics');
  return response.json();
}

export async function fetchHealthStatus(): Promise<any> {
  const response = await fetch('/api/health');
  return response.json();
}
