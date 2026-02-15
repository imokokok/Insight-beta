import type { ChartDataPoint, ComparisonDataPoint } from '../types/dashboard';

export const generateMockChartData = (points: number = 24): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp: time.toISOString(),
      value: Math.random() * 100 + 50,
      label: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  }
  return data;
};

export const generateMockComparisonData = (): ComparisonDataPoint[] => {
  const protocols = ['Chainlink', 'Pyth', 'RedStone', 'UMA'];
  return protocols.map((protocol) => ({
    label: protocol,
    latency: Math.random() * 500 + 200,
    accuracy: Math.random() * 5 + 95,
    uptime: Math.random() * 2 + 98,
  }));
};
