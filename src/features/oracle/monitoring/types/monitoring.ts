export interface MonitoringNode {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  latency: number;
  lastHeartbeat: string;
}

export interface MonitoringStats {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  avgLatency: number;
  avgUptime: number;
}

export interface MonitoringReport {
  generatedAt: string;
  stats: MonitoringStats;
  nodes: MonitoringNode[];
}
