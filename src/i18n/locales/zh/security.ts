export const security = {
  title: '安全监控',
  description: '实时监控和检测预言机操纵攻击',
  dashboard: {
    title: '安全仪表盘',
    subtitle: '实时监控预言机安全状态',
  },
  config: {
    title: '价格操纵检测配置',
    subtitle: '配置检测规则、阈值和告警设置',
    tabs: {
      rules: '检测规则',
      thresholds: '阈值设置',
      alerts: '告警配置',
      advanced: '高级选项',
    },
    sections: {
      enabledRules: '启用的检测规则',
      enabledRulesDesc: '选择要启用的价格操纵检测规则',
      statisticalThresholds: '统计异常检测阈值',
      attackThresholds: '攻击检测阈值',
      zScoreDesc: '标准差倍数，超过此值视为异常（推荐: 3）',
      minDataPointsDesc: '进行统计检测所需的最小历史数据点数量',
      alertChannels: '告警渠道',
      alertChannelsDesc: '配置检测告警的通知方式',
    },
    labels: {
      zScoreThreshold: 'Z-Score 阈值',
      minConfidence: '最小置信度',
      maxPriceDeviation: '最大价格偏离 (%)',
      minDataPoints: '最小数据点数',
      flashLoanMinAmount: '闪电贷最小金额 (USD)',
      sandwichProfitThreshold: '三明治攻击利润阈值 (USD)',
      liquidityChangeThreshold: '流动性变化阈值',
    },
    enabled: '已启用',
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
    webhook: {
      name: 'Webhook',
      description: '调用配置的Webhook URL',
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
  reviewNotes: '审核备注',
  submitReview: '提交审核',
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
    financialImpact: '资金影响',
    suspiciousTx: '可疑交易',
  },
};
