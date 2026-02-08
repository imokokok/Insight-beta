export const sla = {
  title: 'SLA Monitoring Dashboard',
  description: 'Service Level Agreement compliance monitoring for oracle protocols',
  subtitle: 'Service Level Agreement Monitoring',
  refresh: 'Refresh',
  reports: {
    title: 'Protocol SLA Reports',
    noData: 'No SLA data available',
  },
  stats: {
    overallCompliance: 'Overall Compliance',
    compliantProtocols: 'Compliant Protocols',
    totalProtocols: 'Total {{count}} protocols',
    atRiskProtocols: 'At Risk Protocols',
    needsAttention: 'Needs attention',
    breachedProtocols: 'Breached Protocols',
    slaBreached: 'SLA breached',
  },
  status: {
    compliant: 'Compliant',
    at_risk: 'At Risk',
    breached: 'Breached',
  },
  metrics: {
    uptime: 'Uptime',
    avgLatency: 'Avg Latency',
    accuracy: 'Accuracy',
    availability: 'Availability',
  },
  targets: {
    uptime: '99.9%',
    latency: '<500ms',
    accuracy: '99.5%',
    availability: '99.9%',
  },
  labels: {
    slaCompliance: 'SLA Compliance',
  },
};
