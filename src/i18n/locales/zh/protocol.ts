export const protocol = {
  // 协议状态
  status: {
    healthy: '健康',
    degraded: '降级',
    down: '宕机',
    active: '活跃',
    stale: '陈旧',
    error: '错误',
  },

  // 健康评分
  health: {
    excellent: '优秀',
    excellentDesc: '协议运行状况极佳，各项指标均达到优秀水平',
    good: '良好',
    goodDesc: '协议运行状况良好，大部分指标正常',
    fair: '一般',
    fairDesc: '协议运行状况一般，部分指标需要关注',
    poor: '较差',
    poorDesc: '协议运行状况较差，建议立即检查',
  },

  // 指标
  metrics: {
    latency: '延迟',
    accuracy: '准确性',
    uptime: '在线率',
    feeds: '喂价',
    avgUpdateTime: '平均更新时间',
    priceDeviation: '价格偏差',
    availability: '可用性',
    of: '共',
  },

  // 资产对
  assetPairs: '资产对',
  pair: '交易对',
  price: '价格',
  deviation: '偏离',
  trend: '趋势',
  lastUpdate: '最后更新',
  pairStatus: {
    active: '活跃',
    stale: '陈旧',
    error: '错误',
  },
  searchPairs: '搜索资产对...',
  noPairsFound: '未找到匹配的资产对',

  // 性能图表
  performance: {
    title: '历史性能',
    noData: '暂无性能数据',
    accuracy: '准确性',
    latency: '延迟',
    uptime: '在线率',
    avgAccuracy: '平均准确性',
    avgLatency: '平均延迟',
    avgUptime: '平均在线率',
  },

  // 告警
  alerts: {
    title: '告警中心',
    all: '全部',
    unacknowledged: '未确认',
    acknowledge: '确认',
    noAlerts: '暂无告警',
  },
  alertLevel: {
    critical: '严重',
    high: '高危',
    medium: '中危',
    low: '低危',
    info: '信息',
  },

  // 协议对比
  comparison: {
    title: '协议对比',
    best: '最佳',
    top: 'TOP',
    protocol: '协议',
    healthScore: '健康评分',
    latency: '延迟',
    accuracy: '准确性',
    uptime: '在线率',
    actions: '操作',
    feeds: '喂价',
    chains: '链',
    tvl: 'TVL',
    marketShare: '市场份额',
    features: '特性',
  },

  // 节点分布
  nodeDistribution: {
    title: '节点分布',
    totalNodes: '总节点',
    healthy: '健康',
    avgLatency: '平均延迟',
    healthyNodes: '健康节点',
    health: '健康度',
  },

  // 实时价格流
  priceStream: {
    title: '实时价格流',
    updates: '更新',
    noUpdates: '暂无价格更新',
    avgChange: '平均变化',
    up: '上涨',
    down: '下跌',
  },

  // 数据新鲜度
  freshness: {
    fresh: '新鲜',
    freshDesc: '数据刚刚更新',
    warning: '警告',
    warningDesc: '数据有些陈旧',
    stale: '陈旧',
    staleDesc: '数据已过期',
    expired: '失效',
    expiredDesc: '数据已失效',
  },

  // 套利机会
  arbitrage: {
    title: '套利机会',
    totalProfit: '总利润',
    avgSpread: '平均价差',
    noOpportunities: '暂无套利机会',
    riskLow: '低风险',
    riskMedium: '中风险',
    riskHigh: '高风险',
    buy: '买入',
    sell: '卖出',
    estimatedProfit: '预估利润',
    execute: '执行',
    highRiskWarning: '高风险：价格波动可能很快，请谨慎操作',
  },

  // 风险评分
  risk: {
    title: '风险评分',
    low: '低风险',
    lowDesc: '协议风险较低，运行稳定',
    medium: '中等风险',
    mediumDesc: '协议存在一定风险，需要关注',
    high: '高风险',
    highDesc: '协议风险较高，建议谨慎使用',
    critical: '严重风险',
    criticalDesc: '协议存在严重风险，建议立即检查',
    noData: '暂无风险数据',
    lastAssessment: '最后评估',
    improving: '改善中',
    stable: '稳定',
    worsening: '恶化中',
    factors: '风险因素',
    lowRisk: '低风险',
    highRisk: '高风险',
  },

  // 通用
  noData: '暂无数据',
  visitWebsite: '访问官网',
  activeFeeds: '活跃喂价',
  supportedChains: '支持链',
  marketShare: '市场份额',
  submitReview: '提交审核',
  reviewNotes: '审核备注',
};
