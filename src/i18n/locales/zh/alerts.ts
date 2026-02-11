export const alerts = {
  acknowledge: '确认',
  adminActor: '执行者',
  adminActorPlaceholder: '例如：alice@ops',
  adminToken: '管理员令牌',
  adminTokenHint: '在本会话中本地存储，用于管理员 API 访问',
  adminTokenWarning: '没有令牌，您只能查看告警，无法确认/解决或保存规则。',
  description: '聚合告警，确认并跟踪健康状况。',
  explanation: '说明',
  filter: '筛选',
  lastSeen: '最后',
  loadRules: '加载规则',
  occurrences: '发生次数',
  owner: '所有者',
  recommendedActions: '建议操作',
  refresh: '刷新',
  resolve: '解决',
  rules: '告警规则',
  runbook: '运行手册',
  saveRules: '保存',
  savingRules: '保存中…',
  searchPlaceholder: '搜索标题/内容/实体…',
  severity: '严重级别',
  silence24h: '静默24小时',
  silence2h: '静默2小时',
  silence30m: '静默30分钟',
  silencedUntil: '静默至',
  status: '状态',
  title: '告警',
  type: '类型',
  unsilence: '取消静默',

  // 通知渠道配置
  config: {
    title: '通知渠道配置',
    description: '配置 Webhook、PagerDuty、Slack、Email 等告警通知渠道',
    save: '保存配置',
    saveSuccess: '配置已保存',
    saveSuccessDesc: '通知渠道配置已成功更新',
    saveError: '保存失败',
    test: '测试',
    testSuccess: '测试成功',
    testError: '测试失败',
    // Email
    smtpHost: 'SMTP 服务器',
    smtpPort: 'SMTP 端口',
    username: '用户名',
    password: '密码',
    fromAddress: '发件人地址',
    toAddresses: '收件人地址（用逗号分隔）',
    useTLS: '使用 TLS 加密',
    // Webhook
    webhookUrl: 'Webhook URL',
    method: '请求方法',
    headers: '请求头（JSON 格式）',
    timeoutMs: '超时时间（毫秒）',
    retryCount: '重试次数',
    // Slack
    slackWebhookUrl: 'Slack Webhook URL',
    channel: '频道',
    // Telegram
    botToken: 'Bot Token',
    chatIds: 'Chat IDs（用逗号分隔）',
    parseMode: '解析模式',
    // PagerDuty
    integrationKey: 'Integration Key',
  },

  // 告警历史
  history: {
    title: '告警历史',
    description: '查看和管理告警历史记录',
    noAlerts: '暂无告警记录',
    acknowledge: '确认',
    acknowledged: '已确认',
    acknowledgeSuccess: '告警已确认',
    acknowledgeSuccessDesc: '告警已成功确认',
    acknowledgeError: '确认失败',
    acknowledgedBy: '确认人',
    acknowledgedAt: '确认时间',
    channelResults: '渠道发送结果',
    success: '成功',
    failed: '失败',
    protocol: '协议',
    chain: '链',
    symbol: '交易对',
  },

  // 统计
  stats: {
    total: '总计',
    pending: '待处理',
    acknowledged: '已确认',
    critical: '严重',
  },

  // 渠道健康
  channelHealth: {
    title: '渠道健康状态',
  },

  // 过滤器
  filters: {
    severity: '严重级别',
    all: '全部',
    protocol: '协议',
    protocolPlaceholder: '输入协议名称',
    symbol: '交易对',
    symbolPlaceholder: '输入交易对',
  },

  // 严重级别标签
  severityLabels: {
    critical: '严重',
    warning: '警告',
    info: '信息',
  },
};
