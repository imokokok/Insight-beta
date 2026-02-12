/**
 * 监控 Dashboard 页面
 *
 * 展示系统监控状态和告警配置
 */

import { MonitoringDashboard } from '@/components/features/monitoring/MonitoringDashboard';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monitoring Dashboard | OracleMonitor',
  description: 'System monitoring and alert configuration',
};

export default function MonitoringPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Monitoring Dashboard</h1>
      <MonitoringDashboard />
    </div>
  );
}
