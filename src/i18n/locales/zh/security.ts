export const security = {
  title: '安全监控',
  description: '实时监控和检测预言机操纵攻击',
  dashboard: {
    title: '安全仪表盘',
    subtitle: '实时监控预言机安全状态',
  },
  severity: {
    critical: '严重',
    high: '高危',
    medium: '中危',
    low: '低危',
  },
  attackTypes: {
    flash_loan_attack: '闪电贷攻击',
    price_manipulation: '价格操纵',
    oracle_manipulation: '预言机操纵',
    sandwich_attack: '三明治攻击',
    front_running: '抢先交易',
    back_running: '尾随交易',
    liquidity_manipulation: '流动性操纵',
    statistical_anomaly: '统计异常',
  },
  status: {
    pending: '待审核',
    confirmed: '已确认',
    false_positive: '误报',
    under_investigation: '调查中',
    unknown: '未知',
  },
  detectionRules: {
    statistical_anomaly: {
      name: '统计异常检测',
      description: '基于Z-score的统计异常检测',
    },
    flash_loan: {
      name: '闪电贷攻击检测',
      description: '检测闪电贷攻击模式',
    },
    sandwich: {
      name: '三明治攻击检测',
      description: '检测三明治攻击模式',
    },
    liquidity: {
      name: '流动性操纵检测',
      description: '检测流动性异常变化',
    },
    oracle: {
      name: '预言机操纵检测',
      description: '检测预言机价格操纵',
    },
    front_running: {
      name: '抢先交易检测',
      description: '检测MEV抢先交易',
    },
    back_running: {
      name: '尾随交易检测',
      description: '检测MEV尾随交易',
    },
  },
  alertChannels: {
    email: {
      name: '邮件告警',
      description: '发送邮件到配置的管理员邮箱',
    },
    slack: {
      name: 'Slack',
      description: '发送到Slack频道',
    },
    telegram: {
      name: 'Telegram',
      description: '发送Telegram消息',
    },
  },
  placeholders: {
    reviewNote: '输入审核备注...',
  },
  notifications: {
    title: '安全警报',
    newThreatDetected: '检测到新威胁',
    investigationRequired: '需要调查',
  },
  export: {
    detectionTime: '检测时间',
    protocol: '协议',
    tradingPair: '交易对',
    attackType: '攻击类型',
    severity: '严重程度',
    status: '状态',
    confidence: '置信度',
    description: '描述',
  },
};
