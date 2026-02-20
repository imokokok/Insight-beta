export const security = {
  pageTitle: 'Security Dashboard',
  pageDescription: 'Analyze security alerts and anomaly detection',
  stats: {
    totalAlerts: 'Total Alerts',
    critical: 'Critical',
    active: 'Active',
    resolved: 'Resolved',
  },
  tabs: {
    overview: 'Overview',
    alerts: 'Alerts',
    trends: 'Trends',
  },
  cards: {
    alertTrend: 'Alert Trend',
    alertsOverTime: 'Alerts over time',
    recentAlerts: 'Recent Alerts',
    latestAlerts: 'Latest 5 alerts',
  },
  searchPlaceholder: 'Search alerts...',
  trendsComingSoon: 'Trends analysis coming soon',
  emptyStates: {
    systemSecure: 'System Secure',
    systemSecureDesc:
      'No suspicious activities detected. The system is actively monitoring and will alert you immediately when threats are identified.',
    allSystemsOperational: 'All systems operational',
    noAnomaliesDetected: 'No Anomalies Detected',
    noAnomaliesDesc:
      'ML models are actively monitoring price feeds. When anomalies are detected, they will appear here with detailed analysis and confidence scores.',
    allSystemsHealthy: 'All Systems Healthy',
    allSystemsHealthyDesc:
      'No active alerts at the moment. All oracle protocols are running normally. Configure alert rules to get notified of anomalies.',
    configureAlerts: 'Configure Alerts',
    everythingRunningSmoothly: 'Everything is running smoothly',
    systemRunningSmoothly: 'System running smoothly',
  },
};
