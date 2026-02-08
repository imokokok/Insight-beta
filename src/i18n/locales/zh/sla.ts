export const sla = {
  title: 'SLA 监控面板',
  description: '预言机协议的服务等级协议合规监控',
  subtitle: 'Service Level Agreement Monitoring',
  refresh: '刷新',
  reports: {
    title: '协议 SLA 报告',
    noData: '暂无 SLA 数据',
  },
  stats: {
    overallCompliance: '整体合规率',
    compliantProtocols: '合规协议',
    totalProtocols: '共 {{count}} 个协议',
    atRiskProtocols: '风险协议',
    needsAttention: '需要关注',
    breachedProtocols: '违约协议',
    slaBreached: 'SLA 已违约',
  },
  status: {
    compliant: '合规',
    at_risk: '风险',
    breached: '违约',
  },
  metrics: {
    uptime: '正常运行时间',
    avgLatency: '平均延迟',
    accuracy: '准确性',
    availability: '可用性',
  },
  targets: {
    uptime: '99.9%',
    latency: '<500ms',
    accuracy: '99.5%',
    availability: '99.9%',
  },
  labels: {
    slaCompliance: 'SLA 合规性',
  },
};
