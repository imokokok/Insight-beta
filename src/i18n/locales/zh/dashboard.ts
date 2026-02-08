export const dashboard = {
  // 布局
  layout: {
    title: '仪表盘',
    subtitle: '实时监控和分析预言机数据',
  },

  // 热力图
  heatmap: {
    title: '价格偏离热力图',
    hot: '高热',
    cold: '低热',
    avg: '平均偏离',
    legend: '偏离度',
    stable: '稳定',
    slight: '轻微',
    moderate: '中等',
    high: '高',
    extreme: '极高',
    price: '价格',
    deviation: '偏离',
  },

  // 图表
  chart: {
    spread: '价差',
    average: '平均',
  },

  // 仪表盘
  gauge: {
    title: '偏离度仪表盘',
    normal: '正常',
    normalDesc: '价格在正常范围内波动',
    elevated: '偏高',
    elevatedDesc: '价格偏离度略高，需要关注',
    critical: '严重',
    criticalDesc: '价格偏离严重，建议立即检查',
    threshold: '阈值',
  },

  // 网络拓扑
  topology: {
    title: '网络拓扑',
    online: '在线',
    degraded: '降级',
    offline: '离线',
    dataSources: '数据源',
    aggregators: '聚合器',
    oracles: '预言机',
    latency: '延迟',
  },

  // 快速操作
  actions: {
    title: '快速操作',
    refresh: '刷新',
    export: '导出',
    filter: '筛选',
    settings: '设置',
  },

  // KPI
  kpi: {
    tvl: '总锁仓价值',
    activeProtocols: '活跃协议',
    dailyUpdates: '日更新数',
    activeUsers: '活跃用户',
  },
};
