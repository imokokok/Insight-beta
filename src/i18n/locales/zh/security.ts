export const security = {
  pageTitle: '安全仪表板',
  pageDescription: '分析安全警报和异常检测',
  stats: {
    totalAlerts: '总警报数',
    critical: '严重',
    active: '活跃',
    resolved: '已解决',
  },
  tabs: {
    overview: '概览',
    alerts: '警报',
    trends: '趋势',
  },
  cards: {
    alertTrend: '警报趋势',
    alertsOverTime: '随时间变化的警报',
    recentAlerts: '最近警报',
    latestAlerts: '最近 5 条警报',
  },
  searchPlaceholder: '搜索警报...',
  trendsComingSoon: '趋势分析即将推出',
  emptyStates: {
    systemSecure: '系统安全',
    systemSecureDesc: '未检测到可疑活动。系统正在主动监控，一旦发现威胁将立即向您发出警报。',
    allSystemsOperational: '所有系统运行正常',
    noAnomaliesDetected: '未检测到异常',
    noAnomaliesDesc:
      '机器学习模型正在主动监控价格源。当检测到异常时，它们将在此处显示详细分析和置信度评分。',
    allSystemsHealthy: '所有系统健康',
    allSystemsHealthyDesc: '目前没有活跃警报。所有预言机协议运行正常。配置警报规则以获取异常通知。',
    configureAlerts: '配置警报',
    everythingRunningSmoothly: '一切运行顺利',
    systemRunningSmoothly: '系统运行顺利',
  },
};
