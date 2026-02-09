export const protocol = {
  // Protocol Status
  status: {
    healthy: '건강',
    degraded: '저하됨',
    down: '중단',
    active: '활성',
    stale: '오래됨',
    error: '오류',
  },

  // Health Score
  health: {
    excellent: '우수',
    excellentDesc: '프로토콜이 최적으로 작동 중이며 모든 지표가 우수한 수준입니다',
    good: '양호',
    goodDesc: '프로토콜이 잘 작동 중이며 대부분의 지표가 정상입니다',
    fair: '보통',
    fairDesc: '프로토콜이 보통으로 작동 중이며 일부 지표에 주의가 필요합니다',
    poor: '나쁨',
    poorDesc: '프로토콜이 나쁘게 작동 중이며 즉시 검토가 권장됩니다',
  },

  // Metrics
  metrics: {
    latency: '지연 시간',
    accuracy: '정확도',
    uptime: '가동 시간',
    feeds: '피드',
    avgUpdateTime: '평균 업데이트 시간',
    priceDeviation: '가격 편차',
    availability: '가용성',
    of: '의',
  },

  // Asset Pairs
  assetPairs: '자산 쌍',
  pair: '쌍',
  price: '가격',
  deviation: '편차',
  trend: '추세',
  lastUpdate: '마지막 업데이트',
  pairStatus: {
    active: '활성',
    stale: '오래됨',
    error: '오류',
  },
  searchPairs: '자산 쌍 검색...',
  noPairsFound: '일치하는 자산 쌍을 찾을 수 없습니다',

  // Performance Chart
  performance: {
    title: '역사적 성능',
    noData: '성능 데이터 없음',
    accuracy: '정확도',
    latency: '지연 시간',
    uptime: '가동 시간',
    avgAccuracy: '평균 정확도',
    avgLatency: '평균 지연 시간',
    avgUptime: '평균 가동 시간',
  },

  // Alerts
  alerts: {
    title: '알림 센터',
    all: '모두',
    unacknowledged: '미확인',
    acknowledge: '확인',
    noAlerts: '알림 없음',
  },
  alertLevel: {
    critical: '심각',
    high: '높음',
    medium: '중간',
    low: '낮음',
    info: '정보',
  },

  // Protocol Comparison
  comparison: {
    title: '프로토콜 비교',
    best: '최고',
    top: '상위',
    protocol: '프로토콜',
    healthScore: '건강 점수',
    latency: '지연 시간',
    accuracy: '정확도',
    uptime: '가동 시간',
    actions: '작업',
    feeds: '피드',
    chains: '체인',
    tvl: 'TVL',
    marketShare: '시장 점유율',
    features: '기능',
  },

  // Node Distribution
  nodeDistribution: {
    title: '노드 분포',
    totalNodes: '총 노드',
    healthy: '건강',
    avgLatency: '평균 지연 시간',
    healthyNodes: '건강한 노드',
    health: '건강',
  },

  // Real-time Price Stream
  priceStream: {
    title: '실시간 가격 스트림',
    updates: '업데이트',
    noUpdates: '가격 업데이트 없음',
    avgChange: '평균 변화',
    up: '상승',
    down: '하',
  },

  // Data Freshness
  freshness: {
    fresh: '최신',
    freshDesc: '데이터가 방금 업데이트되었습니다',
    warning: '경고',
    warningDesc: '데이터가 다소 오래되었습니다',
    stale: '오래됨',
    staleDesc: '데이터가 만료되었습니다',
    expired: '만료됨',
    expiredDesc: '데이터가 만료되었습니다',
  },

  // Arbitrage Opportunities
  arbitrage: {
    title: '차익 기회',
    totalProfit: '총 수익',
    avgSpread: '평균 스프레드',
    noOpportunities: '차익 기회 없음',
    riskLow: '낮은 위험',
    riskMedium: '중간 위험',
    riskHigh: '높은 위험',
    buy: '매수',
    sell: '매도',
    estimatedProfit: '예상 수익',
    execute: '실행',
    highRiskWarning: '높은 위험: 가격 변동이 빠를 수 있으므로 주의하세요',
  },

  // Risk Score
  risk: {
    title: '위험 점수',
    low: '낮은 위험',
    lowDesc: '프로토콜 위험이 낮고 안정적으로 작동 중입니다',
    medium: '중간 위험',
    mediumDesc: '프로토콜에 일정한 위험이 있으므로 주의가 필요합니다',
    high: '높은 위험',
    highDesc: '프로토콜 위험이 높으므로 주의해서 사용하세요',
    critical: '심각한 위험',
    criticalDesc: '프로토콜에 심각한 위험이 있으므로 즉시 검토가 권장됩니다',
    noData: '위험 데이터 없음',
    lastAssessment: '마지막 평가',
    improving: '개선 중',
    stable: '안정적',
    worsening: '악화 중',
    factors: '위험 요인',
    lowRisk: '낮은 위험',
    highRisk: '높은 위험',
  },

  // General
  noData: '데이터 없음',
  visitWebsite: '웹사이트 방문',
  activeFeeds: '활성 피드',
  supportedChains: '지원 체인',
  marketShare: '시장 점유율',
  submitReview: '검토 제출',
  reviewNotes: '검토 메모',
};
