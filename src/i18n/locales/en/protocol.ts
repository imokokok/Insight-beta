export const protocol = {
  // Protocol Status
  status: {
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',
    active: 'Active',
    stale: 'Stale',
    error: 'Error',
  },

  // Health Score
  health: {
    excellent: 'Excellent',
    excellentDesc: 'Protocol is performing excellently with all metrics at optimal levels',
    good: 'Good',
    goodDesc: 'Protocol is performing well with most metrics normal',
    fair: 'Fair',
    fairDesc: 'Protocol performance is average, some metrics need attention',
    poor: 'Poor',
    poorDesc: 'Protocol performance is poor, immediate inspection recommended',
  },

  // Metrics
  metrics: {
    latency: 'Latency',
    accuracy: 'Accuracy',
    uptime: 'Uptime',
    feeds: 'Feeds',
    avgUpdateTime: 'Avg Update Time',
    priceDeviation: 'Price Deviation',
    availability: 'Availability',
    of: 'of',
  },

  // Asset Pairs
  assetPairs: 'Asset Pairs',
  pair: 'Pair',
  price: 'Price',
  deviation: 'Deviation',
  trend: 'Trend',
  lastUpdate: 'Last Update',
  pairStatus: {
    active: 'Active',
    stale: 'Stale',
    error: 'Error',
  },
  searchPairs: 'Search asset pairs...',
  noPairsFound: 'No matching asset pairs found',

  // Performance Chart
  performance: {
    title: 'Performance History',
    noData: 'No performance data available',
    accuracy: 'Accuracy',
    latency: 'Latency',
    uptime: 'Uptime',
    avgAccuracy: 'Avg Accuracy',
    avgLatency: 'Avg Latency',
    avgUptime: 'Avg Uptime',
  },

  // Alerts
  alerts: {
    title: 'Alert Center',
    all: 'All',
    unacknowledged: 'Unacknowledged',
    acknowledge: 'Acknowledge',
    noAlerts: 'No alerts',
  },
  alertLevel: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Info',
  },

  // Protocol Comparison
  comparison: {
    title: 'Protocol Comparison',
    best: 'Best',
    top: 'TOP',
    protocol: 'Protocol',
    healthScore: 'Health Score',
    latency: 'Latency',
    accuracy: 'Accuracy',
    uptime: 'Uptime',
    actions: 'Actions',
    feeds: 'Feeds',
    chains: 'Chains',
    tvl: 'TVL',
    marketShare: 'Market Share',
    features: 'Features',
  },

  // Node Distribution
  nodeDistribution: {
    title: 'Node Distribution',
    totalNodes: 'Total Nodes',
    healthy: 'Healthy',
    avgLatency: 'Avg Latency',
    healthyNodes: 'Healthy Nodes',
    health: 'Health',
  },

  // Real-time Price Stream
  priceStream: {
    title: 'Real-time Price Stream',
    updates: 'Updates',
    noUpdates: 'No price updates',
    avgChange: 'Avg Change',
    up: 'Up',
    down: 'Down',
  },

  // Data Freshness
  freshness: {
    fresh: 'Fresh',
    freshDesc: 'Data just updated',
    warning: 'Warning',
    warningDesc: 'Data is somewhat stale',
    stale: 'Stale',
    staleDesc: 'Data is outdated',
    expired: 'Expired',
    expiredDesc: 'Data has expired',
  },

  // Arbitrage Opportunities
  arbitrage: {
    title: 'Arbitrage Opportunities',
    totalProfit: 'Total Profit',
    avgSpread: 'Avg Spread',
    noOpportunities: 'No arbitrage opportunities',
    riskLow: 'Low Risk',
    riskMedium: 'Medium Risk',
    riskHigh: 'High Risk',
    buy: 'Buy',
    sell: 'Sell',
    estimatedProfit: 'Est. Profit',
    execute: 'Execute',
    highRiskWarning: 'High risk: Price volatility may be high, proceed with caution',
  },

  // Risk Score
  risk: {
    title: 'Risk Score',
    low: 'Low Risk',
    lowDesc: 'Protocol has low risk and is running stably',
    medium: 'Medium Risk',
    mediumDesc: 'Protocol has some risks that need attention',
    high: 'High Risk',
    highDesc: 'Protocol has high risk, use with caution',
    critical: 'Critical Risk',
    criticalDesc: 'Protocol has critical risk, immediate inspection recommended',
    noData: 'No risk data available',
    lastAssessment: 'Last Assessment',
    improving: 'Improving',
    stable: 'Stable',
    worsening: 'Worsening',
    factors: 'Risk Factors',
    lowRisk: 'Low Risk',
    highRisk: 'High Risk',
  },

  // Common
  noData: 'No data available',
  visitWebsite: 'Visit Website',
  activeFeeds: 'Active Feeds',
  supportedChains: 'Supported Chains',
  marketShare: 'Market Share',
  submitReview: 'Submit Review',
  reviewNotes: 'Review Notes',
};
