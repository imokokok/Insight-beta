export const sla = {
  title: 'SLA 모니터링',
  description: '오라클 프로토콜의 서비스 수준 계약 준수 모니터링',
  stats: {
    overallCompliance: '전체 준수율',
    compliantProtocols: '준수 프로토콜',
    totalProtocols: '총 {{count}} 개 프로토콜',
    atRiskProtocols: '위험 프로토콜',
    needsAttention: '주의 필요',
    breachedProtocols: '위반 프로토콜',
    slaBreached: 'SLA 위반',
  },
  status: {
    compliant: '준수',
    at_risk: '위험',
    breached: '위반',
  },
  metrics: {
    uptime: '가동 시간',
    avgLatency: '평균 지연 시간',
    accuracy: '정확도',
    availability: '가용성',
  },
};
