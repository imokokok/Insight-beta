export const security = {
  title: '보안 모니터링',
  description: '오라클 조작 공격의 실시간 모니터링 및 탐지',
  dashboard: {
    title: '보안 대시보드',
    subtitle: '오라클 보안 상태 실시간 모니터링',
  },
  severity: {
    critical: '심각',
    high: '높음',
    medium: '중간',
    low: '낮음',
  },
  attackTypes: {
    flash_loan_attack: '플래시 대출 공격',
    price_manipulation: '가격 조작',
    oracle_manipulation: '오라클 조작',
    sandwich_attack: '샌드위치 공격',
    front_running: '프론트 러닝',
    back_running: '백 러닝',
    liquidity_manipulation: '유동성 조작',
    statistical_anomaly: '통계적 이상',
  },
  status: {
    pending: '검토 대기 중',
    confirmed: '확인됨',
    false_positive: '오탐',
    under_investigation: '조사 중',
    unknown: '알 수 없음',
  },
  detectionRules: {
    statistical_anomaly: {
      name: '통계적 이상 탐지',
      description: 'Z-score 기반 통계적 이상 탐지',
    },
    flash_loan: {
      name: '플래시 대출 공격 탐지',
      description: '플래시 대출 공격 패턴 탐지',
    },
    sandwich: {
      name: '샌드위치 공격 탐지',
      description: '샌드위치 공격 패턴 탐지',
    },
    liquidity: {
      name: '유동성 조작 탐지',
      description: '비정상적인 유동성 변화 탐지',
    },
    oracle: {
      name: '오라클 조작 탐지',
      description: '오라클 가격 조작 탐지',
    },
    front_running: {
      name: '프론트 러닝 탐지',
      description: 'MEV 프론트 러닝 탐지',
    },
    back_running: {
      name: '백 러닝 탐지',
      description: 'MEV 백 러닝 탐지',
    },
  },
  alertChannels: {
    email: {
      name: '이메일 알림',
      description: '구성된 관리자 이메일로 전송',
    },
    slack: {
      name: 'Slack',
      description: 'Slack 채널로 전송',
    },
    telegram: {
      name: 'Telegram',
      description: 'Telegram 메시지 전송',
    },
  },
  placeholders: {
    reviewNote: '검토 메모 입력...',
  },
  notifications: {
    title: '보안 경고',
    newThreatDetected: '새로운 위협 탐지됨',
    investigationRequired: '조사 필요',
  },
  export: {
    detectionTime: '탐지 시간',
    protocol: '프로토콜',
    tradingPair: '거래 쌍',
    attackType: '공격 유형',
    severity: '심각도',
    status: '상태',
    confidence: '신뢰도',
    description: '설명',
  },
};
