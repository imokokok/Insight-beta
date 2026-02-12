export const security = {
  title: 'Security Monitoring',
  description: 'Real-time monitoring and detection of oracle manipulation attacks',
  dashboard: {
    title: 'Security Dashboard',
    subtitle: 'Real-time monitoring of oracle security status',
  },
  config: {
    title: 'Price Manipulation Detection Config',
    subtitle: 'Configure detection rules, thresholds and alert settings',
    tabs: {
      rules: 'Detection Rules',
      thresholds: 'Thresholds',
      alerts: 'Alert Config',
      advanced: 'Advanced',
    },
    sections: {
      enabledRules: 'Enabled Detection Rules',
      enabledRulesDesc: 'Select price manipulation detection rules to enable',
      statisticalThresholds: 'Statistical Anomaly Thresholds',
      attackThresholds: 'Attack Detection Thresholds',
      zScoreDesc:
        'Standard deviation multiplier, values above this are considered anomalous (recommended: 3)',
      minDataPointsDesc:
        'Minimum number of historical data points required for statistical detection',
      alertChannels: 'Alert Channels',
      alertChannelsDesc: 'Configure notification methods for detection alerts',
    },
    labels: {
      zScoreThreshold: 'Z-Score Threshold',
      minConfidence: 'Minimum Confidence',
      maxPriceDeviation: 'Max Price Deviation (%)',
      minDataPoints: 'Minimum Data Points',
      flashLoanMinAmount: 'Flash Loan Min Amount (USD)',
      sandwichProfitThreshold: 'Sandwich Profit Threshold (USD)',
      liquidityChangeThreshold: 'Liquidity Change Threshold',
    },
    enabled: 'Enabled',
  },
  severity: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
  attackTypes: {
    flash_loan_attack: 'Flash Loan Attack',
    price_manipulation: 'Price Manipulation',
    oracle_manipulation: 'Oracle Manipulation',
    sandwich_attack: 'Sandwich Attack',
    front_running: 'Front Running',
    back_running: 'Back Running',
    liquidity_manipulation: 'Liquidity Manipulation',
    statistical_anomaly: 'Statistical Anomaly',
  },
  status: {
    pending: 'Pending Review',
    confirmed: 'Confirmed',
    false_positive: 'False Positive',
    under_investigation: 'Under Investigation',
    unknown: 'Unknown',
  },
  detectionRules: {
    statistical_anomaly: {
      name: 'Statistical Anomaly Detection',
      description: 'Z-score based statistical anomaly detection',
    },
    flash_loan: {
      name: 'Flash Loan Attack Detection',
      description: 'Detect flash loan attack patterns',
    },
    sandwich: {
      name: 'Sandwich Attack Detection',
      description: 'Detect sandwich attack patterns',
    },
    liquidity: {
      name: 'Liquidity Manipulation Detection',
      description: 'Detect abnormal liquidity changes',
    },
    oracle: {
      name: 'Oracle Manipulation Detection',
      description: 'Detect oracle price manipulation',
    },
    front_running: {
      name: 'Front Running Detection',
      description: 'Detect MEV front running',
    },
    back_running: {
      name: 'Back Running Detection',
      description: 'Detect MEV back running',
    },
  },
  alertChannels: {
    email: {
      name: 'Email Alert',
      description: 'Send email to configured admin address',
    },
    webhook: {
      name: 'Webhook',
      description: 'Call configured Webhook URL',
    },
    slack: {
      name: 'Slack',
      description: 'Send to Slack channel',
    },
    telegram: {
      name: 'Telegram',
      description: 'Send Telegram message',
    },
  },
  placeholders: {
    reviewNote: 'Enter review notes...',
  },
  reviewNotes: 'Review Notes',
  submitReview: 'Submit Review',
  notifications: {
    title: 'Security Alert',
    newThreatDetected: 'New threat detected',
    investigationRequired: 'Investigation required',
  },
  export: {
    detectionTime: 'Detection Time',
    protocol: 'Protocol',
    tradingPair: 'Trading Pair',
    attackType: 'Attack Type',
    severity: 'Severity',
    status: 'Status',
    confidence: 'Confidence',
    description: 'Description',
    financialImpact: 'Financial Impact',
    suspiciousTx: 'Suspicious Transactions',
  },
};
