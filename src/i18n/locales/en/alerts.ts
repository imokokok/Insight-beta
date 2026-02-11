export const alerts = {
  acknowledge: 'Acknowledge',
  adminActor: 'Actor',
  adminActorPlaceholder: 'e.g. alice@ops',
  adminToken: 'Admin token',
  adminTokenHint: 'Stored locally in this session for admin API access',
  adminTokenWarning:
    'Without a token you can only view alerts, not acknowledge/resolve or save rules.',
  description: 'Aggregate alerts, acknowledge and track health.',
  explanation: 'Explanation',
  filter: 'Filter',
  lastSeen: 'Last',
  loadRules: 'Load Rules',
  occurrences: 'Occurrences',
  owner: 'Owner',
  recommendedActions: 'Recommended actions',
  refresh: 'Refresh',
  resolve: 'Resolve',
  rules: 'Alert rules',
  runbook: 'Runbook',
  saveRules: 'Save',
  savingRules: 'Saving…',
  searchPlaceholder: 'Search title/content/entity…',
  severity: 'Severity',
  silence24h: 'Silence 24h',
  silence2h: 'Silence 2h',
  silence30m: 'Silence 30m',
  silencedUntil: 'Silenced until',
  status: 'Status',
  title: 'Alerts',
  type: 'Type',
  unsilence: 'Unsilence',

  // Notification Channel Config
  config: {
    title: 'Notification Channel Config',
    description: 'Configure Webhook, PagerDuty, Slack, Email and other alert notification channels',
    save: 'Save Config',
    saveSuccess: 'Config Saved',
    saveSuccessDesc: 'Notification channel config has been updated successfully',
    saveError: 'Save Failed',
    test: 'Test',
    testSuccess: 'Test Success',
    testError: 'Test Failed',
    // Email
    smtpHost: 'SMTP Host',
    smtpPort: 'SMTP Port',
    username: 'Username',
    password: 'Password',
    fromAddress: 'From Address',
    toAddresses: 'To Addresses (comma separated)',
    useTLS: 'Use TLS Encryption',
    // Webhook
    webhookUrl: 'Webhook URL',
    method: 'Method',
    headers: 'Headers (JSON format)',
    timeoutMs: 'Timeout (ms)',
    retryCount: 'Retry Count',
    // Slack
    slackWebhookUrl: 'Slack Webhook URL',
    channel: 'Channel',
    // Telegram
    botToken: 'Bot Token',
    chatIds: 'Chat IDs (comma separated)',
    parseMode: 'Parse Mode',
    // PagerDuty
    integrationKey: 'Integration Key',
  },

  // Alert History
  history: {
    title: 'Alert History',
    description: 'View and manage alert history records',
    noAlerts: 'No alert records',
    acknowledge: 'Acknowledge',
    acknowledged: 'Acknowledged',
    acknowledgeSuccess: 'Alert Acknowledged',
    acknowledgeSuccessDesc: 'Alert has been acknowledged successfully',
    acknowledgeError: 'Acknowledge Failed',
    acknowledgedBy: 'Acknowledged By',
    acknowledgedAt: 'Acknowledged At',
    channelResults: 'Channel Delivery Results',
    success: 'Success',
    failed: 'Failed',
    protocol: 'Protocol',
    chain: 'Chain',
    symbol: 'Symbol',
  },

  // Stats
  stats: {
    total: 'Total',
    pending: 'Pending',
    acknowledged: 'Acknowledged',
    critical: 'Critical',
  },

  // Channel Health
  channelHealth: {
    title: 'Channel Health Status',
  },

  // Filters
  filters: {
    severity: 'Severity',
    all: 'All',
    protocol: 'Protocol',
    protocolPlaceholder: 'Enter protocol name',
    symbol: 'Symbol',
    symbolPlaceholder: 'Enter symbol',
  },

  // Severity Labels
  severityLabels: {
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
  },
};
