import type { Lang } from './types';

export type { Lang };

export const languages: Array<{ code: Lang; label: string }> = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
];

export const LANG_STORAGE_KEY = 'insight_lang';

export function isLang(value: unknown): value is Lang {
  return value === 'zh' || value === 'en' || value === 'es' || value === 'fr' || value === 'ko';
}

interface ParsedLanguage {
  lang: string;
  q: number;
}

function parseAcceptLanguage(header: string): ParsedLanguage[] {
  const parts = header.split(',');
  const parsed: ParsedLanguage[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    let lang = trimmed;
    let q = 1.0;

    const semicolonIndex = trimmed.indexOf(';');
    if (semicolonIndex >= 0) {
      lang = trimmed.slice(0, semicolonIndex);
      const qParamPart = trimmed.slice(semicolonIndex);
      const qMatch = qParamPart.match(/q=([0-9.]+)/);
      if (qMatch && qMatch[1]) {
        const qValue = parseFloat(qMatch[1]);
        if (!Number.isNaN(qValue)) {
          q = Math.min(1, Math.max(0, qValue));
        }
      }
    }

    const baseLang = lang.split('-')[0]?.split('_')[0]?.toLowerCase() ?? 'en';
    parsed.push({ lang: baseLang, q });
  }

  parsed.sort((a, b) => b.q - a.q);
  return parsed;
}

export function detectLangFromAcceptLanguage(value: string | null | undefined): Lang {
  const header = value ?? '';
  if (!header.trim()) return 'en';

  const parsed = parseAcceptLanguage(header);

  for (const { lang } of parsed) {
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('es')) return 'es';
  }

  return 'en';
}

export const langToHtmlLang: Record<Lang, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  ko: 'ko',
  zh: 'zh-CN',
};

export const langToLocale: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  ko: 'ko-KR',
  zh: 'zh-CN',
};

// English translations
const enTranslations = {
  adminTokens: {
    create: 'Create',
    createdAt: 'Created',
    description: 'Create, rotate, and revoke admin tokens.',
    label: 'Label',
    revoke: 'Revoke',
    revokedAt: 'Revoked',
    role: 'Role',
    title: 'Admin Tokens',
    tokenValue: 'New token (shown once)',
  },
  alerts: {
    acknowledge: 'Acknowledge',
    actions: {
      backlog_assertions: {
        1: 'Check assertion ingestion pipeline',
        2: 'Clear stuck assertion queue',
      },
      backlog_disputes: {
        1: 'Check dispute processing pipeline',
        2: 'Coordinate voting/settlement capacity',
      },
      contract_paused: {
        1: 'Confirm pause reason and scope',
        2: 'Coordinate with protocol team',
      },
      database_slow_query: {
        1: 'Identify slow queries',
        2: 'Optimize indexes and resources',
      },
      dispute_created: {
        1: 'Review dispute details and evidence',
        2: 'Notify stakeholders and triage impact',
      },
      execution_delayed: {
        1: 'Check executor health',
        2: 'Assess on-chain congestion',
      },
      high_dispute_rate: {
        1: 'Identify markets with spikes',
        2: 'Review assertion creation rules',
      },
      high_error_rate: {
        1: 'Check error logs and alerts',
        2: 'Rollback recent changes if needed',
      },
      high_vote_divergence: {
        1: 'Review evidence and dispute focus',
        2: 'Analyze voting skew causes',
      },
      liveness_expiring: {
        1: 'Verify assertion data sources',
        2: 'Dispute if needed before expiry',
      },
      low_gas: {
        1: 'Top up node gas balance',
        2: 'Set a minimum balance alert',
      },
      low_participation: {
        1: 'Nudge voters to participate',
        2: 'Review incentives and timing',
      },
      market_stale: {
        1: 'Verify market data sources',
        2: 'Adjust update cadence',
      },
      price_deviation: {
        1: 'Compare against reference feeds',
        2: 'Check feed latency and sources',
      },
      slow_api_request: {
        1: 'Find slow endpoints and dependencies',
        2: 'Enable caching or rate limiting',
      },
      stale_sync: {
        1: 'Identify the stalled sync stage',
        2: 'Allocate more sync resources',
      },
      sync_backlog: {
        1: 'Inspect backlog composition',
        2: 'Scale indexer throughput',
      },
      sync_error: {
        1: 'Check RPC/indexer logs',
        2: 'Restart or switch to backup node',
      },
    },
    adminActor: 'Actor',
    adminActorPlaceholder: 'e.g. alice@ops',
    adminToken: 'Admin token',
    adminTokenHint: 'Stored locally in this session for admin API access',
    adminTokenWarning:
      'Without a token you can only view alerts, not acknowledge/resolve or save rules.',
    description: 'Aggregate alerts, acknowledge and track health.',
    explanation: 'Explanation',
    explanations: {
      backlog_assertions: 'Assertion backlog is higher than expected.',
      backlog_disputes: 'Dispute backlog is higher than expected.',
      contract_paused: 'Oracle contract is paused and workflows are blocked.',
      database_slow_query: 'Database query latency is elevated.',
      dispute_created: 'A new dispute was detected and may impact outcomes.',
      execution_delayed: 'Execution is delayed past the expected window.',
      high_dispute_rate: 'Dispute rate is elevated and needs review.',
      high_error_rate: 'Error rate is elevated and needs investigation.',
      high_vote_divergence: 'Voting divergence is high, outcome uncertain.',
      liveness_expiring: 'Liveness window is about to expire soon.',
      low_gas: 'Node gas balance is low and transactions may fail.',
      low_participation: 'Voting participation is below expected levels.',
      market_stale: 'Market data looks stale and may be outdated.',
      price_deviation: 'Oracle price deviates from reference sources.',
      slow_api_request: 'API latency increased and may affect clients.',
      stale_sync: 'Sync appears stalled beyond the allowed threshold.',
      sync_backlog: 'Sync backlog is growing and delays may increase.',
      sync_error: 'Indexer sync failed and data may be stale.',
    },
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
  },
  app: {
    brand: 'Insight',
    description: 'Visual monitoring of UMA Optimistic Oracle disputes and settlements.',
    logoAlt: 'Insight logo',
    subtitle: 'Oracle Monitor',
    title: 'Insight · UMA Settlement Monitor',
  },
  audit: {
    action: 'Action',
    actionPlaceholder: 'e.g. alert_rules_updated',
    actor: 'Actor',
    actorPlaceholder: 'e.g. alice@ops',
    adminToken: 'Admin token',
    adminTokenHint: 'Use the same admin token stored in this session.',
    adminTokenPlaceholder: 'Bearer …',
    apply: 'Apply',
    clear: 'Clear',
    description: 'Track admin actions and critical changes.',
    empty: 'No audit entries yet.',
    entityId: 'Entity ID',
    entityIdPlaceholder: 'e.g. 0x…',
    entityType: 'Entity type',
    entityTypePlaceholder: 'e.g. alerts',
    error: 'Error',
    exportCsv: 'Export CSV',
    exporting: 'Exporting…',
    exportJson: 'Export JSON',
    filters: 'Filters',
    query: 'Search',
    queryPlaceholder: 'Search actor/action/entity/details…',
    refresh: 'Refresh',
    title: 'Audit Log',
    total: 'Total',
  },
  chain: {
    arbitrum: 'Arbitrum',
    local: 'Local',
    optimism: 'Optimism',
    polygon: 'Polygon',
  },
  validation: {
    protocolLength: 'Protocol must be between 1 and 100 characters',
    marketLength: 'Market must be between 1 and 200 characters',
    assertionLength: 'Assertion must be between 1 and 1000 characters',
    invalidUrl: 'Invalid URL format',
  },
  batch: {
    processing: 'Processing items',
  },
  common: {
    addToWatchlist: 'Add to Watchlist',
    all: 'All',
    allLoaded: 'All loaded',
    breadcrumb: 'Breadcrumb',
    cancel: 'Cancel',
    close: 'Close',
    closeMenu: 'Close menu',
    comingSoon: 'Coming Soon',
    confirm: 'Confirm',
    copied: 'Copied',
    copyHash: 'Copy hash',
    disputed: 'Disputed',
    example: 'Example',
    export: 'Export',
    home: 'Home',
    language: 'Language',
    loading: 'Loading…',
    loadMore: 'Load More',
    min: 'Min',
    noData: 'No Data',
    notNow: 'Not Now',
    ok: 'OK',
    openMenu: 'Open menu',
    pending: 'Pending',
    popular: 'Popular',
    refresh: 'Refresh',
    removeFromWatchlist: 'Remove from Watchlist',
    resolved: 'Resolved',
    retry: 'Retry',
    sidebar: 'Sidebar',
    success: 'Success',
    usd: 'USD',
    viewDetails: 'View Details',
    viewOnExplorer: 'View on Explorer',
    viewTx: 'View TX',
    settings: 'Settings',
    disconnect: 'Disconnect',
    search: 'Search',
    notifications: 'Notifications',
    userMenu: 'User menu',
    brand: 'Insight',
    history: 'History',
    undo: 'Undo',
    redo: 'Redo',
    clearHistory: 'Clear history',
    noHistory: 'No history yet',
    templates: 'Templates',
    allSynced: 'All synced',
    pwaSettings: 'PWA Settings',
    installation: 'Installation',
    storage: 'Storage',
    cacheSize: 'Cache size',
    networkStatus: 'Network status',
    progress: 'Progress',
    uniqueErrorTypes: 'Unique Error Types',
    topErrors: 'Top Errors',
    quickActions: 'Quick Actions',
    somethingWrong: 'Something went wrong',
    suggestedAction: 'Suggested Action',
    howToFix: 'How to fix it',
    copyId: 'Click to copy ID',
    sharePage: 'Share Page',
    navigation: 'Navigation',
    page: 'Page',
    of: 'of',
    total: 'total',
    previous: 'Previous',
    next: 'Next',
  },
  keyboardShortcuts: {
    title: 'Keyboard Shortcuts',
    pressAny: 'Press any key to close',
  },
  pwa: {
    install: 'Install App',
    installDescription:
      'Add Insight Oracle to your home screen for quick access and offline support.',
    installTitle: 'Install Insight Oracle',
    installing: 'Installing…',
    offline: 'You are offline',
    offlineDescription: 'Some features may be unavailable until you reconnect.',
    update: 'Update',
    updateAvailable: 'Update Available',
    updateDescription: 'A new version of Insight Oracle is available.',
  },
  disputes: {
    card: {
      dispute: 'Dispute',
      disputer: 'Disputer',
      votes: 'Votes',
    },
    description: 'Monitor active disputes, track voting progress, and analyze outcomes.',
    disputedAt: 'Disputed At',
    disputer: 'Disputer',
    emptyDesc: 'There are currently no active disputes in the system.',
    emptyTitle: 'No Active Disputes',
    endsAt: 'Ends',
    reason: 'Reason for Dispute',
    reject: 'Reject Assertion',
    support: 'Support Assertion',
    title: 'Dispute Resolution',
    totalVotesCast: 'Total Votes Cast',
    umaDvmActive: 'UMA DVM Active',
    viewOnUma: 'View on UMA',
    votingProgress: 'Voting Progress',
  },
  errorPage: {
    description:
      'We apologize for the inconvenience. An unexpected error occurred while processing your request.',
    digest: 'Error Digest',
    home: 'Go Home',
    retry: 'Retry',
    title: 'Something went wrong',
  },
  errors: {
    apiError: 'Server error',
    chainNotAdded: 'This network is not added in your wallet. Please add it first.',
    contractNotFound: 'Contract not found',
    forbidden: 'Forbidden (admin token required)',
    httpError: 'Network request failed',
    insufficientFunds: 'Insufficient funds to pay for gas or value.',
    invalidAddress: 'Invalid address',
    invalidApiResponse: 'Invalid API response',
    invalidChain: 'Invalid chain',
    invalidContractAddress: 'Invalid contract address',
    invalidJson: 'Failed to parse response',
    invalidMaxBlockRange: 'Max block range is out of allowed bounds',
    invalidRequestBody: 'Invalid request body',
    invalidRpcUrl: 'Invalid RPC URL',
    invalidVotingPeriodHours: 'Voting period hours is out of allowed bounds',
    missingConfig: 'Missing config: RPC URL or contract address',
    requestPending: 'A wallet request is already pending. Please check your wallet.',
    rpcUnreachable: 'RPC unreachable',
    syncFailed: 'Sync failed',
    unknownError: 'Unknown error',
    userRejected: 'You rejected the wallet request.',
    walletNotConnected: 'Wallet not connected',
    wrongNetwork: 'Wrong network. Please switch to the target chain.',
    requestTimeout: 'Request timeout, please try again later',
    networkConnectionFailed: 'Network connection failed, please check your network',
    rateLimitExceeded: 'Too many requests, please try again later',
    authenticationFailed: 'Authentication failed, please log in again',
    permissionDenied: 'Permission denied, you cannot perform this action',
    resourceNotFound: '{{resource}} not found',
    severity: 'Severity',
    severityCritical: 'Critical',
    severityHigh: 'High',
    severityMedium: 'Medium',
    severityLow: 'Low',
  },
  howItWorks: {
    step1: {
      desc: 'Anyone can publish any statement as fact, backed by a bond as collateral.',
      title: 'Assert Truth',
    },
    step2: {
      desc: 'During the liveness period, if the assertion is false, anyone can challenge it by staking an equal bond.',
      title: 'Verify & Dispute',
    },
    step3: {
      desc: "If unchallenged, the assertion holds. If disputed, UMA verifiers vote, and the winner takes the opponent's bond.",
      title: 'Settle & Reward',
    },
    title: 'How It Works',
  },
  nav: {
    adminTokens: 'Tokens',
    alerts: 'Alerts',
    audit: 'Audit',
    disputes: 'Disputes',
    myAssertions: 'My Assertions',
    myDisputes: 'My Disputes',
    oracle: 'Oracle',
    umaOracle: 'UMA Oracle',
    watchlist: 'Watchlist',
  },
  onboarding: {
    continueAsGeneral: 'Continue as General User',
    getStarted: 'Get Started',
    next: 'Next',
    roles: {
      developer: {
        description: 'Build with confidence using our Oracle data API',
        title: 'For Developers',
      },
      general_user: {
        description: 'Explore Oracle data and participate in the ecosystem',
        title: 'For General Users',
      },
      oracle_operator: {
        description: 'Manage your Oracle nodes and performance',
        title: 'For Oracle Operators',
      },
      protocol_team: {
        description: 'Ensure Oracle data reliability for your DeFi protocols',
        title: 'For Protocol Teams',
      },
    },
    selectRole: 'Please select your role to get a personalized tour:',
    skipTour: 'Skip Tour',
    steps: {
      developer: {
        api: {
          description: 'Explore our REST API for accessing Oracle data programmatically.',
          title: 'API Access',
        },
        integration: {
          description: 'Integrate Oracle data into your dApps with simple SDKs.',
          title: 'Easy Integration',
        },
        monitoring: {
          description: 'Track the performance of Oracle data in your applications.',
          title: 'Monitor Your Integrations',
        },
      },
      general_user: {
        assertions: {
          description: 'Create and track assertions on Oracle data.',
          title: 'Assertion Creation',
        },
        disputes: {
          description: 'Vote on disputes and shape the outcome.',
          title: 'Dispute Participation',
        },
        exploration: {
          description: 'Browse Oracle data across different markets and protocols.',
          title: 'Data Exploration',
        },
      },
      oracle_operator: {
        alerts: {
          description: 'Configure alerts for important events and anomalies.',
          title: 'Alert Management',
        },
        nodeMonitoring: {
          description: 'Monitor the performance and status of your Oracle nodes.',
          title: 'Node Monitoring',
        },
        syncStatus: {
          description: 'Track sync status and latency across chains.',
          title: 'Sync Status',
        },
      },
      protocol_team: {
        analytics: {
          description: 'Analyze Oracle performance across different markets.',
          title: 'Performance Analytics',
        },
        disputes: {
          description: 'Participate in disputes and ensure fair outcomes.',
          title: 'Dispute Resolution',
        },
        monitoring: {
          description: 'Monitor Oracle data trends and sync status for your protocols.',
          title: 'Real-time Monitoring',
        },
      },
    },
    title: 'Insight Quick Tour',
    welcome: 'Welcome to Insight',
    welcomeDesc:
      "Insight is your gateway to Oracle monitoring and dispute resolution. Let's take a quick tour to get you started.",
  },
  oracle: {
    alerts: {
      channels: 'Channels',
      channelsEmail: 'Email',
      channelsTelegram: 'Telegram',
      channelsWebhook: 'Webhook',
      description: 'Configure system monitoring and notification rules.',
      disabled: 'Disabled',
      enabled: 'Enabled',
      error: 'Failed to save',
      event: 'Trigger Event',
      events: {
        backlog_assertions: 'Assertion Backlog',
        backlog_disputes: 'Dispute Backlog',
        contract_paused: 'Contract Paused',
        database_slow_query: 'Slow Database Query',
        dispute_created: 'Dispute Created',
        execution_delayed: 'Execution Delayed',
        high_dispute_rate: 'High Dispute Rate',
        high_error_rate: 'High Error Rate',
        high_vote_divergence: 'High Vote Divergence',
        liveness_expiring: 'Liveness Expiring',
        low_gas: 'Low Gas Balance',
        low_participation: 'Low Participation',
        market_stale: 'Market Stale',
        price_deviation: 'Price Deviation',
        slow_api_request: 'Slow API Request',
        stale_sync: 'Stale Sync',
        sync_backlog: 'Sync Backlog',
        sync_error: 'Sync Error',
      },
      noRules: 'No rules found',
      opsAlertMttr: 'Alert MTTR',
      opsAlertsAcknowledged: 'Alerts ack',
      opsAlertsOpen: 'Alerts open',
      opsIncidentMttr: 'Incident MTTR',
      opsIncidentsOpen: 'Incidents open',
      opsMtta: 'MTTA',
      opsTitle: 'Ops',
      opsTrend: 'Ops trend',
      owner: 'Owner',
      ownerPlaceholder: 'e.g. alice@ops',
      params: {
        cooldownMs: 'Cooldown (minutes)',
        escalateAfterMs: 'Escalate after (minutes)',
        maxAgeMinutes: 'Max age (minutes)',
        maxDelayMinutes: 'Max Delay (minutes)',
        maxLagBlocks: 'Max Lag Blocks',
        maxMarginPercent: 'Max Margin (%)',
        maxOpenAssertions: 'Max Open Assertions',
        maxOpenDisputes: 'Max Open Disputes',
        minAssertions: 'Min Assertions',
        minBalanceEth: 'Min Gas Balance (ETH)',
        minTotalVotes: 'Min Total Votes',
        priceDeviationThreshold: 'Price Deviation Threshold (%)',
        thresholdMs: 'Threshold (ms)',
        thresholdPercent: 'Threshold (%)',
        windowDays: 'Window (days)',
        windowMinutes: 'Window (minutes)',
        withinMinutes: 'Within minutes',
      },
      recipient: 'Recipient',
      recipientPlaceholder: 'ops@example.com',
      rule: 'Rule Name',
      ruleId: 'Rule ID',
      runbook: 'Runbook',
      runbookPlaceholder: 'e.g. https://… or /docs/…',
      save: 'Save Config',
      saving: 'Saving...',
      severities: {
        critical: 'Critical',
        info: 'Info',
        warning: 'Warning',
      },
      severity: 'Severity',
      status: 'Status',
      success: 'Config saved',
      testFailed: 'Failed to send test',
      testSend: 'Send Test',
      testSending: 'Sending…',
      testSent: 'Test sent',
      title: 'Alert Rules',
      topRisks: 'Top risks',
      validation: {
        databaseSlowQueryThresholdMsPositive: 'Threshold must be a positive number',
        emailRecipientInvalid: 'Invalid recipient email format',
        emailRecipientRequired: 'Recipient is required when Email is enabled',
        executionDelayedMaxDelayMinutesPositive: 'Max delay minutes must be a positive number',
        highDisputeRateMinAssertionsPositive: 'Min assertions must be a positive number',
        highDisputeRateThresholdPercentRange: 'Threshold must be between 1 and 100',
        highDisputeRateWindowDaysPositive: 'Window days must be a positive number',
        highErrorRateThresholdPercentRange: 'Threshold must be between 1 and 100',
        highErrorRateWindowMinutesPositive: 'Window minutes must be a positive number',
        lowGasPositive: 'Minimum gas balance must be positive',
        marketStaleMaxAgeMsPositive: 'Max age must be a positive number',
        maxLagBlocksPositive: 'Max lag blocks must be a positive number',
        maxMarginPercentRange: 'Max margin must be between 1 and 100',
        maxOpenAssertionsPositive: 'Max open assertions must be a positive number',
        maxOpenDisputesPositive: 'Max open disputes must be a positive number',
        minTotalVotesNonNegative: 'Min total votes must be non-negative',
        minTotalVotesPositive: 'Min total votes must be positive',
        priceDeviationPositive: 'Price deviation threshold must be positive',
        slowApiThresholdMsPositive: 'Threshold must be a positive number',
        staleSyncMaxAgeMsPositive: 'Max age must be a positive number',
        withinMinutesPositive: 'Within minutes must be a positive number',
      },
    },
    card: {
      asserter: 'Asserter',
      assertion: 'Assertion',
      bond: 'Bond',
      disputer: 'Disputer',
      gridView: 'Grid view',
      listView: 'List view',
      livenessEnds: 'Liveness Ends',
      marketQuestion: 'Market Question',
      tx: 'Transaction',
    },
    charts: {
      activityDesc: 'Activity over time',
      anomalyNone: 'No significant anomalies detected',
      anomalyThreshold: 'Anomaly threshold',
      anomalyView: 'Anomaly view',
      dailyAssertions: 'Daily Assertions',
      dataQuality: 'Data Quality',
      dataQualityDesc: 'Oracle vs reference deviation and anomaly overview',
      dataQualitySummary: 'Quality summary',
      dataSamples: 'Samples',
      deviationAvg: 'Average deviation',
      deviationLatest: 'Latest deviation',
      deviationMax: 'Max deviation',
      deviationPercent: 'Deviation %',
      healthScore: 'Health score',
      lastSample: 'Latest sample',
      marketsDesc: 'Dispute concentration over the last 30 days',
      noData: 'No chart data',
      oraclePrice: 'Oracle price',
      referencePrice: 'Reference price',
      syncDesc: 'Indexer lag and duration over time',
      syncDuration: 'Sync duration (ms)',
      syncHealth: 'Sync Health',
      syncLagBlocks: 'Lag (blocks)',
      topMarkets: 'Top Markets',
      tvsCumulative: 'Total Value Secured (Cumulative)',
      tvsDesc: 'Cumulative value',
      waitingData: 'Waiting for more historical data to generate activity trends.',
    },
    config: {
      adminActor: 'Actor',
      adminActorPlaceholder: 'e.g. alice@ops',
      adminToken: 'Admin Token',
      chain: 'Chain',
      confirmationBlocks: 'Confirmation blocks',
      consecutiveFailures: 'Consecutive failures',
      contractAddress: 'Contract Address',
      demo: 'Demo',
      demoHint:
        'You are viewing demo data. Fill in config and click Sync Now to load on-chain data.',
      indexed: 'Indexed',
      indexedHint: 'Connected to on-chain data. Data refreshes automatically.',
      lagBlocks: 'Lag Blocks',
      lastBlock: 'Processed Block',
      latestBlock: 'Latest Block',
      maxBlockRange: 'Max Block Range',
      owner: 'Contract Owner',
      ownerType: 'Owner Type',
      ownerTypeContract: 'Contract / Multisig',
      ownerTypeEoa: 'Externally Owned Account (EOA)',
      ownerTypeUnknown: 'Unknown type',
      rpcActive: 'Active RPC',
      rpcUrl: 'RPC URL',
      safeBlock: 'Safe Block',
      save: 'Save',
      startBlock: 'Start Block',
      syncDuration: 'Duration',
      syncError: 'Last Error',
      syncing: 'Syncing…',
      syncNow: 'Sync Now',
      syncStatus: 'Sync',
      title: 'Connection & Sync',
      votingPeriodHours: 'Voting Period (hours)',
    },
    createAssertionModal: {
      assertionLabel: 'Assertion Statement',
      assertionPlaceholder: 'What is the truth you are asserting?',
      bondInvalid: 'Bond amount must be greater than 0',
      bondLabel: 'Bond Amount (ETH)',
      marketLabel: 'Market / ID',
      marketPlaceholder: 'e.g. ETH-USDC',
      protocolLabel: 'Protocol',
      protocolPlaceholder: 'e.g. Aave V3',
      submit: 'Create Assertion',
    },
    description: 'Real-time tracking of UMA Optimistic Oracle assertions and disputes.',
    detail: {
      actions: 'Actions',
      against: 'Against',
      assertedOutcome: 'Asserted Outcome',
      asserter: 'Asserter',
      back: 'Back',
      bondAmount: 'Bond Amount',
      cancel: 'Cancel',
      confirmDispute: 'Confirm Dispute',
      confirming: 'Confirming...',
      disputeActive: 'Dispute active',
      disputeAssertion: 'Dispute this Assertion',
      disputeRequiresBond: 'Disputing requires a bond of',
      errorNotFound: 'The requested assertion could not be found.',
      errorTitle: 'Error Loading Data',
      goBack: 'Go Back',
      hash: 'Hash',
      installWallet: 'Please install MetaMask or another Web3 wallet.',
      marketQuestion: 'Market Question',
      reason: 'Reason',
      reasonForDispute: 'Reason for dispute',
      reasonPlaceholder: 'Explain why this assertion is incorrect...',
      reasonRequired: 'Please provide a reason for the dispute.',
      relatedAssertion: 'Related assertion',
      relatedDispute: 'Related dispute',
      resolved: 'Resolved',
      resolvedDesc: 'This assertion has been successfully resolved.',
      riskImpactDesc: 'Related risk signals and potential impact',
      riskImpactTitle: 'Risk & Impact',
      riskNone: 'No related risks',
      settleAssertion: 'Settle assertion',
      settleDesc: 'This assertion has passed the challenge period and can be settled.',
      settlementFalse: 'Invalid / False',
      settlementResult: 'Settlement Result',
      settlementTrue: 'Valid / True',
      submitting: 'Submitting...',
      support: 'Support',
      timeline: 'Timeline',
      title: 'Assertion Details',
      transaction: 'Transaction',
      txFailed: 'Transaction failed',
      txSent: 'Transaction sent',
      validationError: 'Validation error',
      voteOnDispute: 'Vote on Dispute',
      votes: 'votes',
      walletNotFound: 'Wallet not detected',
    },
    disputeModal: {
      bondLabel: 'Bond (ETH)',
      desc: 'Submitting a dispute requires a bond.',
      reasonExample:
        'e.g. Official data shows the opposite outcome and the source was corrected.',
      reasonHint: 'Explain evidence, data sources, or timing.',
      submit: 'Submit Dispute',
      warning: 'Warning: If the assertion is verified as correct, you will lose your bond.',
    },
    healthScore: {
      critical: 'Critical',
      degraded: 'Degraded',
      excellent: 'Excellent',
      good: 'Good',
      title: 'Oracle Health Score',
    },
    leaderboard: {
      assertions: 'Assertions',
      bonded: 'Bonded',
      disputes: 'Disputes',
      noData: 'No data available',
      topAsserters: 'Top Asserters',
      topAssertersDesc: 'Most active contributors',
      topDisputers: 'Top Disputers',
      topDisputersDesc: 'Most active verifiers',
    },
    myActivity: 'My Activity',
    myActivityEmpty: "You haven't created any assertions yet.",
    myActivityTooltip: 'Only show assertions created by me',
    myAssertions: {
      connectWalletDesc: 'Please connect your wallet to see your assertion history.',
      connectWalletTitle: 'Connect Wallet to View',
      createFirst: 'Create your first assertion',
      description: 'Manage all assertions created by you.',
      noAssertions: "You haven't created any assertions yet.",
      searchPlaceholder: 'Search assertions…',
      title: 'My Assertions',
    },
    myDisputes: {
      connectWalletDesc: 'Please connect your wallet to see your dispute history.',
      connectWalletTitle: 'Connect Wallet to View',
      description: 'Manage all disputes initiated by you.',
      noDisputes: "You haven't initiated any disputes yet.",
      searchPlaceholder: 'Search disputes…',
      title: 'My Disputes',
    },
    myDisputesEmpty: "You haven't initiated any disputes yet.",
    myDisputesFilter: 'My Disputes',
    myDisputesTooltip: 'Only show disputes initiated by me',
    newAssertion: 'New Assertion',
    profile: {
      assertionsHistory: 'Assertions History',
      disputesHistory: 'Disputes History',
      title: 'Address Profile',
    },
    searchPlaceholder: 'Search assertions…',
    settleModal: {
      assertionId: 'Assertion ID',
      confirming: 'Confirming...',
      confirmSettle: 'Confirm Settlement',
      outcomeFalse: 'Invalid/False',
      outcomeFalseDesc: 'Confirm the assertion is invalid and false',
      outcomeTrue: 'Valid/True',
      outcomeTrueDesc: 'Confirm the assertion is valid and true',
      readyDesc:
        'The voting/liveness period has ended. You can now settle this assertion to resolve the outcome and distribute bonds/rewards.',
      readyTitle: 'Ready to Settle',
      selectOutcome: 'Select Settlement Outcome',
      selectOutcomeRequired: 'Select an outcome to continue',
      transactionNoteBody:
        'You will submit an on-chain transaction to settle this assertion. Confirm it in your wallet and wait for confirmation.',
      transactionNoteTitle: 'Transaction Note',
    },
    stats: {
      activeDisputes: 'Active Disputes',
      avgResolution: 'Avg Resolution Time',
      liveCap: 'Live oracle market capitalization',
      resolved24h: 'Resolved (24h)',
      totalAssertions: 'Total Assertions',
      totalBonded: 'Total Bonded',
      totalDisputes: 'Total Disputes',
      tvs: 'Total Value Secured',
      winRate: 'Win Rate',
    },
    sync: {
      block: 'Block Height',
      error: 'Sync Error',
      lagging: 'Lagging',
      lastUpdate: 'Last Update',
      status: 'Indexer Status',
      synced: 'Synced',
    },
    tabs: {
      leaderboard: 'Leaderboard',
      overview: 'Overview',
      tools: 'Tools',
    },
    timeline: {
      active: 'Active',
      asserted: 'Asserted',
      disputed: 'Disputed',
      livenessEnds: 'Liveness Ends',
      resolved: 'Resolved',
      votingEnds: 'Voting Ends',
    },
    title: 'Oracle Monitor',
    tx: {
      assertionCreatedMsg: 'Transaction submitted. It will appear shortly.',
      assertionCreatedTitle: 'Assertion Created',
      confirmedMsg: 'Transaction confirmed on-chain.',
      confirmedTitle: 'Confirmed',
      confirmingMsg: 'Transaction submitted. Waiting for confirmation.',
      confirmingTitle: 'Confirming',
      disputeSubmittedMsg: 'Your dispute has been submitted successfully.',
      disputeSubmittedTitle: 'Dispute Submitted',
      sentMsg: 'Your transaction has been submitted.',
      sentTitle: 'Transaction sent',
      settlementSubmittedMsg: 'The assertion has been settled.',
      settlementSubmittedTitle: 'Settlement Submitted',
      voteCastAgainstMsg: 'You voted to oppose the assertion.',
      voteCastSupportMsg: 'You voted to support the assertion.',
      voteCastTitle: 'Vote Cast',
    },
  },
  pnl: {
    bondAmount: 'Bond Amount (USD)',
    description: 'Estimate your potential returns',
    disclaimer: '*Assuming standard 1:1 bond escalation game logic.',
    iWantToAssert: 'I want to Assert',
    iWantToDispute: 'I want to Dispute',
    profit: 'Potential Profit',
    roi: 'ROI',
    title: 'Profit Calculator',
    totalReturn: 'Total Return',
  },
  sidebar: {
    notConnected: 'Not connected',
    userWallet: 'User Wallet',
  },
  status: {
    executed: 'Executed',
    pendingExecution: 'Pending Execution',
    voting: 'Voting',
  },
  tooltips: {
    assertion:
      'The fact you are stating. Ensure it is objective, verifiable, and has clear timing and sources.',
    bond: 'Bond is the collateral locked by the asserter. If the information is proven wrong, the bond is slashed.',
    liveness:
      'Liveness period is the window for anyone to dispute the assertion. After this, the assertion is treated as truth.',
    market:
      'Market Question defines what the oracle needs to answer, usually a Yes/No question or a value.',
    protocol: 'The name of the protocol or project this assertion relates to.',
    reward:
      "If no disputes occur, the asserter gets the bond back. If a dispute occurs and you win, you earn the opponent's bond.",
  },
  wallet: {
    balance: 'Balance',
    connect: 'Connect Wallet',
    connected: 'Wallet Connected',
    connectedMsg: 'Connected to',
    connecting: 'Connecting...',
    copyAddress: 'Copy Address',
    disconnect: 'Disconnect',
    failed: 'Connection Failed',
    install: 'Please install MetaMask or Rabby!',
    myProfile: 'My Profile',
    network: 'Network',
    networkAlreadySelected: 'Already on this network',
    networkSwitched: 'Network switched',
    networkSwitchFailed: 'Failed to switch network',
    notFound: 'Wallet Not Found',
    switchingNetwork: 'Switching…',
    unknownNetwork: 'Unknown network',
  },
  watchlist: {
    emptyDesc: "You haven't added any items to your watchlist yet.",
  },
  uma: {
    title: 'UMA Optimistic Oracle',
    description: 'Monitor UMA OOv2 and OOv3 assertions, disputes, and votes',
    syncNow: 'Sync Now',
    syncing: 'Syncing...',
    config: 'Config',
    idle: 'Idle',
    lastUpdated: 'Last updated',
    overview: 'overview',
    leaderboard: 'leaderboard',
    stats: 'stats',
    chain: 'Chain',
    assertions: 'Assertions',
    disputes: 'Disputes',
    lastSync: 'Last Sync',
    syncStatus: 'Sync Status',
    processedBlock: 'Processed Block',
    latestBlock: 'Latest Block',
    status: 'Status',
    contractAddresses: 'Contract Addresses',
    assertionsTitle: 'Assertions',
    disputesTitle: 'Disputes',
    votes: 'Votes',
    statistics: 'Statistics',
    address: 'Address',
    count: 'Count',
    won: 'Won',
    never: 'Never',
    disputesPage: {
      title: 'UMA Disputes',
      description: 'Total {{total}} disputes',
      allStatus: 'All Status',
      voting: 'Voting',
      resolved: 'Resolved',
      id: 'ID',
      assertion: 'Assertion',
      disputer: 'Disputer',
      bond: 'Bond',
      status: 'Status',
      created: 'Created',
      actions: 'Actions',
    },
    disputeDetail: {
      title: 'Dispute Details',
      totalVotes: 'Total Votes',
      uniqueVoters: 'Unique Voters',
      winner: 'Winner',
      assertionId: 'Assertion ID',
      identifier: 'Identifier',
      asserter: 'Asserter',
      payoutToAsserter: 'Payout to Asserter',
      payoutToDisputer: 'Payout to Disputer',
      disputeCreated: 'Dispute Created',
      votingEnded: 'Voting Ended',
      resolved: 'Resolved',
      claim: 'Claim',
      resolution: 'Resolution',
      disputeBond: 'Dispute Bond',
      block: 'Block',
      transaction: 'Transaction',
    },
    assertionsPage: {
      title: 'UMA Assertions',
      allStatus: 'All Status',
      proposed: 'Proposed',
      settled: 'Settled',
      allVersions: 'All Versions',
      id: 'ID',
      identifier: 'Identifier',
      version: 'Version',
      proposer: 'Proposer',
      proposedAt: 'Proposed At',
      assertionDetail: {
        title: 'Assertion Details',
      },
    },
    assertionDetail: {
      chain: 'Chain',
      version: 'Version',
      block: 'Block',
      proposedValue: 'Proposed Value',
      settlementValue: 'Settlement Value',
      bondUMA: 'Bond (UMA)',
      disputeBond: 'Dispute Bond',
      disputer: 'Disputer',
      votesFor: 'Votes For',
      votesAgainst: 'Votes Against',
      totalVoters: 'Total Voters',
      proposed: 'Proposed',
      disputed: 'Disputed',
      settled: 'Settled',
      for: 'For',
      against: 'Against',
    },
  },
};

// For now, use English as fallback for all languages
// In production, these should be properly translated
export const translations = {
  en: enTranslations,
  zh: enTranslations,
  es: enTranslations,
  fr: enTranslations,
  ko: enTranslations,
} as const;

// Type for translation keys - generated from English translations
export type TranslationKey = 
  | 'adminTokens.create'
  | 'adminTokens.createdAt'
  | 'adminTokens.description'
  | 'adminTokens.label'
  | 'adminTokens.revoke'
  | 'adminTokens.revokedAt'
  | 'adminTokens.role'
  | 'adminTokens.title'
  | 'adminTokens.tokenValue'
  | 'alerts.acknowledge'
  | 'alerts.actions.backlog_assertions.1'
  | 'alerts.actions.backlog_assertions.2'
  | 'alerts.actions.backlog_disputes.1'
  | 'alerts.actions.backlog_disputes.2'
  | 'alerts.actions.contract_paused.1'
  | 'alerts.actions.contract_paused.2'
  | 'alerts.actions.database_slow_query.1'
  | 'alerts.actions.database_slow_query.2'
  | 'alerts.actions.dispute_created.1'
  | 'alerts.actions.dispute_created.2'
  | 'alerts.actions.execution_delayed.1'
  | 'alerts.actions.execution_delayed.2'
  | 'alerts.actions.high_dispute_rate.1'
  | 'alerts.actions.high_dispute_rate.2'
  | 'alerts.actions.high_error_rate.1'
  | 'alerts.actions.high_error_rate.2'
  | 'alerts.actions.high_vote_divergence.1'
  | 'alerts.actions.high_vote_divergence.2'
  | 'alerts.actions.liveness_expiring.1'
  | 'alerts.actions.liveness_expiring.2'
  | 'alerts.actions.low_gas.1'
  | 'alerts.actions.low_gas.2'
  | 'alerts.actions.low_participation.1'
  | 'alerts.actions.low_participation.2'
  | 'alerts.actions.market_stale.1'
  | 'alerts.actions.market_stale.2'
  | 'alerts.actions.price_deviation.1'
  | 'alerts.actions.price_deviation.2'
  | 'alerts.actions.slow_api_request.1'
  | 'alerts.actions.slow_api_request.2'
  | 'alerts.actions.stale_sync.1'
  | 'alerts.actions.stale_sync.2'
  | 'alerts.actions.sync_backlog.1'
  | 'alerts.actions.sync_backlog.2'
  | 'alerts.actions.sync_error.1'
  | 'alerts.actions.sync_error.2'
  | 'alerts.adminActor'
  | 'alerts.adminActorPlaceholder'
  | 'alerts.adminToken'
  | 'alerts.adminTokenHint'
  | 'alerts.adminTokenWarning'
  | 'alerts.description'
  | 'alerts.explanation'
  | 'alerts.explanations.backlog_assertions'
  | 'alerts.explanations.backlog_disputes'
  | 'alerts.explanations.contract_paused'
  | 'alerts.explanations.database_slow_query'
  | 'alerts.explanations.dispute_created'
  | 'alerts.explanations.execution_delayed'
  | 'alerts.explanations.high_dispute_rate'
  | 'alerts.explanations.high_error_rate'
  | 'alerts.explanations.high_vote_divergence'
  | 'alerts.explanations.liveness_expiring'
  | 'alerts.explanations.low_gas'
  | 'alerts.explanations.low_participation'
  | 'alerts.explanations.market_stale'
  | 'alerts.explanations.price_deviation'
  | 'alerts.explanations.slow_api_request'
  | 'alerts.explanations.stale_sync'
  | 'alerts.explanations.sync_backlog'
  | 'alerts.explanations.sync_error'
  | 'alerts.lastSeen'
  | 'alerts.loadRules'
  | 'alerts.occurrences'
  | 'alerts.owner'
  | 'alerts.recommendedActions'
  | 'alerts.refresh'
  | 'alerts.resolve'
  | 'alerts.rules'
  | 'alerts.runbook'
  | 'alerts.saveRules'
  | 'alerts.savingRules'
  | 'alerts.searchPlaceholder'
  | 'alerts.severity'
  | 'alerts.silence24h'
  | 'alerts.silence2h'
  | 'alerts.silence30m'
  | 'alerts.silencedUntil'
  | 'alerts.status'
  | 'alerts.title'
  | 'alerts.type'
  | 'alerts.unsilence'
  | 'app.brand'
  | 'app.description'
  | 'app.logoAlt'
  | 'app.subtitle'
  | 'app.title'
  | 'audit.action'
  | 'audit.actionPlaceholder'
  | 'audit.actor'
  | 'audit.actorPlaceholder'
  | 'audit.adminToken'
  | 'audit.adminTokenHint'
  | 'audit.adminTokenPlaceholder'
  | 'audit.apply'
  | 'audit.clear'
  | 'audit.description'
  | 'audit.empty'
  | 'audit.entityId'
  | 'audit.entityIdPlaceholder'
  | 'audit.entityType'
  | 'audit.entityTypePlaceholder'
  | 'audit.error'
  | 'audit.exportCsv'
  | 'audit.exporting'
  | 'audit.exportJson'
  | 'audit.filters'
  | 'audit.query'
  | 'audit.queryPlaceholder'
  | 'audit.refresh'
  | 'audit.title'
  | 'audit.total'
  | 'chain.arbitrum'
  | 'chain.local'
  | 'chain.optimism'
  | 'chain.polygon'
  | 'validation.protocolLength'
  | 'validation.marketLength'
  | 'validation.assertionLength'
  | 'validation.invalidUrl'
  | 'batch.processing'
  | 'common.addToWatchlist'
  | 'common.all'
  | 'common.allLoaded'
  | 'common.breadcrumb'
  | 'common.cancel'
  | 'common.close'
  | 'common.closeMenu'
  | 'common.comingSoon'
  | 'common.confirm'
  | 'common.copied'
  | 'common.copyHash'
  | 'common.disputed'
  | 'common.example'
  | 'common.export'
  | 'common.home'
  | 'common.language'
  | 'common.loading'
  | 'common.loadMore'
  | 'common.min'
  | 'common.noData'
  | 'common.notNow'
  | 'common.ok'
  | 'common.openMenu'
  | 'common.pending'
  | 'common.popular'
  | 'common.refresh'
  | 'common.removeFromWatchlist'
  | 'common.resolved'
  | 'common.retry'
  | 'common.sidebar'
  | 'common.success'
  | 'common.usd'
  | 'common.viewDetails'
  | 'common.viewOnExplorer'
  | 'common.viewTx'
  | 'common.settings'
  | 'common.disconnect'
  | 'common.search'
  | 'common.notifications'
  | 'common.userMenu'
  | 'common.brand'
  | 'common.history'
  | 'common.undo'
  | 'common.redo'
  | 'common.clearHistory'
  | 'common.noHistory'
  | 'common.templates'
  | 'common.allSynced'
  | 'common.pwaSettings'
  | 'common.installation'
  | 'common.storage'
  | 'common.cacheSize'
  | 'common.networkStatus'
  | 'common.progress'
  | 'common.uniqueErrorTypes'
  | 'common.topErrors'
  | 'common.quickActions'
  | 'common.somethingWrong'
  | 'common.suggestedAction'
  | 'common.howToFix'
  | 'common.copyId'
  | 'common.sharePage'
  | 'common.navigation'
  | 'common.page'
  | 'common.of'
  | 'common.total'
  | 'common.previous'
  | 'common.next'
  | 'keyboardShortcuts.title'
  | 'keyboardShortcuts.pressAny'
  | 'pwa.install'
  | 'pwa.installDescription'
  | 'pwa.installTitle'
  | 'pwa.installing'
  | 'pwa.offline'
  | 'pwa.offlineDescription'
  | 'pwa.update'
  | 'pwa.updateAvailable'
  | 'pwa.updateDescription'
  | 'disputes.card.dispute'
  | 'disputes.card.disputer'
  | 'disputes.card.votes'
  | 'disputes.description'
  | 'disputes.disputedAt'
  | 'disputes.disputer'
  | 'disputes.emptyDesc'
  | 'disputes.emptyTitle'
  | 'disputes.endsAt'
  | 'disputes.reason'
  | 'disputes.reject'
  | 'disputes.support'
  | 'disputes.title'
  | 'disputes.totalVotesCast'
  | 'disputes.umaDvmActive'
  | 'disputes.viewOnUma'
  | 'disputes.votingProgress'
  | 'errorPage.description'
  | 'errorPage.digest'
  | 'errorPage.home'
  | 'errorPage.retry'
  | 'errorPage.title'
  | 'errors.apiError'
  | 'errors.chainNotAdded'
  | 'errors.contractNotFound'
  | 'errors.forbidden'
  | 'errors.httpError'
  | 'errors.insufficientFunds'
  | 'errors.invalidAddress'
  | 'errors.invalidApiResponse'
  | 'errors.invalidChain'
  | 'errors.invalidContractAddress'
  | 'errors.invalidJson'
  | 'errors.invalidMaxBlockRange'
  | 'errors.invalidRequestBody'
  | 'errors.invalidRpcUrl'
  | 'errors.invalidVotingPeriodHours'
  | 'errors.missingConfig'
  | 'errors.requestPending'
  | 'errors.rpcUnreachable'
  | 'errors.syncFailed'
  | 'errors.unknownError'
  | 'errors.userRejected'
  | 'errors.walletNotConnected'
  | 'errors.wrongNetwork'
  | 'errors.requestTimeout'
  | 'errors.networkConnectionFailed'
  | 'errors.rateLimitExceeded'
  | 'errors.authenticationFailed'
  | 'errors.permissionDenied'
  | 'errors.resourceNotFound'
  | 'errors.severity'
  | 'errors.severityCritical'
  | 'errors.severityHigh'
  | 'errors.severityMedium'
  | 'errors.severityLow'
  | 'howItWorks.step1.desc'
  | 'howItWorks.step1.title'
  | 'howItWorks.step2.desc'
  | 'howItWorks.step2.title'
  | 'howItWorks.step3.desc'
  | 'howItWorks.step3.title'
  | 'howItWorks.title'
  | 'nav.adminTokens'
  | 'nav.alerts'
  | 'nav.audit'
  | 'nav.disputes'
  | 'nav.myAssertions'
  | 'nav.myDisputes'
  | 'nav.oracle'
  | 'nav.umaOracle'
  | 'nav.watchlist'
  | 'onboarding.continueAsGeneral'
  | 'onboarding.getStarted'
  | 'onboarding.next'
  | 'onboarding.roles.developer.description'
  | 'onboarding.roles.developer.title'
  | 'onboarding.roles.general_user.description'
  | 'onboarding.roles.general_user.title'
  | 'onboarding.roles.oracle_operator.description'
  | 'onboarding.roles.oracle_operator.title'
  | 'onboarding.roles.protocol_team.description'
  | 'onboarding.roles.protocol_team.title'
  | 'onboarding.selectRole'
  | 'onboarding.skipTour'
  | 'onboarding.steps.developer.api.description'
  | 'onboarding.steps.developer.api.title'
  | 'onboarding.steps.developer.integration.description'
  | 'onboarding.steps.developer.integration.title'
  | 'onboarding.steps.developer.monitoring.description'
  | 'onboarding.steps.developer.monitoring.title'
  | 'onboarding.steps.general_user.assertions.description'
  | 'onboarding.steps.general_user.assertions.title'
  | 'onboarding.steps.general_user.disputes.description'
  | 'onboarding.steps.general_user.disputes.title'
  | 'onboarding.steps.general_user.exploration.description'
  | 'onboarding.steps.general_user.exploration.title'
  | 'onboarding.steps.oracle_operator.alerts.description'
  | 'onboarding.steps.oracle_operator.alerts.title'
  | 'onboarding.steps.oracle_operator.nodeMonitoring.description'
  | 'onboarding.steps.oracle_operator.nodeMonitoring.title'
  | 'onboarding.steps.oracle_operator.syncStatus.description'
  | 'onboarding.steps.oracle_operator.syncStatus.title'
  | 'onboarding.steps.protocol_team.analytics.description'
  | 'onboarding.steps.protocol_team.analytics.title'
  | 'onboarding.steps.protocol_team.disputes.description'
  | 'onboarding.steps.protocol_team.disputes.title'
  | 'onboarding.steps.protocol_team.monitoring.description'
  | 'onboarding.steps.protocol_team.monitoring.title'
  | 'onboarding.title'
  | 'onboarding.welcome'
  | 'onboarding.welcomeDesc'
  | 'oracle.alerts.channels'
  | 'oracle.alerts.channelsEmail'
  | 'oracle.alerts.channelsTelegram'
  | 'oracle.alerts.channelsWebhook'
  | 'oracle.alerts.description'
  | 'oracle.alerts.disabled'
  | 'oracle.alerts.enabled'
  | 'oracle.alerts.error'
  | 'oracle.alerts.event'
  | 'oracle.alerts.events.backlog_assertions'
  | 'oracle.alerts.events.backlog_disputes'
  | 'oracle.alerts.events.contract_paused'
  | 'oracle.alerts.events.database_slow_query'
  | 'oracle.alerts.events.dispute_created'
  | 'oracle.alerts.events.execution_delayed'
  | 'oracle.alerts.events.high_dispute_rate'
  | 'oracle.alerts.events.high_error_rate'
  | 'oracle.alerts.events.high_vote_divergence'
  | 'oracle.alerts.events.liveness_expiring'
  | 'oracle.alerts.events.low_gas'
  | 'oracle.alerts.events.low_participation'
  | 'oracle.alerts.events.market_stale'
  | 'oracle.alerts.events.price_deviation'
  | 'oracle.alerts.events.slow_api_request'
  | 'oracle.alerts.events.stale_sync'
  | 'oracle.alerts.events.sync_backlog'
  | 'oracle.alerts.events.sync_error'
  | 'oracle.alerts.noRules'
  | 'oracle.alerts.opsAlertMttr'
  | 'oracle.alerts.opsAlertsAcknowledged'
  | 'oracle.alerts.opsAlertsOpen'
  | 'oracle.alerts.opsIncidentMttr'
  | 'oracle.alerts.opsIncidentsOpen'
  | 'oracle.alerts.opsMtta'
  | 'oracle.alerts.opsTitle'
  | 'oracle.alerts.opsTrend'
  | 'oracle.alerts.owner'
  | 'oracle.alerts.ownerPlaceholder'
  | 'oracle.alerts.params.cooldownMs'
  | 'oracle.alerts.params.escalateAfterMs'
  | 'oracle.alerts.params.maxAgeMinutes'
  | 'oracle.alerts.params.maxDelayMinutes'
  | 'oracle.alerts.params.maxLagBlocks'
  | 'oracle.alerts.params.maxMarginPercent'
  | 'oracle.alerts.params.maxOpenAssertions'
  | 'oracle.alerts.params.maxOpenDisputes'
  | 'oracle.alerts.params.minAssertions'
  | 'oracle.alerts.params.minBalanceEth'
  | 'oracle.alerts.params.minTotalVotes'
  | 'oracle.alerts.params.priceDeviationThreshold'
  | 'oracle.alerts.params.thresholdMs'
  | 'oracle.alerts.params.thresholdPercent'
  | 'oracle.alerts.params.windowDays'
  | 'oracle.alerts.params.windowMinutes'
  | 'oracle.alerts.params.withinMinutes'
  | 'oracle.alerts.recipient'
  | 'oracle.alerts.recipientPlaceholder'
  | 'oracle.alerts.rule'
  | 'oracle.alerts.ruleId'
  | 'oracle.alerts.runbook'
  | 'oracle.alerts.runbookPlaceholder'
  | 'oracle.alerts.save'
  | 'oracle.alerts.saving'
  | 'oracle.alerts.severities.critical'
  | 'oracle.alerts.severities.info'
  | 'oracle.alerts.severities.warning'
  | 'oracle.alerts.severity'
  | 'oracle.alerts.status'
  | 'oracle.alerts.success'
  | 'oracle.alerts.testFailed'
  | 'oracle.alerts.testSend'
  | 'oracle.alerts.testSending'
  | 'oracle.alerts.testSent'
  | 'oracle.alerts.title'
  | 'oracle.alerts.topRisks'
  | 'oracle.alerts.validation.databaseSlowQueryThresholdMsPositive'
  | 'oracle.alerts.validation.emailRecipientInvalid'
  | 'oracle.alerts.validation.emailRecipientRequired'
  | 'oracle.alerts.validation.executionDelayedMaxDelayMinutesPositive'
  | 'oracle.alerts.validation.highDisputeRateMinAssertionsPositive'
  | 'oracle.alerts.validation.highDisputeRateThresholdPercentRange'
  | 'oracle.alerts.validation.highDisputeRateWindowDaysPositive'
  | 'oracle.alerts.validation.highErrorRateThresholdPercentRange'
  | 'oracle.alerts.validation.highErrorRateWindowMinutesPositive'
  | 'oracle.alerts.validation.lowGasPositive'
  | 'oracle.alerts.validation.marketStaleMaxAgeMsPositive'
  | 'oracle.alerts.validation.maxLagBlocksPositive'
  | 'oracle.alerts.validation.maxMarginPercentRange'
  | 'oracle.alerts.validation.maxOpenAssertionsPositive'
  | 'oracle.alerts.validation.maxOpenDisputesPositive'
  | 'oracle.alerts.validation.minTotalVotesNonNegative'
  | 'oracle.alerts.validation.minTotalVotesPositive'
  | 'oracle.alerts.validation.priceDeviationPositive'
  | 'oracle.alerts.validation.slowApiThresholdMsPositive'
  | 'oracle.alerts.validation.staleSyncMaxAgeMsPositive'
  | 'oracle.alerts.validation.withinMinutesPositive'
  | 'oracle.card.asserter'
  | 'oracle.card.assertion'
  | 'oracle.card.bond'
  | 'oracle.card.disputer'
  | 'oracle.card.gridView'
  | 'oracle.card.listView'
  | 'oracle.card.livenessEnds'
  | 'oracle.card.marketQuestion'
  | 'oracle.card.tx'
  | 'oracle.charts.activityDesc'
  | 'oracle.charts.anomalyNone'
  | 'oracle.charts.anomalyThreshold'
  | 'oracle.charts.anomalyView'
  | 'oracle.charts.dailyAssertions'
  | 'oracle.charts.dataQuality'
  | 'oracle.charts.dataQualityDesc'
  | 'oracle.charts.dataQualitySummary'
  | 'oracle.charts.dataSamples'
  | 'oracle.charts.deviationAvg'
  | 'oracle.charts.deviationLatest'
  | 'oracle.charts.deviationMax'
  | 'oracle.charts.deviationPercent'
  | 'oracle.charts.healthScore'
  | 'oracle.charts.lastSample'
  | 'oracle.charts.marketsDesc'
  | 'oracle.charts.noData'
  | 'oracle.charts.oraclePrice'
  | 'oracle.charts.referencePrice'
  | 'oracle.charts.syncDesc'
  | 'oracle.charts.syncDuration'
  | 'oracle.charts.syncHealth'
  | 'oracle.charts.syncLagBlocks'
  | 'oracle.charts.topMarkets'
  | 'oracle.charts.tvsCumulative'
  | 'oracle.charts.tvsDesc'
  | 'oracle.charts.waitingData'
  | 'oracle.config.adminActor'
  | 'oracle.config.adminActorPlaceholder'
  | 'oracle.config.adminToken'
  | 'oracle.config.chain'
  | 'oracle.config.confirmationBlocks'
  | 'oracle.config.consecutiveFailures'
  | 'oracle.config.contractAddress'
  | 'oracle.config.demo'
  | 'oracle.config.demoHint'
  | 'oracle.config.indexed'
  | 'oracle.config.indexedHint'
  | 'oracle.config.lagBlocks'
  | 'oracle.config.lastBlock'
  | 'oracle.config.latestBlock'
  | 'oracle.config.maxBlockRange'
  | 'oracle.config.owner'
  | 'oracle.config.ownerType'
  | 'oracle.config.ownerTypeContract'
  | 'oracle.config.ownerTypeEoa'
  | 'oracle.config.ownerTypeUnknown'
  | 'oracle.config.rpcActive'
  | 'oracle.config.rpcUrl'
  | 'oracle.config.safeBlock'
  | 'oracle.config.save'
  | 'oracle.config.startBlock'
  | 'oracle.config.syncDuration'
  | 'oracle.config.syncError'
  | 'oracle.config.syncing'
  | 'oracle.config.syncNow'
  | 'oracle.config.syncStatus'
  | 'oracle.config.title'
  | 'oracle.config.votingPeriodHours'
  | 'oracle.createAssertionModal.assertionLabel'
  | 'oracle.createAssertionModal.assertionPlaceholder'
  | 'oracle.createAssertionModal.bondInvalid'
  | 'oracle.createAssertionModal.bondLabel'
  | 'oracle.createAssertionModal.marketLabel'
  | 'oracle.createAssertionModal.marketPlaceholder'
  | 'oracle.createAssertionModal.protocolLabel'
  | 'oracle.createAssertionModal.protocolPlaceholder'
  | 'oracle.createAssertionModal.submit'
  | 'oracle.description'
  | 'oracle.detail.actions'
  | 'oracle.detail.against'
  | 'oracle.detail.assertedOutcome'
  | 'oracle.detail.asserter'
  | 'oracle.detail.back'
  | 'oracle.detail.bondAmount'
  | 'oracle.detail.cancel'
  | 'oracle.detail.confirmDispute'
  | 'oracle.detail.confirming'
  | 'oracle.detail.disputeActive'
  | 'oracle.detail.disputeAssertion'
  | 'oracle.detail.disputeRequiresBond'
  | 'oracle.detail.errorNotFound'
  | 'oracle.detail.errorTitle'
  | 'oracle.detail.goBack'
  | 'oracle.detail.hash'
  | 'oracle.detail.installWallet'
  | 'oracle.detail.marketQuestion'
  | 'oracle.detail.reason'
  | 'oracle.detail.reasonForDispute'
  | 'oracle.detail.reasonPlaceholder'
  | 'oracle.detail.reasonRequired'
  | 'oracle.detail.relatedAssertion'
  | 'oracle.detail.relatedDispute'
  | 'oracle.detail.resolved'
  | 'oracle.detail.resolvedDesc'
  | 'oracle.detail.riskImpactDesc'
  | 'oracle.detail.riskImpactTitle'
  | 'oracle.detail.riskNone'
  | 'oracle.detail.settleAssertion'
  | 'oracle.detail.settleDesc'
  | 'oracle.detail.settlementFalse'
  | 'oracle.detail.settlementResult'
  | 'oracle.detail.settlementTrue'
  | 'oracle.detail.submitting'
  | 'oracle.detail.support'
  | 'oracle.detail.timeline'
  | 'oracle.detail.title'
  | 'oracle.detail.transaction'
  | 'oracle.detail.txFailed'
  | 'oracle.detail.txSent'
  | 'oracle.detail.validationError'
  | 'oracle.detail.voteOnDispute'
  | 'oracle.detail.votes'
  | 'oracle.detail.walletNotFound'
  | 'oracle.disputeModal.bondLabel'
  | 'oracle.disputeModal.desc'
  | 'oracle.disputeModal.reasonExample'
  | 'oracle.disputeModal.reasonHint'
  | 'oracle.disputeModal.submit'
  | 'oracle.disputeModal.warning'
  | 'oracle.healthScore.critical'
  | 'oracle.healthScore.degraded'
  | 'oracle.healthScore.excellent'
  | 'oracle.healthScore.good'
  | 'oracle.healthScore.title'
  | 'oracle.leaderboard.assertions'
  | 'oracle.leaderboard.bonded'
  | 'oracle.leaderboard.disputes'
  | 'oracle.leaderboard.noData'
  | 'oracle.leaderboard.topAsserters'
  | 'oracle.leaderboard.topAssertersDesc'
  | 'oracle.leaderboard.topDisputers'
  | 'oracle.leaderboard.topDisputersDesc'
  | 'oracle.myActivity'
  | 'oracle.myActivityEmpty'
  | 'oracle.myActivityTooltip'
  | 'oracle.myAssertions.connectWalletDesc'
  | 'oracle.myAssertions.connectWalletTitle'
  | 'oracle.myAssertions.createFirst'
  | 'oracle.myAssertions.description'
  | 'oracle.myAssertions.noAssertions'
  | 'oracle.myAssertions.searchPlaceholder'
  | 'oracle.myAssertions.title'
  | 'oracle.myDisputes.connectWalletDesc'
  | 'oracle.myDisputes.connectWalletTitle'
  | 'oracle.myDisputes.description'
  | 'oracle.myDisputes.noDisputes'
  | 'oracle.myDisputes.searchPlaceholder'
  | 'oracle.myDisputes.title'
  | 'oracle.myDisputesEmpty'
  | 'oracle.myDisputesFilter'
  | 'oracle.myDisputesTooltip'
  | 'oracle.newAssertion'
  | 'oracle.profile.assertionsHistory'
  | 'oracle.profile.disputesHistory'
  | 'oracle.profile.title'
  | 'oracle.searchPlaceholder'
  | 'oracle.settleModal.assertionId'
  | 'oracle.settleModal.confirming'
  | 'oracle.settleModal.confirmSettle'
  | 'oracle.settleModal.outcomeFalse'
  | 'oracle.settleModal.outcomeFalseDesc'
  | 'oracle.settleModal.outcomeTrue'
  | 'oracle.settleModal.outcomeTrueDesc'
  | 'oracle.settleModal.readyDesc'
  | 'oracle.settleModal.readyTitle'
  | 'oracle.settleModal.selectOutcome'
  | 'oracle.settleModal.selectOutcomeRequired'
  | 'oracle.settleModal.transactionNoteBody'
  | 'oracle.settleModal.transactionNoteTitle'
  | 'oracle.stats.activeDisputes'
  | 'oracle.stats.avgResolution'
  | 'oracle.stats.liveCap'
  | 'oracle.stats.resolved24h'
  | 'oracle.stats.totalAssertions'
  | 'oracle.stats.totalBonded'
  | 'oracle.stats.totalDisputes'
  | 'oracle.stats.tvs'
  | 'oracle.stats.winRate'
  | 'oracle.sync.block'
  | 'oracle.sync.error'
  | 'oracle.sync.lagging'
  | 'oracle.sync.lastUpdate'
  | 'oracle.sync.status'
  | 'oracle.sync.synced'
  | 'oracle.tabs.leaderboard'
  | 'oracle.tabs.overview'
  | 'oracle.tabs.tools'
  | 'oracle.timeline.active'
  | 'oracle.timeline.asserted'
  | 'oracle.timeline.disputed'
  | 'oracle.timeline.livenessEnds'
  | 'oracle.timeline.resolved'
  | 'oracle.timeline.votingEnds'
  | 'oracle.title'
  | 'oracle.tx.assertionCreatedMsg'
  | 'oracle.tx.assertionCreatedTitle'
  | 'oracle.tx.confirmedMsg'
  | 'oracle.tx.confirmedTitle'
  | 'oracle.tx.confirmingMsg'
  | 'oracle.tx.confirmingTitle'
  | 'oracle.tx.disputeSubmittedMsg'
  | 'oracle.tx.disputeSubmittedTitle'
  | 'oracle.tx.sentMsg'
  | 'oracle.tx.sentTitle'
  | 'oracle.tx.settlementSubmittedMsg'
  | 'oracle.tx.settlementSubmittedTitle'
  | 'oracle.tx.voteCastAgainstMsg'
  | 'oracle.tx.voteCastSupportMsg'
  | 'oracle.tx.voteCastTitle'
  | 'pnl.bondAmount'
  | 'pnl.description'
  | 'pnl.disclaimer'
  | 'pnl.iWantToAssert'
  | 'pnl.iWantToDispute'
  | 'pnl.profit'
  | 'pnl.roi'
  | 'pnl.title'
  | 'pnl.totalReturn'
  | 'sidebar.notConnected'
  | 'sidebar.userWallet'
  | 'status.executed'
  | 'status.pendingExecution'
  | 'status.voting'
  | 'tooltips.assertion'
  | 'tooltips.bond'
  | 'tooltips.liveness'
  | 'tooltips.market'
  | 'tooltips.protocol'
  | 'tooltips.reward'
  | 'wallet.balance'
  | 'wallet.connect'
  | 'wallet.connected'
  | 'wallet.connectedMsg'
  | 'wallet.connecting'
  | 'wallet.copyAddress'
  | 'wallet.disconnect'
  | 'wallet.failed'
  | 'wallet.install'
  | 'wallet.myProfile'
  | 'wallet.network'
  | 'wallet.networkAlreadySelected'
  | 'wallet.networkSwitched'
  | 'wallet.networkSwitchFailed'
  | 'wallet.notFound'
  | 'wallet.switchingNetwork'
  | 'wallet.unknownNetwork'
  | 'watchlist.emptyDesc'
  | 'uma.title'
  | 'uma.description'
  | 'uma.syncNow'
  | 'uma.syncing'
  | 'uma.config'
  | 'uma.idle'
  | 'uma.lastUpdated'
  | 'uma.overview'
  | 'uma.leaderboard'
  | 'uma.stats'
  | 'uma.chain'
  | 'uma.assertions'
  | 'uma.disputes'
  | 'uma.lastSync'
  | 'uma.syncStatus'
  | 'uma.processedBlock'
  | 'uma.latestBlock'
  | 'uma.status'
  | 'uma.contractAddresses'
  | 'uma.assertionsTitle'
  | 'uma.disputesTitle'
  | 'uma.votes'
  | 'uma.statistics'
  | 'uma.address'
  | 'uma.count'
  | 'uma.won'
  | 'uma.never'
  | 'uma.disputesPage.title'
  | 'uma.disputesPage.description'
  | 'uma.disputesPage.allStatus'
  | 'uma.disputesPage.voting'
  | 'uma.disputesPage.resolved'
  | 'uma.disputesPage.id'
  | 'uma.disputesPage.assertion'
  | 'uma.disputesPage.disputer'
  | 'uma.disputesPage.bond'
  | 'uma.disputesPage.status'
  | 'uma.disputesPage.created'
  | 'uma.disputesPage.actions'
  | 'uma.disputeDetail.title'
  | 'uma.disputeDetail.totalVotes'
  | 'uma.disputeDetail.uniqueVoters'
  | 'uma.disputeDetail.winner'
  | 'uma.disputeDetail.assertionId'
  | 'uma.disputeDetail.identifier'
  | 'uma.disputeDetail.asserter'
  | 'uma.disputeDetail.payoutToAsserter'
  | 'uma.disputeDetail.payoutToDisputer'
  | 'uma.disputeDetail.disputeCreated'
  | 'uma.disputeDetail.votingEnded'
  | 'uma.disputeDetail.resolved'
  | 'uma.disputeDetail.claim'
  | 'uma.disputeDetail.resolution'
  | 'uma.disputeDetail.disputeBond'
  | 'uma.disputeDetail.block'
  | 'uma.disputeDetail.transaction'
  | 'uma.assertionsPage.title'
  | 'uma.assertionsPage.allStatus'
  | 'uma.assertionsPage.proposed'
  | 'uma.assertionsPage.settled'
  | 'uma.assertionsPage.allVersions'
  | 'uma.assertionsPage.id'
  | 'uma.assertionsPage.identifier'
  | 'uma.assertionsPage.version'
  | 'uma.assertionsPage.proposer'
  | 'uma.assertionsPage.proposedAt'
  | 'uma.assertionsPage.assertionDetail.title'
  | 'uma.assertionDetail.chain'
  | 'uma.assertionDetail.version'
  | 'uma.assertionDetail.block'
  | 'uma.assertionDetail.proposedValue'
  | 'uma.assertionDetail.settlementValue'
  | 'uma.assertionDetail.bondUMA'
  | 'uma.assertionDetail.disputeBond'
  | 'uma.assertionDetail.disputer'
  | 'uma.assertionDetail.votesFor'
  | 'uma.assertionDetail.votesAgainst'
  | 'uma.assertionDetail.totalVoters'
  | 'uma.assertionDetail.proposed'
  | 'uma.assertionDetail.disputed'
  | 'uma.assertionDetail.settled'
  | 'uma.assertionDetail.for'
  | 'uma.assertionDetail.against';

export function getUiErrorMessage(errorCode: string, t: (key: TranslationKey) => string) {
  if (errorCode === 'unknown_error') return t('errors.unknownError');
  if (errorCode.startsWith('http_')) return `${t('errors.httpError')} (${errorCode.slice(5)})`;
  if (errorCode === 'invalid_json') return t('errors.invalidJson');
  if (errorCode === 'invalid_json_response') return t('errors.invalidJson');
  if (errorCode === 'api_error') return t('errors.apiError');
  if (errorCode === 'invalid_api_response') return t('errors.invalidApiResponse');
  if (errorCode === 'api_unknown_error') return t('errors.unknownError');
  if (errorCode === 'missing_config') return t('errors.missingConfig');
  if (errorCode === 'invalid_rpc_url') return t('errors.invalidRpcUrl');
  if (errorCode === 'invalid_contract_address') return t('errors.invalidContractAddress');
  if (errorCode === 'invalid_chain') return t('errors.invalidChain');
  if (errorCode === 'invalid_request_body') return t('errors.invalidRequestBody');
  if (errorCode === 'invalid_address') return t('errors.invalidAddress');
  if (errorCode === 'invalid_max_block_range') return t('errors.invalidMaxBlockRange');
  if (errorCode === 'invalid_voting_period_hours') return t('errors.invalidVotingPeriodHours');
  if (errorCode === 'forbidden') return t('errors.forbidden');
  if (errorCode === 'rpc_unreachable') return t('errors.rpcUnreachable');
  if (errorCode === 'contract_not_found') return t('errors.contractNotFound');
  if (errorCode === 'sync_failed') return t('errors.syncFailed');
  if (errorCode === 'wallet_not_connected') return t('errors.walletNotConnected');
  if (errorCode === 'user_rejected') return t('errors.userRejected');
  if (errorCode === 'request_pending') return t('errors.requestPending');
  if (errorCode === 'chain_not_added') return t('errors.chainNotAdded');
  if (errorCode === 'wrong_network') return t('errors.wrongNetwork');
  if (errorCode === 'insufficient_funds') return t('errors.insufficientFunds');
  return errorCode;
}
