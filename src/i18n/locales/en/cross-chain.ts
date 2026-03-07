export const crossChain = {
  title: 'Cross-Chain Analysis',
  description:
    'Cross-chain bridge status, inter-chain price deviation and transaction volume analysis',
  controls: {
    symbol: 'Symbol',
    chains: 'Chains',
    timeRange: 'Time Range',
  },
  alerts: {
    title: 'Deviation Alerts',
  },
  table: {
    chain: 'Chain Name',
    price: 'Price',
    deviation: 'Deviation',
    status: 'Status',
    diffFromAvg: 'Diff from Average',
    deviationPercent: 'Deviation %',
    confidence: 'Confidence',
  },
  status: {
    normal: 'Normal',
    warning: 'Warning',
    critical: 'Critical',
    healthy: 'Healthy',
    degraded: 'Degraded',
    offline: 'Offline',
    stale: 'Stale',
    outlier: 'Outlier',
    available: 'Normal',
    unavailable: 'Unavailable',
    delayed: 'Delayed',
    active: 'Normal',
    inactive: 'Unavailable',
  },
  recommendation: {
    title: 'Recommendation',
    reliable: 'Most reliable: {{chain}}',
  },
  tooltip: {
    price: 'Price',
    deviation: 'Deviation',
    confidence: 'Confidence',
    updated: 'Updated',
  },
  lastUpdated: 'Last Updated',
  chainsMonitored: 'chains',
  priceStatus: {
    title: 'Price Status Overview',
  },
  monitoredChains: 'Monitored Chains',
  priceRange: 'Price Range',
  priceDetails: {
    title: 'Chain Price Details',
    description: 'Price data by chain, difference from average and update status',
  },
  summary: {
    title: 'Statistical Summary',
    description: 'Cross-chain price consistency analysis metrics',
  },
  goToCompare: 'Go to Oracle Comparison Hub',
  compareHint: 'Want to compare prices between different oracles?',
};
