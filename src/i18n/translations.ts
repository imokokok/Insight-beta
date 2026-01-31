export type Lang = 'zh' | 'en' | 'es' | 'fr' | 'ko';

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

export const translations = {
  en: {
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
      resourceNotFound: '{resource} not found',
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
  },
  es: {
    adminTokens: {
      create: 'Crear',
      createdAt: 'Creado',
      description: 'Crea, rota y revoca tokens de administrador.',
      label: 'Etiqueta',
      revoke: 'Revocar',
      revokedAt: 'Revocado',
      role: 'Rol',
      title: 'Tokens',
      tokenValue: 'Nuevo token (se muestra una vez)',
    },
    alerts: {
      acknowledge: 'Confirmar',
      actions: {
        backlog_assertions: {
          1: 'Revisar la canalización de ingestión de afirmaciones',
          2: 'Limpiar la cola de afirmaciones atascadas',
        },
        backlog_disputes: {
          1: 'Revisar la canalización de procesamiento de disputas',
          2: 'Coordinar capacidad de votación/liquidación',
        },
        contract_paused: {
          1: 'Confirmar motivo y alcance de la pausa',
          2: 'Coordinar con el equipo del protocolo',
        },
        database_slow_query: {
          1: 'Revisar consultas lentas',
          2: 'Optimizar índices o cachés',
        },
        dispute_created: {
          1: 'Revisar detalles y evidencia de la disputa',
          2: 'Notificar a las partes interesadas y evaluar impacto',
        },
        execution_delayed: {
          1: 'Revisar la salud del ejecutor',
          2: 'Evaluar congestión on-chain',
        },
        high_dispute_rate: {
          1: 'Identificar mercados con picos',
          2: 'Revisar reglas de creación de afirmaciones',
        },
        high_error_rate: {
          1: 'Revisar registros de errores y métricas',
          2: 'Mitigar la causa raíz',
        },
        high_vote_divergence: {
          1: 'Revisar evidencia y foco de la disputa',
          2: 'Analizar causas de sesgo en votación',
        },
        liveness_expiring: {
          1: 'Verificar fuentes de datos de la afirmación',
          2: 'Disputar si es necesario antes del vencimiento',
        },
        low_gas: {
          1: 'Reponer saldo de gas',
          2: 'Configurar alertas de saldo mínimo',
        },
        low_participation: {
          1: 'Incentivar a los votantes a participar',
          2: 'Revisar incentivos y tiempos',
        },
        market_stale: {
          1: 'Verificar las fuentes de datos de mercado',
          2: 'Ajustar la cadencia de actualización',
        },
        price_deviation: {
          1: 'Comparar con fuentes de referencia',
          2: 'Revisar actualización de precios',
        },
        slow_api_request: {
          1: 'Revisar latencia de servicios y base de datos',
          2: 'Ajustar límites o escalar recursos',
        },
        stale_sync: {
          1: 'Identificar la etapa de sincronización detenida',
          2: 'Asignar más recursos de sincronización',
        },
        sync_backlog: {
          1: 'Inspeccionar la composición del atraso',
          2: 'Escalar el rendimiento del indexador',
        },
        sync_error: {
          1: 'Revisar logs de RPC/indexador',
          2: 'Reiniciar o cambiar a nodo de respaldo',
        },
      },
      adminActor: 'Actor',
      adminActorPlaceholder: 'p.ej. alice@ops',
      adminToken: 'Token de admin',
      adminTokenHint: 'Se guarda localmente en esta sesión para las APIs de administrador',
      adminTokenWarning:
        'Sin token solo puedes ver alertas; no podrás confirmar/resolver ni guardar reglas.',
      description: 'Agrupa alertas, confirma y sigue la salud.',
      explanation: 'Explicación',
      explanations: {
        backlog_assertions: 'El atraso de afirmaciones es mayor de lo esperado.',
        backlog_disputes: 'El atraso de disputas es mayor de lo esperado.',
        contract_paused: 'El contrato del oráculo está en pausa y los flujos están bloqueados.',
        database_slow_query: 'La latencia de consultas de la base de datos está elevada.',
        dispute_created: 'Se detectó una nueva disputa y puede afectar los resultados.',
        execution_delayed: 'La ejecución está retrasada más allá de la ventana esperada.',
        high_dispute_rate: 'La tasa de disputas está elevada y requiere revisión.',
        high_error_rate: 'La tasa de errores está elevada y requiere investigación.',
        high_vote_divergence: 'La divergencia de votos es alta; el resultado es incierto.',
        liveness_expiring: 'La ventana de liveness está por expirar pronto.',
        low_gas: 'El saldo de gas del nodo es bajo y las transacciones pueden fallar.',
        low_participation: 'La participación de votación está por debajo de lo esperado.',
        market_stale: 'Los datos de mercado parecen obsoletos y pueden estar desactualizados.',
        price_deviation: 'El precio del oráculo se desvía de las fuentes de referencia.',
        slow_api_request: 'La latencia de la API aumentó y puede afectar a los clientes.',
        stale_sync: 'La sincronización parece detenida más allá del umbral permitido.',
        sync_backlog: 'El atraso de sincronización está creciendo y los retrasos pueden aumentar.',
        sync_error: 'La sincronización del indexador falló y los datos pueden estar obsoletos.',
      },
      lastSeen: 'Última vez',
      loadRules: 'Cargar reglas',
      occurrences: 'Ocurrencias',
      owner: 'Responsable',
      recommendedActions: 'Acciones recomendadas',
      refresh: 'Actualizar',
      resolve: 'Resolver',
      rules: 'Reglas de alertas',
      runbook: 'Runbook',
      saveRules: 'Guardar',
      savingRules: 'Guardando…',
      searchPlaceholder: 'Buscar título/contenido/entidad…',
      severity: 'Severidad',
      silence24h: 'Silenciar 24 h',
      silence2h: 'Silenciar 2 h',
      silence30m: 'Silenciar 30 min',
      silencedUntil: 'Silenciado hasta',
      status: 'Estado',
      title: 'Alertas',
      type: 'Tipo',
      unsilence: 'Quitar silencio',
    },
    app: {
      brand: 'Insight',
      description: 'Monitoreo visual de disputas y liquidaciones de UMA Optimistic Oracle.',
      logoAlt: 'Logo de Insight',
      subtitle: 'Monitor de Oráculo',
      title: 'Insight · Monitor de liquidación UMA',
    },
    audit: {
      action: 'Acción',
      actionPlaceholder: 'p. ej. alert_rules_updated',
      actor: 'Actor',
      actorPlaceholder: 'p. ej. alice@ops',
      adminToken: 'Token de admin',
      adminTokenHint: 'Usa el mismo token de admin guardado en esta sesión.',
      adminTokenPlaceholder: 'Bearer …',
      apply: 'Aplicar',
      clear: 'Limpiar',
      description: 'Rastrea acciones de admin y cambios críticos.',
      empty: 'Aún no hay registros de auditoría.',
      entityId: 'ID de entidad',
      entityIdPlaceholder: 'p. ej. 0x…',
      entityType: 'Tipo de entidad',
      entityTypePlaceholder: 'p. ej. alerts',
      error: 'Error',
      exportCsv: 'Exportar CSV',
      exporting: 'Exportando…',
      exportJson: 'Exportar JSON',
      filters: 'Filtros',
      query: 'Búsqueda',
      queryPlaceholder: 'Buscar actor/acción/entidad/detalles…',
      refresh: 'Actualizar',
      title: 'Registro de Auditoría',
      total: 'Total',
    },
    chain: {
      arbitrum: 'Arbitrum',
      local: 'Local',
      optimism: 'Optimism',
      polygon: 'Polygon',
    },
    common: {
      addToWatchlist: 'Añadir a lista de seguimiento',
      all: 'Todo',
      allLoaded: 'Todo cargado',
      breadcrumb: 'Ruta de navegación',
      cancel: 'Cancelar',
      close: 'Cerrar',
      closeMenu: 'Cerrar menú',
      comingSoon: 'Próximamente',
      confirm: 'Confirmar',
      copied: 'Copiado',
      copyHash: 'Copiar hash',
      disputed: 'En disputa',
      example: 'Ejemplo',
      export: 'Exportar',
      home: 'Inicio',
      language: 'Idioma',
      loading: 'Cargando…',
      loadMore: 'Cargar más',
      min: 'Mínimo',
      noData: 'Sin datos',
      notNow: 'Ahora no',
      ok: 'OK',
      openMenu: 'Abrir menú',
      pending: 'Pendiente',
      popular: 'Popular',
      refresh: 'Actualizar',
      removeFromWatchlist: 'Eliminar de lista de seguimiento',
      resolved: 'Resuelto',
      retry: 'Reintentar',
      sidebar: 'Barra lateral',
      success: 'Éxito',
      usd: 'USD',
      viewDetails: 'Ver detalles',
      viewOnExplorer: 'Ver en el explorador',
      viewTx: 'Ver TX',
    },
    keyboardShortcuts: {
      title: 'Atajos de teclado',
      pressAny: 'Presiona cualquier tecla para cerrar',
    },
    pwa: {
      install: 'Instalar App',
      installDescription:
        'Añade Insight Oracle a tu pantalla de inicio para acceso rápido y soporte sin conexión.',
      installTitle: 'Instalar Insight Oracle',
      installing: 'Instalando…',
      offline: 'Estás sin conexión',
      offlineDescription: 'Algunas funciones pueden no estar disponibles hasta que te reconectes.',
      update: 'Actualizar',
      updateAvailable: 'Actualización disponible',
      updateDescription: 'Una nueva versión de Insight Oracle está disponible.',
    },
    disputes: {
      card: {
        dispute: 'Disputa',
        disputer: 'Disputante',
        votes: 'Votos',
      },
      description: 'Monitorea disputas activas, progreso de votación y resultados.',
      disputedAt: 'Disputado en',
      disputer: 'Disputante',
      emptyDesc: 'No hay disputas activas en el sistema.',
      emptyTitle: 'Sin disputas activas',
      endsAt: 'Termina',
      reason: 'Motivo de la disputa',
      reject: 'Rechazar',
      support: 'Apoyar',
      title: 'Disputas',
      totalVotesCast: 'Total de votos',
      umaDvmActive: 'UMA DVM Activo',
      viewOnUma: 'Ver en UMA',
      votingProgress: 'Progreso de votación',
    },
    errorPage: {
      description:
        'Nos disculpamos por las molestias. Ha ocurrido un error inesperado al procesar su solicitud.',
      digest: 'Resumen del error',
      home: 'Ir a Inicio',
      retry: 'Reintentar',
      title: 'Algo salió mal',
    },
    errors: {
      apiError: 'Error del servidor',
      chainNotAdded: 'Esta red no está añadida en tu cartera. Añádela primero.',
      contractNotFound: 'Contrato no encontrado',
      forbidden: 'Prohibido (se requiere token de administrador)',
      httpError: 'Falló la solicitud de red',
      insufficientFunds: 'Fondos insuficientes para pagar gas o el valor.',
      invalidAddress: 'Dirección inválida',
      invalidApiResponse: 'Respuesta de API inválida',
      invalidChain: 'Cadena inválida',
      invalidContractAddress: 'Dirección de contrato inválida',
      invalidJson: 'No se pudo analizar la respuesta',
      invalidMaxBlockRange: 'El rango máximo de bloques está fuera de los límites permitidos',
      invalidRequestBody: 'Cuerpo de solicitud inválido',
      invalidRpcUrl: 'RPC URL inválida',
      invalidVotingPeriodHours:
        'Las horas del período de votación están fuera de los límites permitidos',
      missingConfig: 'Falta configuración: RPC URL o dirección del contrato',
      requestPending: 'Ya hay una solicitud pendiente en la cartera. Revisa tu cartera.',
      rpcUnreachable: 'RPC inaccesible',
      syncFailed: 'Error de sincronización',
      unknownError: 'Error desconocido',
      userRejected: 'Has rechazado la solicitud de la cartera.',
      walletNotConnected: 'Cartera no conectada',
      wrongNetwork: 'Red incorrecta. Cambia a la cadena objetivo.',
      requestTimeout: 'Tiempo de espera agotado, por favor inténtalo de nuevo más tarde',
      networkConnectionFailed: 'Error de conexión de red, por favor verifica tu conexión',
      rateLimitExceeded: 'Demasiadas solicitudes, por favor inténtalo de nuevo más tarde',
      authenticationFailed: 'Error de autenticación, por favor inicia sesión de nuevo',
      permissionDenied: 'Permiso denegado, no puedes realizar esta acción',
      resourceNotFound: '{resource} no encontrado',
    },
    howItWorks: {
      step1: {
        desc: 'Cualquiera puede publicar cualquier declaración como hecho, respaldada por una fianza como garantía.',
        title: 'Afirmar Verdad',
      },
      step2: {
        desc: 'Durante el período de vigencia, si la afirmación es falsa, cualquiera puede impugnarla apostando una fianza igual.',
        title: 'Verificar y Disputar',
      },
      step3: {
        desc: 'Si no se impugna, la afirmación se mantiene. Si se disputa, los verificadores de UMA votan y el ganador se lleva la fianza del oponente.',
        title: 'Resolver y Recompensar',
      },
      title: 'Cómo Funciona',
    },
    nav: {
      adminTokens: 'Tokens',
      alerts: 'Alertas',
      audit: 'Auditoría',
      disputes: 'Disputas',
      myAssertions: 'Mis Aserciones',
      myDisputes: 'Mis Disputas',
      oracle: 'Oráculo',
      umaOracle: 'UMA Oráculo',
      watchlist: 'Lista de seguimiento',
    },
    onboarding: {
      continueAsGeneral: 'Continuar como usuario general',
      getStarted: 'Empezar',
      next: 'Siguiente',
      roles: {
        developer: {
          description: 'Construye con confianza usando nuestra API de datos de oráculo',
          title: 'Para desarrolladores',
        },
        general_user: {
          description: 'Explora los datos del oráculo y participa en el ecosistema',
          title: 'Para usuarios generales',
        },
        oracle_operator: {
          description: 'Gestiona tus nodos de oráculo y su rendimiento',
          title: 'Para operadores de oráculos',
        },
        protocol_team: {
          description: 'Asegura la fiabilidad de los datos del oráculo para tus protocolos DeFi',
          title: 'Para equipos de protocolo',
        },
      },
      selectRole: 'Selecciona tu rol para obtener un recorrido personalizado:',
      skipTour: 'Saltar recorrido',
      steps: {
        developer: {
          api: {
            description:
              'Explora nuestra API REST para acceder a datos de oráculo de forma programática.',
            title: 'Acceso a API',
          },
          integration: {
            description: 'Integra datos de oráculo en tus dApps con SDKs simples.',
            title: 'Integración sencilla',
          },
          monitoring: {
            description: 'Rastrea el rendimiento de los datos del oráculo en tus aplicaciones.',
            title: 'Monitorea tus integraciones',
          },
        },
        general_user: {
          assertions: {
            description: 'Crea y rastrea afirmaciones sobre datos de oráculo.',
            title: 'Creación de afirmaciones',
          },
          disputes: {
            description: 'Vota en disputas y forma el resultado.',
            title: 'Participación en disputas',
          },
          exploration: {
            description: 'Navega por los datos del oráculo en diferentes mercados y protocolos.',
            title: 'Exploración de datos',
          },
        },
        oracle_operator: {
          alerts: {
            description: 'Configura alertas para eventos importantes y anomalías.',
            title: 'Gestión de alertas',
          },
          nodeMonitoring: {
            description: 'Monitorea el rendimiento y estado de tus nodos de oráculo.',
            title: 'Monitoreo de nodos',
          },
          syncStatus: {
            description: 'Rastrea el estado de sincronización y latencia entre cadenas.',
            title: 'Estado de sincronización',
          },
        },
        protocol_team: {
          analytics: {
            description: 'Analiza el rendimiento del oráculo en diferentes mercados.',
            title: 'Análisis de rendimiento',
          },
          disputes: {
            description: 'Participa en disputas y asegura resultados justos.',
            title: 'Resolución de disputas',
          },
          monitoring: {
            description:
              'Monitorea las tendencias de datos del oráculo y el estado de sincronización para tus protocolos.',
            title: 'Monitoreo en tiempo real',
          },
        },
      },
      title: 'Insight: Recorrido Rápido',
      welcome: 'Bienvenido a Insight',
      welcomeDesc:
        'Insight es tu puerta de acceso al monitoreo de oráculos y resolución de disputas. Tomemos un recorrido rápido para comenzar.',
    },
    oracle: {
      alerts: {
        channels: 'Canales',
        channelsEmail: 'Email',
        channelsTelegram: 'Telegram',
        channelsWebhook: 'Webhook',
        description: 'Configura reglas de monitoreo y notificación.',
        disabled: 'Deshabilitado',
        enabled: 'Habilitado',
        error: 'Error al guardar',
        event: 'Evento activador',
        events: {
          backlog_assertions: 'Afirmaciones en cola',
          backlog_disputes: 'Disputas en cola',
          contract_paused: 'Contrato pausado',
          database_slow_query: 'Consulta lenta de base de datos',
          dispute_created: 'Disputa creada',
          execution_delayed: 'Ejecución retrasada',
          high_dispute_rate: 'Alta tasa de disputas',
          high_error_rate: 'Alta tasa de errores',
          high_vote_divergence: 'Alta divergencia de votos',
          liveness_expiring: 'Vigencia a punto de expirar',
          low_gas: 'Saldo de gas bajo',
          low_participation: 'Baja participación',
          market_stale: 'Mercado sin actualizar',
          price_deviation: 'Desviación de precio',
          slow_api_request: 'Solicitud API lenta',
          stale_sync: 'Sincronización estancada',
          sync_backlog: 'Retraso de sincronización',
          sync_error: 'Error de sincronización',
        },
        noRules: 'No hay reglas',
        opsAlertMttr: 'Tiempo medio de resolución de alertas',
        opsAlertsAcknowledged: 'Alertas reconocidas',
        opsAlertsOpen: 'Alertas abiertas',
        opsIncidentMttr: 'Tiempo medio de resolución de incidentes',
        opsIncidentsOpen: 'Incidentes abiertos',
        opsMtta: 'Tiempo medio de reconocimiento',
        opsTitle: 'Métricas de Operaciones',
        opsTrend: 'Tendencia de operaciones',
        owner: 'Responsable',
        ownerPlaceholder: 'p. ej. alice@ops',
        params: {
          cooldownMs: 'Enfriamiento (minutos)',
          escalateAfterMs: 'Escalar después de (minutos)',
          maxAgeMinutes: 'Antigüedad máxima (minutos)',
          maxDelayMinutes: 'Retraso máximo (minutos)',
          maxLagBlocks: 'Máximo de bloques de retraso',
          maxMarginPercent: 'Margen máximo (%)',
          maxOpenAssertions: 'Máximo de afirmaciones abiertas',
          maxOpenDisputes: 'Máximo de disputas abiertas',
          minAssertions: 'Afirmaciones mínimas',
          minBalanceEth: 'Saldo mínimo de gas (ETH)',
          minTotalVotes: 'Votos totales mínimos',
          priceDeviationThreshold: 'Umbral de desviación de precio (%)',
          thresholdMs: 'Umbral (ms)',
          thresholdPercent: 'Umbral (%)',
          windowDays: 'Ventana (días)',
          windowMinutes: 'Ventana (minutos)',
          withinMinutes: 'Ventana (minutos)',
        },
        recipient: 'Destinatario',
        recipientPlaceholder: 'ops@example.com',
        rule: 'Nombre de regla',
        ruleId: 'ID de regla',
        runbook: 'Runbook',
        runbookPlaceholder: 'p. ej. https://… o /docs/…',
        save: 'Guardar configuración',
        saving: 'Guardando...',
        severities: {
          critical: 'Crítico',
          info: 'Info',
          warning: 'Advertencia',
        },
        severity: 'Severidad',
        status: 'Estado',
        success: 'Configuración guardada',
        testFailed: 'Error al enviar la prueba',
        testSend: 'Enviar prueba',
        testSending: 'Enviando…',
        testSent: 'Prueba enviada',
        title: 'Reglas de Alertas',
        topRisks: 'Principales riesgos',
        validation: {
          databaseSlowQueryThresholdMsPositive: 'El umbral debe ser un número positivo',
          emailRecipientInvalid: 'Formato de email del destinatario inválido',
          emailRecipientRequired: 'El destinatario es obligatorio cuando Email está habilitado',
          executionDelayedMaxDelayMinutesPositive: 'El retraso máximo debe ser un número positivo',
          highDisputeRateMinAssertionsPositive: 'Las afirmaciones mínimas deben ser positivas',
          highDisputeRateThresholdPercentRange: 'El umbral debe estar entre 1 y 100',
          highDisputeRateWindowDaysPositive: 'Los días de ventana deben ser un número positivo',
          highErrorRateThresholdPercentRange: 'El umbral debe estar entre 1 y 100',
          highErrorRateWindowMinutesPositive: 'Los minutos de ventana deben ser un número positivo',
          lowGasPositive: 'El saldo mínimo de gas debe ser positivo',
          marketStaleMaxAgeMsPositive: 'La antigüedad máxima debe ser un número positivo',
          maxLagBlocksPositive: 'El máximo de bloques de retraso debe ser un número positivo',
          maxMarginPercentRange: 'El margen máximo debe estar entre 1 y 100',
          maxOpenAssertionsPositive:
            'El máximo de afirmaciones abiertas debe ser un número positivo',
          maxOpenDisputesPositive: 'El máximo de disputas abiertas debe ser un número positivo',
          minTotalVotesNonNegative: 'Los votos totales mínimos no pueden ser negativos',
          minTotalVotesPositive: 'Los votos totales mínimos deben ser positivos',
          priceDeviationPositive: 'El umbral de desviación de precio debe ser positivo',
          slowApiThresholdMsPositive: 'El umbral debe ser un número positivo',
          staleSyncMaxAgeMsPositive: 'La antigüedad máxima debe ser un número positivo',
          withinMinutesPositive: 'Los minutos de ventana deben ser un número positivo',
        },
      },
      card: {
        asserter: 'Afirmador',
        assertion: 'Afirmación',
        bond: 'Depósito',
        disputer: 'Disputante',
        gridView: 'Vista de cuadrícula',
        listView: 'Vista de lista',
        livenessEnds: 'Fin de vigencia',
        marketQuestion: 'Pregunta del mercado',
        tx: 'Transacción',
      },
      charts: {
        activityDesc: 'Actividad a lo largo del tiempo',
        anomalyNone: 'No se detectan anomalías significativas',
        anomalyThreshold: 'Umbral de anomalías',
        anomalyView: 'Vista de anomalías',
        dailyAssertions: 'Afirmaciones diarias',
        dataQuality: 'Calidad de datos',
        dataQualityDesc: 'Desviación y anomalías entre oráculo y referencia',
        dataQualitySummary: 'Resumen de calidad',
        dataSamples: 'Muestras',
        deviationAvg: 'Desviación promedio',
        deviationLatest: 'Desviación reciente',
        deviationMax: 'Desviación máxima',
        deviationPercent: 'Desviación %',
        healthScore: 'Puntaje de salud',
        lastSample: 'Última muestra',
        marketsDesc: 'Concentración de disputas en los últimos 30 días',
        noData: 'Sin datos de gráficos',
        oraclePrice: 'Precio del oráculo',
        referencePrice: 'Precio de referencia',
        syncDesc: 'Retraso y duración del indexador a lo largo del tiempo',
        syncDuration: 'Duración de sync (ms)',
        syncHealth: 'Salud de sincronización',
        syncLagBlocks: 'Retraso (bloques)',
        topMarkets: 'Mercados principales',
        tvsCumulative: 'Valor total asegurado (acumulado)',
        tvsDesc: 'Valor acumulado',
        waitingData: 'Esperando más datos históricos para generar tendencias de actividad.',
      },
      config: {
        adminActor: 'Actor',
        adminActorPlaceholder: 'p.ej. alice@ops',
        adminToken: 'Token de administrador',
        chain: 'Cadena',
        confirmationBlocks: 'Bloques de confirmación',
        consecutiveFailures: 'Fallos consecutivos',
        contractAddress: 'Dirección del contrato',
        demo: 'Demo',
        demoHint:
          'Estás viendo datos de demostración. Completa la configuración y pulsa Sincronizar.',
        indexed: 'Indexado',
        indexedHint: 'Conectado a datos on-chain. Los datos se actualizan automáticamente.',
        lagBlocks: 'Bloques de retraso',
        lastBlock: 'Bloque procesado',
        latestBlock: 'Último bloque',
        maxBlockRange: 'Rango máximo de bloques',
        owner: 'Owner del contrato',
        ownerType: 'Tipo de owner',
        ownerTypeContract: 'Contrato / Multisig',
        ownerTypeEoa: 'Cuenta externa (EOA)',
        ownerTypeUnknown: 'Tipo desconocido',
        rpcActive: 'RPC activo',
        rpcUrl: 'RPC URL',
        safeBlock: 'Bloque seguro',
        save: 'Guardar',
        startBlock: 'Bloque inicial',
        syncDuration: 'Duración',
        syncError: 'Último error',
        syncing: 'Sincronizando…',
        syncNow: 'Sincronizar',
        syncStatus: 'Sincronización',
        title: 'Conexión y sincronización',
        votingPeriodHours: 'Período de votación (horas)',
      },
      createAssertionModal: {
        assertionLabel: 'Declaración de afirmación',
        assertionPlaceholder: '¿Cuál es la verdad que afirmas?',
        bondInvalid: 'El depósito debe ser mayor que 0',
        bondLabel: 'Depósito (ETH)',
        marketLabel: 'Mercado / ID',
        marketPlaceholder: 'p. ej. ETH-USDC',
        protocolLabel: 'Protocolo',
        protocolPlaceholder: 'p. ej. Aave V3',
        submit: 'Crear afirmación',
      },
      description:
        'Seguimiento en tiempo real de afirmaciones y disputas de UMA Optimistic Oracle.',
      detail: {
        actions: 'Acciones',
        against: 'En contra',
        assertedOutcome: 'Resultado afirmado',
        asserter: 'Afirmador',
        back: 'Volver a la vista general',
        bondAmount: 'Monto del depósito',
        cancel: 'Cancelar',
        confirmDispute: 'Confirmar disputa',
        confirming: 'Confirmando…',
        disputeActive: 'Disputa activa',
        disputeAssertion: 'Disputar esta afirmación',
        disputeRequiresBond: 'Disputar requiere un depósito de',
        errorNotFound: 'La afirmación que busca no existe o ha sido eliminada.',
        errorTitle: 'Afirmación no encontrada',
        goBack: 'Volver',
        hash: 'Hash',
        installWallet: 'Instale MetaMask u otra billetera Web3.',
        marketQuestion: 'Pregunta del mercado',
        reason: 'Motivo',
        reasonForDispute: 'Motivo de la disputa',
        reasonPlaceholder: 'Explique por qué esta afirmación es incorrecta...',
        reasonRequired: 'Por favor, proporcione un motivo para la disputa.',
        relatedAssertion: 'Afirmación relacionada',
        relatedDispute: 'Disputa relacionada',
        resolved: 'Resuelto',
        resolvedDesc: 'Esta afirmación ha sido resuelta con éxito.',
        riskImpactDesc: 'Señales de riesgo relacionadas y posible impacto',
        riskImpactTitle: 'Riesgo e impacto',
        riskNone: 'No hay riesgos relacionados',
        settleAssertion: 'Liquidar afirmación',
        settleDesc: 'Esta afirmación ha pasado el período de desafío y puede ser liquidada.',
        settlementFalse: 'Inválido / Falso',
        settlementResult: 'Resultado de liquidación',
        settlementTrue: 'Válido / Verdadero',
        submitting: 'Enviando…',
        support: 'A favor',
        timeline: 'Cronología',
        title: 'Detalle de Afirmación',
        transaction: 'Transacción',
        txFailed: 'Transacción fallida',
        txSent: 'Transacción enviada',
        validationError: 'Error de validación',
        voteOnDispute: 'Votar en la disputa',
        votes: 'votos',
        walletNotFound: 'Billetera no encontrada',
      },
      disputeModal: {
        bondLabel: 'Depósito (ETH)',
        desc: 'Enviar una disputa requiere un depósito.',
        reasonExample:
          'p. ej. Los datos oficiales muestran el resultado opuesto y la fuente fue corregida.',
        reasonHint: 'Indica evidencia, fuente de datos o marco temporal.',
        submit: 'Enviar disputa',
        warning: 'Advertencia: Si la afirmación se verifica como correcta, perderá su fianza.',
      },
      healthScore: {
        critical: 'Crítico',
        degraded: 'Degradado',
        excellent: 'Excelente',
        good: 'Bueno',
        title: 'Puntaje de Salud del Oráculo',
      },
      leaderboard: {
        assertions: 'Afirmaciones',
        bonded: 'En fianza',
        disputes: 'Disputas',
        noData: 'Sin datos disponibles',
        topAsserters: 'Mejores Afirmadores',
        topAssertersDesc: 'Contribuyentes más activos',
        topDisputers: 'Mejores Disputantes',
        topDisputersDesc: 'Verificadores más activos',
      },
      myActivity: 'Mi Actividad',
      myActivityEmpty: 'Aún no has creado ninguna afirmación.',
      myActivityTooltip: 'Mostrar solo afirmaciones creadas por mí',
      myAssertions: {
        connectWalletDesc: 'Por favor, conecta tu cartera para ver tu historial de afirmaciones.',
        connectWalletTitle: 'Conectar cartera para ver',
        createFirst: 'Crea tu primera afirmación',
        description: 'Gestiona todas las afirmaciones creadas por ti.',
        noAssertions: 'Aún no has creado ninguna afirmación.',
        searchPlaceholder: 'Buscar afirmaciones…',
        title: 'Mis Afirmaciones',
      },
      myDisputes: {
        connectWalletDesc: 'Por favor, conecta tu cartera para ver tu historial de disputas.',
        connectWalletTitle: 'Conectar cartera para ver',
        description: 'Gestiona todas las disputas iniciadas por ti.',
        noDisputes: 'Aún no has iniciado ninguna disputa.',
        searchPlaceholder: 'Buscar disputas…',
        title: 'Mis Disputas',
      },
      myDisputesEmpty: 'Aún no has iniciado ninguna disputa.',
      myDisputesFilter: 'Mis Disputas',
      myDisputesTooltip: 'Mostrar solo disputas iniciadas por mí',
      newAssertion: 'Nueva Afirmación',
      profile: {
        assertionsHistory: 'Historial de Afirmaciones',
        disputesHistory: 'Historial de Disputas',
        title: 'Perfil de Dirección',
      },
      searchPlaceholder: 'Buscar afirmaciones…',
      settleModal: {
        assertionId: 'ID de afirmación',
        confirming: 'Confirmando...',
        confirmSettle: 'Confirmar liquidación',
        outcomeFalse: 'Inválido/Falso',
        outcomeFalseDesc: 'Confirmar que la afirmación es inválida y falsa',
        outcomeTrue: 'Válido/Veraz',
        outcomeTrueDesc: 'Confirmar que la afirmación es válida y verdadera',
        readyDesc:
          'El período de votación/vigencia ha terminado. Ahora puedes liquidar esta afirmación para resolver el resultado y distribuir depósitos/recompensas.',
        readyTitle: 'Listo para liquidar',
        selectOutcome: 'Seleccionar resultado de liquidación',
        selectOutcomeRequired: 'Selecciona un resultado',
        transactionNoteBody: 'Esta transacción incluirá una nota personalizada.',
        transactionNoteTitle: 'Nota de transacción',
      },
      stats: {
        activeDisputes: 'Disputas activas',
        avgResolution: 'Tiempo medio de resolución',
        liveCap: 'Capitalización de mercado de oráculo en vivo',
        resolved24h: 'Resueltas (24h)',
        totalAssertions: 'Afirmaciones totales',
        totalBonded: 'Total en fianza',
        totalDisputes: 'Disputas totales',
        tvs: 'Valor total asegurado',
        winRate: 'Tasa de aciertos',
      },
      sync: {
        block: 'Altura de Bloque',
        error: 'Error de Sync',
        lagging: 'Retrasado',
        lastUpdate: 'Última Actualización',
        status: 'Estado del Indexador',
        synced: 'Sincronizado',
      },
      tabs: {
        leaderboard: 'Clasificación',
        overview: 'Resumen',
        tools: 'Herramientas',
      },
      timeline: {
        active: 'Activo',
        asserted: 'Afirmado',
        disputed: 'Disputado',
        livenessEnds: 'Fin de vigencia',
        resolved: 'Resuelto',
        votingEnds: 'Fin de votación',
      },
      title: 'Monitor de Oráculo',
      tx: {
        assertionCreatedMsg: 'Transacción enviada. Aparecerá en breve.',
        assertionCreatedTitle: 'Afirmación creada',
        confirmedMsg: 'Transacción confirmada en la cadena.',
        confirmedTitle: 'Confirmada',
        confirmingMsg: 'Transacción enviada. Esperando confirmación.',
        confirmingTitle: 'Confirmando',
        disputeSubmittedMsg: 'Tu disputa se ha enviado correctamente.',
        disputeSubmittedTitle: 'Disputa enviada',
        sentMsg: 'Tu transacción ha sido enviada.',
        sentTitle: 'Transacción enviada',
        settlementSubmittedMsg: 'La afirmación ha sido liquidada.',
        settlementSubmittedTitle: 'Liquidación enviada',
        voteCastAgainstMsg: 'Has votado en contra de la afirmación.',
        voteCastSupportMsg: 'Has votado a favor de la afirmación.',
        voteCastTitle: 'Voto emitido',
      },
    },
    pnl: {
      bondAmount: 'Monto del Depósito (USD)',
      description: 'Estime sus retornos potenciales',
      disclaimer: '*Asumiendo lógica estándar de escalada de bonos 1:1.',
      iWantToAssert: 'Quiero Afirmar',
      iWantToDispute: 'Quiero Disputar',
      profit: 'Beneficio Potencial',
      roi: 'ROI',
      title: 'Calculadora de Ganancias',
      totalReturn: 'Retorno Total',
    },
    sidebar: {
      notConnected: 'No conectado',
      userWallet: 'Cartera de usuario',
    },
    status: {
      executed: 'Ejecutado',
      pendingExecution: 'Ejecución pendiente',
      voting: 'Votación',
    },
    tooltips: {
      assertion:
        'El hecho que estás afirmando. Asegúrate de que sea objetivo, verificable y tenga tiempos y fuentes claras.',
      bond: 'La fianza es el colateral bloqueado por el afirmante. Si la información es incorrecta, se pierde la fianza.',
      liveness:
        'El periodo de vida es la ventana para disputar. Después, la afirmación se considera verdadera.',
      market:
        'La pregunta de mercado define lo que el oráculo debe responder, usualmente Sí/No o un valor.',
      protocol: 'El nombre del protocolo o proyecto al que se refiere esta afirmación.',
      reward:
        'Si no hay disputas, se recupera la fianza. Si ganas una disputa, ganas la fianza del oponente.',
    },
    wallet: {
      balance: 'Saldo',
      connect: 'Conectar cartera',
      connected: 'Cartera conectada',
      connectedMsg: 'Conectado a',
      connecting: 'Conectando...',
      copyAddress: 'Copiar dirección',
      disconnect: 'Desconectar',
      failed: 'Conexión fallida',
      install: '¡Por favor, instala una cartera como MetaMask o Rabby!',
      myProfile: 'Mi perfil',
      network: 'Red',
      networkAlreadySelected: 'Ya estás en esta red',
      networkSwitched: 'Red cambiada',
      networkSwitchFailed: 'No se pudo cambiar la red',
      notFound: 'Cartera no encontrada',
      switchingNetwork: 'Cambiando…',
      unknownNetwork: 'Red desconocida',
    },
    watchlist: {
      emptyDesc: 'Aún no has añadido ningún elemento a tu lista de seguimiento.',
    },
  },
  fr: {
    adminTokens: {
      create: 'Créer',
      createdAt: 'Créé',
      description: "Créez, faites pivoter et révoquez les jetons d'administration.",
      label: 'Étiquette',
      revoke: 'Révoquer',
      revokedAt: 'Révoqué',
      role: 'Rôle',
      title: "Jetons d'administration",
      tokenValue: 'Nouveau jeton (affiché une fois)',
    },
    alerts: {
      acknowledge: 'Reconnaître',
      actions: {
        backlog_assertions: {
          1: "Vérifier le pipeline d'ingestion des assertions",
          2: "Débloquer la file d'assertions",
        },
        backlog_disputes: {
          1: 'Vérifier le pipeline de traitement des contestations',
          2: 'Coordonner la capacité de vote/règlement',
        },
        contract_paused: {
          1: 'Confirmer la raison et la portée de la pause',
          2: "Coordonner avec l'équipe protocole",
        },
        database_slow_query: {
          1: 'Examiner les requêtes lentes',
          2: 'Optimiser les index ou caches',
        },
        dispute_created: {
          1: 'Examiner les détails et preuves de la contestation',
          2: "Notifier les parties prenantes et évaluer l'impact",
        },
        execution_delayed: {
          1: "Vérifier la santé de l'exécuteur",
          2: 'Évaluer la congestion on-chain',
        },
        high_dispute_rate: {
          1: 'Identifier les marchés avec des pics',
          2: "Revoir les règles de création d'assertions",
        },
        high_error_rate: {
          1: "Examiner les logs d'erreurs et métriques",
          2: 'Atténuer la cause racine',
        },
        high_vote_divergence: {
          1: 'Examiner les preuves et le focus de la contestation',
          2: 'Analyser les causes de biais de vote',
        },
        liveness_expiring: {
          1: "Vérifier les sources de données de l'assertion",
          2: "Contester si nécessaire avant l'expiration",
        },
        low_gas: {
          1: 'Réapprovisionner le solde de gas',
          2: 'Configurer des alertes de solde minimum',
        },
        low_participation: {
          1: 'Inciter les votants à participer',
          2: 'Revoir les incitations et le calendrier',
        },
        market_stale: {
          1: 'Vérifier les sources de données de marché',
          2: 'Ajuster la cadence de mise à jour',
        },
        price_deviation: {
          1: 'Comparer aux sources de référence',
          2: 'Revoir la mise à jour des prix',
        },
        slow_api_request: {
          1: 'Examiner la latence des services et de la base',
          2: 'Ajuster les limites ou augmenter les ressources',
        },
        stale_sync: {
          1: "Identifier l'étape de synchronisation bloquée",
          2: 'Allouer davantage de ressources de synchronisation',
        },
        sync_backlog: {
          1: 'Inspecter la composition du backlog',
          2: "Augmenter le débit de l'indexeur",
        },
        sync_error: {
          1: 'Vérifier les logs RPC/indexeur',
          2: 'Redémarrer ou basculer vers un nœud de secours',
        },
      },
      adminActor: 'Acteur',
      adminActorPlaceholder: 'ex. alice@ops',
      adminToken: "Jeton d'administration",
      adminTokenHint: "Stocké localement dans cette session pour l'accès API administrateur",
      adminTokenWarning:
        'Sans jeton, vous ne pouvez que voir les alertes, pas les reconnaître/résoudre ni enregistrer les règles.',
      description: 'Aggrégez les alertes, reconnaissez-les et suivez la santé.',
      explanation: 'Explication',
      explanations: {
        backlog_assertions: "Le backlog d'assertions est supérieur aux attentes.",
        backlog_disputes: 'Le backlog de contestations est supérieur aux attentes.',
        contract_paused: "Le contrat de l'oracle est en pause et les flux sont bloqués.",
        database_slow_query: 'La latence des requêtes de base de données est élevée.',
        dispute_created: 'Une nouvelle contestation a été détectée et peut impacter les résultats.',
        execution_delayed: "L'exécution est retardée au-delà de la fenêtre attendue.",
        high_dispute_rate: 'Le taux de contestation est élevé et nécessite une revue.',
        high_error_rate: "Le taux d'erreur est élevé et nécessite une investigation.",
        high_vote_divergence: "La divergence de vote est élevée, l'issue est incertaine.",
        liveness_expiring: "La fenêtre de liveness est sur le point d'expirer.",
        low_gas: 'Le solde de gas du nœud est faible et les transactions peuvent échouer.',
        low_participation: 'La participation au vote est inférieure aux attentes.',
        market_stale: 'Les données de marché semblent obsolètes et peuvent être dépassées.',
        price_deviation: "Le prix de l'oracle s'écarte des sources de référence.",
        slow_api_request: "La latence de l'API a augmenté et peut impacter les clients.",
        stale_sync: 'La synchronisation semble bloquée au-delà du seuil autorisé.',
        sync_backlog: "Le backlog de synchronisation augmente et les retards peuvent s'accentuer.",
        sync_error:
          "La synchronisation de l'indexeur a échoué et les données peuvent être obsolètes.",
      },
      lastSeen: 'Dernière',
      loadRules: 'Charger les règles',
      occurrences: 'Occurrences',
      owner: 'Responsable',
      recommendedActions: 'Actions recommandées',
      refresh: 'Actualiser',
      resolve: 'Résoudre',
      rules: "Règles d'alerte",
      runbook: 'Runbook',
      saveRules: 'Enregistrer',
      savingRules: 'Enregistrement…',
      searchPlaceholder: 'Rechercher titre/contenu/entité…',
      severity: 'Gravité',
      silence24h: 'Sourdine 24 h',
      silence2h: 'Sourdine 2 h',
      silence30m: 'Sourdine 30 min',
      silencedUntil: "Mis en sourdine jusqu'à",
      status: 'Statut',
      title: 'Alertes',
      type: 'Type',
      unsilence: 'Annuler la sourdine',
    },
    app: {
      brand: 'Insight',
      description:
        "Surveillance visuelle des contestations et des règlements de l'UMA Optimistic Oracle.",
      logoAlt: 'Logo Insight',
      subtitle: "Surveillance de l'oracle",
      title: 'Insight · Surveillance UMA',
    },
    audit: {
      action: 'Action',
      actionPlaceholder: 'ex. alert_rules_updated',
      actor: 'Acteur',
      actorPlaceholder: 'ex. alice@ops',
      adminToken: "Jeton d'administration",
      adminTokenHint: "Utilisez le même jeton d'administration stocké dans cette session.",
      adminTokenPlaceholder: 'Bearer …',
      apply: 'Appliquer',
      clear: 'Effacer',
      description: "Suivez les actions d'administration et les modifications critiques.",
      empty: "Aucune entrée d'audit pour le moment.",
      entityId: "ID d'entité",
      entityIdPlaceholder: 'ex. 0x…',
      entityType: "Type d'entité",
      entityTypePlaceholder: 'ex. alerts',
      error: 'Erreur',
      exportCsv: 'Exporter CSV',
      exporting: 'Exportation…',
      exportJson: 'Exporter JSON',
      filters: 'Filtres',
      query: 'Recherche',
      queryPlaceholder: 'Rechercher acteur/action/entité/détails…',
      refresh: 'Actualiser',
      title: "Journal d'audit",
      total: 'Total',
    },
    chain: {
      arbitrum: 'Arbitrum',
      local: 'Local',
      optimism: 'Optimism',
      polygon: 'Polygon',
    },
    common: {
      addToWatchlist: 'Ajouter à la liste de surveillance',
      all: 'Tous',
      allLoaded: 'Tout chargé',
      breadcrumb: 'Fil d’Ariane',
      cancel: 'Annuler',
      close: 'Fermer',
      closeMenu: 'Fermer le menu',
      comingSoon: 'Bientôt disponible',
      confirm: 'Confirmer',
      copied: 'Copié',
      copyHash: 'Copier le hash',
      disputed: 'Contesté',
      example: 'Exemple',
      home: 'Accueil',
      language: 'Langue',
      loading: 'Chargement…',
      loadMore: 'Charger plus',
      min: 'Minimum',
      noData: 'Aucune donnée',
      ok: 'OK',
      openMenu: 'Ouvrir le menu',
      pending: 'En attente',
      popular: 'Populaire',
      removeFromWatchlist: 'Retirer de la liste de surveillance',
      resolved: 'Résolu',
      retry: 'Réessayer',
      sidebar: 'Barre latérale',
      success: 'Succès',
      usd: 'USD',
      viewDetails: 'Voir les détails',
      viewOnExplorer: "Voir sur l'explorateur",
      viewTx: 'Voir la transaction',
    },
    keyboardShortcuts: {
      title: 'Raccourcis clavier',
      pressAny: 'Appuyez sur une touche pour fermer',
    },
    disputes: {
      card: {
        dispute: 'Contestation',
        disputer: 'Contestataire',
        votes: 'Votes',
      },
      description:
        'Surveillez les contestations actives, suivez la progression des votes et analysez les résultats.',
      disputedAt: 'Contesté le',
      disputer: 'Contestataire',
      emptyDesc: "Il n'y a actuellement aucune contestation active dans le système.",
      emptyTitle: 'Aucune contestation active',
      endsAt: 'Se termine',
      reason: 'Raison de la contestation',
      reject: "Rejeter l'assertion",
      support: "Soutenir l'assertion",
      title: 'Règlement des contestations',
      totalVotesCast: 'Total des votes exprimés',
      umaDvmActive: 'UMA DVM Actif',
      viewOnUma: 'Voir sur UMA',
      votingProgress: 'Progression du vote',
    },
    errorPage: {
      description:
        "Nous nous excusons pour le désagrément. Une erreur inattendue s'est produite lors du traitement de votre demande.",
      digest: "Résumé de l'erreur",
      home: "Retourner à l'accueil",
      retry: 'Réessayer',
      title: "Quelque chose s'est mal passé",
    },
    errors: {
      apiError: 'Erreur serveur',
      chainNotAdded:
        "Ce réseau n'est pas ajouté dans votre portefeuille. Veuillez l'ajouter d'abord.",
      contractNotFound: 'Contrat non trouvé',
      forbidden: "Interdit (jeton d'administration requis)",
      httpError: 'Échec de la requête réseau',
      insufficientFunds:
        'Fonds insuffisants pour payer les frais de transaction ou le montant de transfert.',
      invalidAddress: "Format d'adresse incorrect",
      invalidApiResponse: 'Réponse API invalide',
      invalidChain: 'Configuration de chaîne incorrecte',
      invalidContractAddress: "Format d'adresse de contrat incorrect",
      invalidJson: "Échec de l'analyse de la réponse",
      invalidMaxBlockRange: "La plage de blocs maximale n'est pas dans les limites autorisées",
      invalidRequestBody: 'Paramètres de requête incorrects',
      invalidRpcUrl: "Format d'URL RPC incorrect",
      invalidVotingPeriodHours:
        "Le nombre d'heures de période de vote n'est pas dans les limites autorisées",
      missingConfig: 'Configuration manquante : URL RPC ou adresse de contrat',
      requestPending:
        'Une demande de portefeuille est déjà en attente. Veuillez vérifier votre portefeuille.',
      rpcUnreachable: 'RPC inaccessible',
      syncFailed: 'Échec de synchronisation',
      unknownError: 'Erreur inconnue',
      userRejected: 'Vous avez refusé la demande de portefeuille.',
      walletNotConnected: 'Portefeuille non connecté',
      wrongNetwork: 'Mauvais réseau. Veuillez basculer sur la chaîne cible.',
      requestTimeout: 'Délai de requête dépassé, veuillez réessayer plus tard',
      networkConnectionFailed: 'Échec de la connexion réseau, veuillez vérifier votre connexion',
      rateLimitExceeded: 'Trop de requêtes, veuillez réessayer plus tard',
      authenticationFailed: "Échec de l'authentification, veuillez vous reconnecter",
      permissionDenied: 'Permission refusée, vous ne pouvez pas effectuer cette action',
      resourceNotFound: '{resource} non trouvé',
    },
    howItWorks: {
      step1: {
        desc: "Quiconque peut publier toute déclaration comme un fait, accompagnée d'une caution en garantie.",
        title: 'Déclarer une vérité',
      },
      step2: {
        desc: "Pendant la période de vie, si l'assertion est fausse, quiconque peut la contester en bloquant un montant égal.",
        title: 'Vérifier et contester',
      },
      step3: {
        desc: "Si aucune contestation n'a lieu, l'assertion est valide. Si une contestation se produit, les vérificateurs UMA voteront et le gagnant prend la caution de l'opposant.",
        title: 'Régler et récompenser',
      },
      title: 'Comment ça fonctionne',
    },
    nav: {
      adminTokens: 'Jetons',
      alerts: 'Alertes',
      audit: 'Audit',
      disputes: 'Contestations',
      myAssertions: 'Mes assertions',
      myDisputes: 'Mes contestations',
      oracle: 'Oracle',
      umaOracle: 'UMA Oracle',
      watchlist: 'Liste de surveillance',
    },
    onboarding: {
      continueAsGeneral: "Continuer en tant qu'utilisateur général",
      getStarted: 'Commencer',
      next: 'Suivant',
      roles: {
        developer: {
          description: "Construisez avec confiance en utilisant notre API de données d'oracle",
          title: 'Pour les développeurs',
        },
        general_user: {
          description: "Explorez les données d'oracle et participez à l'écosystème",
          title: 'Pour les utilisateurs généraux',
        },
        oracle_operator: {
          description: "Gérez vos nœuds d'oracle et leur performance",
          title: "Pour les opérateurs d'oracles",
        },
        protocol_team: {
          description: "Assurez la fiabilité des données d'oracle pour vos protocoles DeFi",
          title: 'Pour les équipes de protocole',
        },
      },
      selectRole: 'Veuillez sélectionner votre rôle pour obtenir une visite personnalisée:',
      skipTour: 'Ignorer la visite',
      steps: {
        developer: {
          api: {
            description:
              "Explorez notre API REST pour accéder aux données d'oracle de manière programmatique.",
            title: 'Accès API',
          },
          integration: {
            description: "Intégrez les données d'oracle dans vos dApps avec des SDK simples.",
            title: 'Intégration simple',
          },
          monitoring: {
            description: "Suivez les performances des données d'oracle dans vos applications.",
            title: 'Surveillez vos intégrations',
          },
        },
        general_user: {
          assertions: {
            description: "Créez et suivez des assertions sur les données d'oracle.",
            title: "Création d'assertions",
          },
          disputes: {
            description: 'Votez sur les contestations et influencez le résultat.',
            title: 'Participation aux contestations',
          },
          exploration: {
            description: "Parcourez les données d'oracle sur différents marchés et protocoles.",
            title: 'Exploration des données',
          },
        },
        oracle_operator: {
          alerts: {
            description: 'Configurez des alertes pour les événements importants et les anomalies.',
            title: 'Gestion des alertes',
          },
          nodeMonitoring: {
            description: "Surveillez les performances et l'état de vos nœuds d'oracle.",
            title: 'Surveillance des nœuds',
          },
          syncStatus: {
            description: "Suivez l'état de synchronisation et la latence entre les chaînes.",
            title: 'État de synchronisation',
          },
        },
        protocol_team: {
          analytics: {
            description: "Analysez les performances de l'oracle sur différents marchés.",
            title: 'Analytiques de performance',
          },
          disputes: {
            description: 'Participez aux contestations et assurez des résultats équitables.',
            title: 'Résolution des contestations',
          },
          monitoring: {
            description:
              "Surveillez les tendances des données d'oracle et l'état de synchronisation pour vos protocoles.",
            title: 'Surveillance en temps réel',
          },
        },
      },
      title: 'Visite guidée Insight',
      welcome: 'Bienvenue dans Insight',
      welcomeDesc:
        'Insight est votre passerelle vers la surveillance des oracles et la résolution des contestations. Faisons une petite visite pour vous familiariser.',
    },
    oracle: {
      alerts: {
        channels: 'Canaux',
        channelsEmail: 'Email',
        channelsTelegram: 'Telegram',
        channelsWebhook: 'Webhook',
        description: 'Configurer les règles de surveillance et de notification du système.',
        disabled: 'Désactivé',
        enabled: 'Activé',
        error: "Échec de l'enregistrement",
        event: 'Événement de déclenchement',
        events: {
          backlog_assertions: "Arriéré d'assertions",
          backlog_disputes: 'Arriéré de contestations',
          contract_paused: 'Contrat suspendu',
          database_slow_query: 'Requête base de données lente',
          dispute_created: 'Contestation créée',
          execution_delayed: 'Exécution retardée',
          high_dispute_rate: 'Taux élevé de contestations',
          high_error_rate: "Taux d'erreur élevé",
          high_vote_divergence: 'Forte divergence de votes',
          liveness_expiring: 'Fin de validité imminente',
          low_gas: 'Solde de gas faible',
          low_participation: 'Participation faible',
          market_stale: 'Marché figé',
          price_deviation: 'Écart de prix',
          slow_api_request: 'Requête API lente',
          stale_sync: 'Synchronisation figée',
          sync_backlog: 'Retard de synchronisation',
          sync_error: 'Erreur de synchronisation',
        },
        noRules: 'Aucune règle',
        opsAlertMttr: 'Temps moyen de résolution des alertes',
        opsAlertsAcknowledged: 'Alertes acquittées',
        opsAlertsOpen: 'Alertes ouvertes',
        opsIncidentMttr: 'Temps moyen de résolution des incidents',
        opsIncidentsOpen: 'Incidents ouverts',
        opsMtta: "Temps moyen d'acquittement",
        opsTitle: 'Métriques opérationnelles',
        opsTrend: 'Tendance opérationnelle',
        owner: 'Responsable',
        ownerPlaceholder: 'ex. alice@ops',
        params: {
          cooldownMs: 'Délai de refroidissement (minutes)',
          escalateAfterMs: 'Escalade après (minutes)',
          maxAgeMinutes: 'Âge maximum (minutes)',
          maxDelayMinutes: 'Délai max (minutes)',
          maxLagBlocks: 'Blocs de retard max',
          maxMarginPercent: 'Marge max (%)',
          maxOpenAssertions: 'Assertions ouvertes max',
          maxOpenDisputes: 'Contestations ouvertes max',
          minAssertions: 'Assertions min',
          minBalanceEth: 'Solde min de gas (ETH)',
          minTotalVotes: 'Votes totaux min',
          priceDeviationThreshold: "Seuil d'écart de prix (%)",
          thresholdMs: 'Seuil (ms)',
          thresholdPercent: 'Seuil (%)',
          windowDays: 'Fenêtre (jours)',
          windowMinutes: 'Fenêtre (minutes)',
          withinMinutes: 'Fenêtre (minutes)',
        },
        recipient: 'Destinataire',
        recipientPlaceholder: 'ops@example.com',
        rule: 'Nom de la règle',
        ruleId: 'ID de règle',
        runbook: 'Runbook',
        runbookPlaceholder: 'ex. https://… ou /docs/…',
        save: 'Enregistrer la configuration',
        saving: 'Enregistrement…',
        severities: {
          critical: 'Critique',
          info: 'Info',
          warning: 'Avertissement',
        },
        severity: 'Gravité',
        status: 'Statut',
        success: 'Configuration enregistrée',
        testFailed: "Échec de l'envoi du test",
        testSend: 'Envoyer un test',
        testSending: 'Envoi…',
        testSent: 'Test envoyé',
        title: "Règles d'alerte",
        topRisks: 'Principaux risques',
        validation: {
          databaseSlowQueryThresholdMsPositive: 'Le seuil doit être un nombre positif',
          emailRecipientInvalid: "Format d'email du destinataire invalide",
          emailRecipientRequired: 'Le destinataire est requis lorsque Email est activé',
          executionDelayedMaxDelayMinutesPositive: 'Le délai max doit être un nombre positif',
          highDisputeRateMinAssertionsPositive: "Le nombre min d'assertions doit être positif",
          highDisputeRateThresholdPercentRange: 'Le seuil doit être entre 1 et 100',
          highDisputeRateWindowDaysPositive: 'Les jours de fenêtre doivent être positifs',
          highErrorRateThresholdPercentRange: 'Le seuil doit être entre 1 et 100',
          highErrorRateWindowMinutesPositive:
            'Les minutes de fenêtre doivent être un nombre positif',
          lowGasPositive: 'Le solde minimal de gas doit être positif',
          marketStaleMaxAgeMsPositive: "L'âge maximum doit être un nombre positif",
          maxLagBlocksPositive: 'Le nombre max de blocs de retard doit être positif',
          maxMarginPercentRange: 'La marge max doit être entre 1 et 100',
          maxOpenAssertionsPositive: "Le nombre max d'assertions ouvertes doit être positif",
          maxOpenDisputesPositive: 'Le nombre max de contestations ouvertes doit être positif',
          minTotalVotesNonNegative: 'Le nombre min de votes totaux ne peut pas être négatif',
          minTotalVotesPositive: 'Le nombre min de votes totaux doit être positif',
          priceDeviationPositive: "Le seuil d'écart de prix doit être positif",
          slowApiThresholdMsPositive: 'Le seuil doit être un nombre positif',
          staleSyncMaxAgeMsPositive: "L'âge maximum doit être un nombre positif",
          withinMinutesPositive: 'Les minutes de fenêtre doivent être un nombre positif',
        },
      },
      card: {
        asserter: 'Assertionneur',
        assertion: 'Assertion',
        bond: 'Caution',
        disputer: 'Contestataire',
        gridView: 'Vue grille',
        listView: 'Vue liste',
        livenessEnds: 'Fin de la période de vie',
        marketQuestion: 'Question de marché',
        tx: 'Transaction',
      },
      charts: {
        activityDesc: 'Activité au fil du temps',
        anomalyNone: 'Aucune anomalie notable détectée',
        anomalyThreshold: "Seuil d'anomalie",
        anomalyView: 'Vue des anomalies',
        dailyAssertions: 'Assertions quotidiennes',
        dataQuality: 'Qualité des données',
        dataQualityDesc: 'Écart et anomalies entre oracle et référence',
        dataQualitySummary: 'Résumé de qualité',
        dataSamples: 'Échantillons',
        deviationAvg: 'Écart moyen',
        deviationLatest: 'Dernier écart',
        deviationMax: 'Écart maximal',
        deviationPercent: 'Écart %',
        healthScore: 'Score de santé',
        lastSample: 'Dernier échantillon',
        marketsDesc: 'Concentration des contestations sur 30 jours',
        noData: 'Aucune donnée de graphique',
        oraclePrice: "Prix de l'oracle",
        referencePrice: 'Prix de référence',
        syncDesc: "Délai et durée de l'indexeur au fil du temps",
        syncDuration: 'Durée de synchronisation (ms)',
        syncHealth: 'Santé de la synchronisation',
        syncLagBlocks: 'Délai (blocs)',
        topMarkets: 'Marchés populaires',
        tvsCumulative: 'Valeur totale sécurisée (cumulée)',
        tvsDesc: 'Valeur cumulée',
        waitingData:
          "Attente de plus de données historiques pour générer des tendances d'activité.",
      },
      config: {
        adminActor: 'Acteur',
        adminActorPlaceholder: 'ex. alice@ops',
        adminToken: "Jeton d'administration",
        chain: 'Chaîne',
        confirmationBlocks: 'Blocs de confirmation',
        consecutiveFailures: 'Échecs consécutifs',
        contractAddress: 'Adresse du contrat',
        demo: 'Démo',
        demoHint:
          'Le mode démo utilise des données de test et ne se connecte pas à une chaîne réelle.',
        indexed: 'Indexé',
        indexedHint:
          'Connecté aux données on-chain. Les données sont mises à jour automatiquement.',
        lagBlocks: 'Retard (blocs)',
        lastBlock: 'Dernier bloc',
        latestBlock: 'Dernier bloc',
        maxBlockRange: 'Plage maximale de blocs',
        owner: 'Propriétaire',
        ownerType: 'Type de propriétaire',
        ownerTypeContract: 'Contrat',
        ownerTypeEoa: 'EOA',
        ownerTypeUnknown: 'Inconnu',
        rpcActive: 'RPC actif',
        rpcUrl: 'URL RPC',
        safeBlock: 'Bloc sûr',
        save: 'Enregistrer',
        startBlock: 'Bloc de démarrage',
        syncDuration: 'Durée',
        syncError: 'Dernière erreur',
        syncing: 'Synchronisation…',
        syncNow: 'Synchroniser',
        syncStatus: 'Statut de synchronisation',
        title: 'Connexion et synchronisation',
        votingPeriodHours: 'Période de vote (heures)',
      },
      createAssertionModal: {
        assertionLabel: 'Assertion',
        assertionPlaceholder: 'ex. 50000',
        bondInvalid: 'Le montant de la caution doit être un nombre positif',
        bondLabel: 'Caution (ETH)',
        marketLabel: 'Question de marché',
        marketPlaceholder: 'ex. BTC/USD à 8h00 UTC le 1er janvier?',
        protocolLabel: 'Protocole',
        protocolPlaceholder: 'ex. UMA, Chainlink',
        submit: "Créer l'assertion",
      },
      description:
        "Suivi en temps réel des assertions et des contestations de l'UMA Optimistic Oracle.",
      detail: {
        actions: 'Actions',
        against: 'Contre',
        assertedOutcome: 'Résultat asserté',
        asserter: 'Assertionneur',
        back: 'Retour',
        bondAmount: 'Montant de la caution',
        cancel: 'Annuler',
        confirmDispute: 'Confirmer la contestation',
        confirming: 'Confirmation…',
        disputeActive: 'Contestation active',
        disputeAssertion: 'Contester cette assertion',
        disputeRequiresBond: 'La contestation nécessite une caution de',
        errorNotFound: "L'assertion demandée n'a pas pu être trouvée.",
        errorTitle: 'Erreur de chargement des données',
        goBack: 'Retour',
        hash: 'Hash',
        installWallet: 'Veuillez installer MetaMask ou un autre portefeuille Web3.',
        marketQuestion: 'Question de marché',
        reason: 'Motif',
        reasonForDispute: 'Motif de la contestation',
        reasonPlaceholder: 'Expliquez pourquoi cette assertion est incorrecte…',
        reasonRequired: 'Veuillez fournir une raison pour la contestation.',
        relatedAssertion: 'Assertion liée',
        relatedDispute: 'Contestation liée',
        resolved: 'Résolu',
        resolvedDesc: 'Cette assertion a été résolue avec succès.',
        riskImpactDesc: 'Signaux de risque liés et impact potentiel',
        riskImpactTitle: 'Risque et impact',
        riskNone: 'Aucun risque lié',
        settleAssertion: "Régler l'assertion",
        settleDesc: 'Cette assertion a passé la période de contestation et peut être réglée.',
        settlementFalse: 'Invalide / Faux',
        settlementResult: 'Résultat du règlement',
        settlementTrue: 'Valide / Vrai',
        submitting: 'Soumission…',
        support: 'Prend en charge',
        timeline: 'Chronologie',
        title: "Détails de l'assertion",
        transaction: 'Transaction',
        txFailed: 'Échec de la transaction',
        txSent: 'Transaction envoyée',
        validationError: 'Erreur de validation',
        voteOnDispute: 'Voter sur la contestation',
        votes: 'votes',
        walletNotFound: 'Portefeuille non détecté',
      },
      disputeModal: {
        bondLabel: 'Caution (ETH)',
        desc: "Contester cette affirmation si vous pensez qu'elle est incorrecte.",
        reasonExample:
          'ex. Les données officielles montrent le résultat inverse et la source a été corrigée.',
        reasonHint: 'Expliquez pourquoi la réponse est incorrecte.',
        submit: 'Soumettre la contestation',
        warning:
          "Attention: Si la vérification confirme que l'assertion est correcte, vous perdrez votre caution.",
      },
      healthScore: {
        critical: 'Critique',
        degraded: 'Dégradé',
        excellent: 'Excellent',
        good: 'Bon',
        title: "Score de santé de l'oracle",
      },
      leaderboard: {
        assertions: 'Assertions',
        bonded: 'Caution',
        disputes: 'Contestations',
        noData: 'Aucune donnée disponible',
        topAsserters: 'Meilleurs assertionneurs',
        topAssertersDesc: 'Classement des assertionneurs par montant de caution verrouillé.',
        topDisputers: 'Meilleurs contestataires',
        topDisputersDesc: 'Classement des contestataires par montant de caution verrouillé.',
      },
      myActivity: 'Mon activité',
      myActivityEmpty: "Vous n'avez pas encore créé d'assertions.",
      myActivityTooltip: 'Afficher uniquement les assertions créées par moi',
      myAssertions: {
        connectWalletDesc:
          "Veuillez connecter votre portefeuille pour voir votre historique d'assertions.",
        connectWalletTitle: 'Connectez votre portefeuille pour voir',
        createFirst: 'Créer votre première assertion',
        description: 'Gérez toutes les assertions créées par vous.',
        noAssertions: "Vous n'avez pas encore créé d'assertions.",
        searchPlaceholder: 'Rechercher des assertions…',
        title: 'Mes assertions',
      },
      myDisputes: {
        connectWalletDesc:
          'Veuillez connecter votre portefeuille pour voir votre historique de contestations.',
        connectWalletTitle: 'Connectez votre portefeuille pour voir',
        description: 'Gérez toutes les contestations initiées par vous.',
        noDisputes: "Vous n'avez pas encore initié de contestations.",
        searchPlaceholder: 'Rechercher des contestations…',
        title: 'Mes contestations',
      },
      myDisputesEmpty: "Vous n'avez pas encore initié de contestations.",
      myDisputesFilter: 'Mes contestations',
      myDisputesTooltip: 'Afficher uniquement les contestations initiées par moi',
      newAssertion: 'Nouvelle assertion',
      profile: {
        assertionsHistory: 'Historique des assertions',
        disputesHistory: 'Historique des contestations',
        title: 'Profil',
      },
      searchPlaceholder: 'Rechercher des assertions…',
      settleModal: {
        assertionId: "ID d'assertion",
        confirming: 'Confirmation...',
        confirmSettle: 'Confirmer le règlement',
        outcomeFalse: 'Invalide/Faux',
        outcomeFalseDesc: "Confirmer que l'assertion est invalide et fausse",
        outcomeTrue: 'Valide/Vrai',
        outcomeTrueDesc: "Confirmer que l'assertion est valide et vraie",
        readyDesc:
          "La période de vote/d'activité est terminée. Vous pouvez désormais débloquer cette assertion pour résoudre le résultat et distribuer les cautions/récompenses.",
        readyTitle: 'Prêt à débloquer',
        selectOutcome: 'Sélectionner le résultat du règlement',
        selectOutcomeRequired: 'Sélectionnez un résultat',
        transactionNoteBody: 'Cette transaction inclura une note personnalisée.',
        transactionNoteTitle: 'Note de transaction',
      },
      stats: {
        activeDisputes: 'Contestations actives',
        avgResolution: 'Temps moyen de résolution',
        liveCap: "Capitalisation de l'oracle en direct",
        resolved24h: 'Résolues (24h)',
        totalAssertions: 'Assertions totales',
        totalBonded: 'Caution totale',
        totalDisputes: 'Contestations totales',
        tvs: 'Valeur totale sécurisée',
        winRate: 'Taux de succès',
      },
      sync: {
        block: 'Hauteur du bloc',
        error: 'Erreur de synchronisation',
        lagging: 'En retard',
        lastUpdate: 'Dernière mise à jour',
        status: "Statut de l'indexeur",
        synced: 'Synchronisé',
      },
      tabs: {
        leaderboard: 'Classement',
        overview: 'Aperçu',
        tools: 'Outils',
      },
      timeline: {
        active: 'Actif',
        asserted: 'Asserté',
        disputed: 'Contesté',
        livenessEnds: 'Fin de la période de vie',
        resolved: 'Résolu',
        votingEnds: 'Fin du vote',
      },
      title: "Surveillance de l'oracle",
      tx: {
        assertionCreatedMsg: 'Votre assertion a été créée avec succès.',
        assertionCreatedTitle: 'Assertion créée',
        confirmedMsg: 'La transaction a été confirmée.',
        confirmedTitle: 'Confirmé',
        confirmingMsg: 'La transaction est en attente de confirmation.',
        confirmingTitle: 'En attente de confirmation',
        disputeSubmittedMsg: 'Votre contestation a été soumise avec succès.',
        disputeSubmittedTitle: 'Contestation soumise',
        sentMsg: 'La transaction a été envoyée avec succès.',
        sentTitle: 'Transaction发送',
        settlementSubmittedMsg: 'Votre règlement a été soumis avec succès.',
        settlementSubmittedTitle: 'Règlement soumis',
        voteCastAgainstMsg: 'Vous avez votéd pour le camp du Contre.',
        voteCastSupportMsg: 'Vous avez voted pour le camp du Pour.',
        voteCastTitle: 'Vote enregistré',
      },
    },
    pnl: {
      bondAmount: 'Montant de la caution (USD)',
      description: 'Estimez vos rendements potentiels',
      disclaimer: "*Supposant une logique standard de jeu d'escalade de caution 1:1.",
      iWantToAssert: 'Je veux affirmer',
      iWantToDispute: 'Je veux contester',
      profit: 'Profit potentiel',
      roi: 'ROI',
      title: 'Calculateur de profit',
      totalReturn: 'Retour total',
    },
    sidebar: {
      notConnected: 'Non connecté',
      userWallet: 'Portefeuille utilisateur',
    },
    status: {
      executed: 'Exécuté',
      pendingExecution: 'Exécution en attente',
      voting: 'Voting',
    },
    tooltips: {
      assertion:
        "Le fait que vous déclarez. Assurez-vous qu'il est objectif, vérifiable et dispose d'un temps et d'une source clairs.",
      bond: "Le caution est le capital bloqué par l'assertionneur pour garantir la véracité des informations. Si les informations sont prouvées fausses, la caution est confisquée.",
      liveness:
        "La période de vie est la fenêtre temporelle permettant à quiconque de contester une assertion. Après cette période, l'assertion est considérée comme vraie.",
      market:
        "La question de marché définit ce que l'oracle doit répondre, généralement une question oui/non ou une valeur.",
      protocol: 'Le nom du protocole ou du projet concerné par cette assertion.',
      reward:
        "Si aucune contestation n'a lieu, l'assertionneur récupère sa caution. Si une contestation se produit et que vous gagnez, vous gagnez la caution de l'opposant en récompense.",
    },
    wallet: {
      balance: 'Solde',
      connect: 'Connecter le portefeuille',
      connected: 'Portefeuille connecté',
      connectedMsg: 'Connecté à',
      connecting: 'Connexion…',
      copyAddress: "Copier l'adresse",
      disconnect: 'Déconnecter',
      failed: 'Échec de la connexion',
      install: 'Veuillez installer MetaMask ou Rabby !',
      myProfile: 'Mon profil',
      network: 'Réseau',
      networkAlreadySelected: 'Déjà sur ce réseau',
      networkSwitched: 'Réseau basculé',
      networkSwitchFailed: 'Échec du basculement de réseau',
      notFound: 'Portefeuille non trouvé',
      switchingNetwork: 'Basculement…',
      unknownNetwork: 'Réseau inconnu',
    },
    watchlist: {
      emptyDesc: "Vous n'avez pas encore ajouté d'assertions à votre liste de surveillance.",
    },
  },
  ko: {
    adminTokens: {
      create: '생성',
      createdAt: '생성일',
      description: '관리자 토큰 생성, 회전 및 취소',
      label: '레이블',
      revoke: '취소',
      revokedAt: '취소일',
      role: '역할',
      title: '관리자 토큰',
      tokenValue: '새 토큰 (한 번만 표시)',
    },
    alerts: {
      acknowledge: '확인',
      actions: {
        backlog_assertions: {
          1: '주장 수집 파이프라인 점검',
          2: '정체된 주장 큐 정리',
        },
        backlog_disputes: {
          1: '분쟁 처리 파이프라인 점검',
          2: '투표/정산 처리 용량 조정',
        },
        contract_paused: {
          1: '중단 사유와 범위 확인',
          2: '프로토콜 팀과 협의',
        },
        database_slow_query: {
          1: '느린 쿼리 점검',
          2: '인덱스 또는 캐시 최적화',
        },
        dispute_created: {
          1: '분쟁 상세와 증거를 검토',
          2: '관계자에게 알리고 영향 평가',
        },
        execution_delayed: {
          1: '실행기 상태 점검',
          2: '온체인 혼잡도 평가',
        },
        high_dispute_rate: {
          1: '급증한 시장 파악',
          2: '주장 생성 규칙 검토',
        },
        high_error_rate: {
          1: '오류 로그와 지표 확인',
          2: '근본 원인 완화',
        },
        high_vote_divergence: {
          1: '증거와 분쟁 초점 검토',
          2: '투표 편향 원인 분석',
        },
        liveness_expiring: {
          1: '주장 데이터 소스를 확인',
          2: '필요 시 만료 전에 분쟁 제기',
        },
        low_gas: {
          1: '가스 잔액 보충',
          2: '최소 잔액 경고 설정',
        },
        low_participation: {
          1: '투표 참여 유도',
          2: '인센티브와 타이밍 검토',
        },
        market_stale: {
          1: '시장 데이터 소스 확인',
          2: '업데이트 주기 조정',
        },
        price_deviation: {
          1: '기준 소스와 비교',
          2: '가격 업데이트 재점검',
        },
        slow_api_request: {
          1: '서비스 및 데이터베이스 지연 점검',
          2: '제한 조정 또는 자원 확장',
        },
        stale_sync: {
          1: '정체된 동기화 단계 파악',
          2: '동기화 자원 추가 배정',
        },
        sync_backlog: {
          1: '적체 구성 확인',
          2: '인덱서 처리량 확장',
        },
        sync_error: {
          1: 'RPC/인덱서 로그 확인',
          2: '재시작 또는 백업 노드로 전환',
        },
      },
      adminActor: '행위자',
      adminActorPlaceholder: '예: alice@ops',
      adminToken: '관리자 토큰',
      adminTokenHint: '관리자 API 접근을 위해 이 세션에 로컬로 저장됨',
      adminTokenWarning:
        '토큰 없이는 경고를 보기만 할 수 있고, 확인/해결하거나 규칙을 저장할 수 없습니다.',
      description: '경고 집계, 확인 및 건강 추적',
      explanation: '설명',
      explanations: {
        backlog_assertions: '주장 적체가 예상보다 높습니다.',
        backlog_disputes: '분쟁 적체가 예상보다 높습니다.',
        contract_paused: '오라클 계약이 일시 중지되어 워크플로가 차단되었습니다.',
        database_slow_query: '데이터베이스 쿼리 지연이 높습니다.',
        dispute_created: '새로운 분쟁이 감지되었으며 결과에 영향을 줄 수 있습니다.',
        execution_delayed: '실행이 예상된 창을 넘어 지연되고 있습니다.',
        high_dispute_rate: '분쟁률이 높아 검토가 필요합니다.',
        high_error_rate: '오류율이 높아 조사가 필요합니다.',
        high_vote_divergence: '투표 분산이 높아 결과가 불확실합니다.',
        liveness_expiring: '챌린지 기간이 곧 만료됩니다.',
        low_gas: '노드 가스 잔액이 낮아 트랜잭션이 실패할 수 있습니다.',
        low_participation: '투표 참여도가 예상보다 낮습니다.',
        market_stale: '시장 데이터가 오래되어 최신이 아닐 수 있습니다.',
        price_deviation: '오라클 가격이 기준 소스와 괴리됩니다.',
        slow_api_request: 'API 지연이 증가하여 클라이언트에 영향을 줄 수 있습니다.',
        stale_sync: '동기화가 허용 임계값을 넘어 정체된 것으로 보입니다.',
        sync_backlog: '동기화 적체가 증가하고 지연이 확대될 수 있습니다.',
        sync_error: '인덱서 동기화가 실패하여 데이터가 오래되었을 수 있습니다.',
      },
      lastSeen: '마지막',
      loadRules: '규칙 로드',
      occurrences: '발생 횟수',
      owner: '담당자',
      recommendedActions: '권장 조치',
      refresh: '새로 고침',
      resolve: '해결',
      rules: '경고 규칙',
      runbook: 'Runbook',
      saveRules: '저장',
      savingRules: '저장 중…',
      searchPlaceholder: '제목/내용/엔티티 검색…',
      severity: '심각도',
      silence24h: '24시간 정숙',
      silence2h: '2시간 정숙',
      silence30m: '30분 정숙',
      silencedUntil: '다음까지 정숙',
      status: '상태',
      title: '경고',
      type: '유형',
      unsilence: '정숙 해제',
    },
    app: {
      brand: 'Insight',
      description: 'UMA Optimistic Oracle 분쟁 및 결제의 시각적 모니터링',
      logoAlt: 'Insight 로고',
      subtitle: '오라클 모니터링',
      title: 'Insight · UMA 모니터링',
    },
    audit: {
      action: '작업',
      actionPlaceholder: '예: alert_rules_updated',
      actor: '행위자',
      actorPlaceholder: '예: alice@ops',
      adminToken: '관리자 토큰',
      adminTokenHint: '이 세션에 저장된 동일한 관리자 토큰을 사용하세요.',
      adminTokenPlaceholder: 'Bearer …',
      apply: '적용',
      clear: '지우기',
      description: '관리자 작업과 중요한 변경사항 추적',
      empty: '아직 감사 항목이 없습니다.',
      entityId: '엔터티 ID',
      entityIdPlaceholder: '예: 0x…',
      entityType: '엔터티 유형',
      entityTypePlaceholder: '예: alerts',
      error: '오류',
      exportCsv: 'CSV 내보내기',
      exporting: '내보내는 중…',
      exportJson: 'JSON 내보내기',
      filters: '필터',
      query: '검색',
      queryPlaceholder: '행위자/작업/엔터티/세부정보 검색…',
      refresh: '새로 고침',
      title: '감사 로그',
      total: '총계',
    },
    chain: {
      arbitrum: 'Arbitrum',
      local: '로컬',
      optimism: 'Optimism',
      polygon: 'Polygon',
    },
    common: {
      addToWatchlist: '관심 목록에 추가',
      all: '전체',
      allLoaded: '모두 로드됨',
      breadcrumb: '탐색 경로',
      cancel: '취소',
      close: '닫기',
      closeMenu: '메뉴 닫기',
      comingSoon: '곧 출시됩니다',
      confirm: '확인',
      copied: '복사됨',
      copyHash: '해시 복사',
      disputed: '분쟁 중',
      example: '예시',
      home: '홈',
      language: '언어',
      loading: '로딩 중…',
      loadMore: '더 불러오기',
      min: '최소',
      noData: '데이터가 없습니다',
      ok: '확인',
      openMenu: '메뉴 열기',
      pending: '대기 중',
      popular: '인기',
      refresh: '새로고침',
      removeFromWatchlist: '관심 목록에서 제거',
      resolved: '해결됨',
      retry: '재시도',
      sidebar: '사이드바',
      success: '성공',
      usd: 'USD',
      viewDetails: '세부 정보 보기',
      viewOnExplorer: '탐색기에서 보기',
      viewTx: '거래 보기',
    },
    keyboardShortcuts: {
      title: '단축키',
      pressAny: '아무 키나 눌러서 닫기',
    },
    pwa: {
      install: '앱 설치',
      installDescription:
        '빠른 액세스와 오프라인 지원을 위해 Insight Oracle을 홈 화면에 추가하세요.',
      installTitle: 'Insight Oracle 설치',
      installing: '설치 중…',
      offline: '오프라인 상태입니다',
      offlineDescription: '다시 연결할 때까지 일부 기능을 사용할 수 없습니다.',
      update: '업데이트',
      updateAvailable: '업데이트 가능',
      updateDescription: '새로운 버전의 Insight Oracle이 있습니다.',
    },
    disputes: {
      card: {
        dispute: '분쟁',
        disputer: '异议자',
        votes: '투표',
      },
      description: '활성 분쟁 모니터링, 투표 진행 상황 및 결과 분석',
      disputedAt: '异议 일시',
      disputer: '异议자',
      emptyDesc: '현재 시스템에 활성 분쟁이 없습니다.',
      emptyTitle: '활성 분쟁이 없습니다',
      endsAt: '종료 일시',
      reason: '분쟁 이유',
      reject: '거부',
      support: '지지',
      title: '분쟁 결제',
      totalVotesCast: '총 투표 수',
      umaDvmActive: 'UMA DVM 활성',
      viewOnUma: 'UMA에서 보기',
      votingProgress: '투표 진행 상황',
    },
    errorPage: {
      description: '불편을 드려 죄송합니다. 요청을 처리하는 동안 예기치 않은 오류가 발생했습니다.',
      digest: '오류 요약',
      home: '홈으로 가기',
      retry: '재시도',
      title: '문제가 발생했습니다',
    },
    errors: {
      apiError: '서버 오류',
      chainNotAdded: '이 네트워크가 지갑에 추가되지 않았습니다. 먼저 추가하세요.',
      contractNotFound: '계약을 찾을 수 없습니다',
      forbidden: '금지됨 (관리자 토큰 필요)',
      httpError: '네트워크 요청 실패',
      insufficientFunds: '트랜잭션 비용이나 전송 금액을 지불할 잔액이 부족합니다.',
      invalidAddress: '주소 형식이 올바르지 않습니다',
      invalidApiResponse: 'API 응답이 유효하지 않습니다',
      invalidChain: '체인 구성이 올바르지 않습니다',
      invalidContractAddress: '계약 주소 형식이 올바르지 않습니다',
      invalidJson: '응답 파싱 실패',
      invalidMaxBlockRange: '최대 블록 범위가 허용 범위를 벗어났습니다',
      invalidRequestBody: '요청 본문이 올바르지 않습니다',
      invalidRpcUrl: 'RPC URL 형식이 올바르지 않습니다',
      invalidVotingPeriodHours: '투표 기간 시간이 허용 범위를 벗어났습니다',
      missingConfig: '구성 누락: RPC URL 또는 계약 주소',
      requestPending: '지갑에 이미 대기 중인 요청이 있습니다. 지갑을 확인하세요.',
      rpcUnreachable: 'RPC에 연결할 수 없습니다',
      syncFailed: '동기화 실패',
      unknownError: '알 수 없는 오류',
      userRejected: '지갑 요청을 거부했습니다.',
      walletNotConnected: '지갑이 연결되지 않았습니다',
      wrongNetwork: '잘못된 네트워크입니다. 대상 체인으로 전환하세요.',
      requestTimeout: '요청 시간 초과, 나중에 다시 시도해주세요',
      networkConnectionFailed: '네트워크 연결 실패, 네트워크를 확인해주세요',
      rateLimitExceeded: '요청이 너무 많습니다, 나중에 다시 시도해주세요',
      authenticationFailed: '인증 실패, 다시 로그인해주세요',
      permissionDenied: '권한이 없습니다, 이 작업을 수행할 수 없습니다',
      resourceNotFound: '{resource}을(를) 찾을 수 없습니다',
    },
    howItWorks: {
      step1: {
        desc: '누구나 보증금과 함께 사실로서 어떤 주장도 게시할 수 있습니다.',
        title: '진실 주장',
      },
      step2: {
        desc: '생명 주기 동안 주장이 거짓이라면, 누구나 같은 금액을 보증하여异议를 제기할 수 있습니다.',
        title: '검증 및异议',
      },
      step3: {
        desc: '异议가 없으면 주장이 유효합니다.异议가 발생하면 UMA 검증자가 투표하고, 승자는 상대방의 보증금을 받습니다.',
        title: '결제 및 보상',
      },
      title: '작동 원리',
    },
    nav: {
      adminTokens: '토큰',
      alerts: '경고',
      audit: '감사',
      disputes: '분쟁',
      myAssertions: '내 주장',
      myDisputes: '내 분쟁',
      oracle: '오라클',
      umaOracle: 'UMA 오라클',
      watchlist: '관심 목록',
    },
    onboarding: {
      continueAsGeneral: '일반 사용자로 계속하기',
      getStarted: '시작하기',
      next: '다음',
      roles: {
        developer: {
          description: '오라클 데이터 API를 사용하여 자신 있게 개발하세요',
          title: '개발자용',
        },
        general_user: {
          description: '오라클 데이터를 탐색하고 생태계에 참여하세요',
          title: '일반 사용자용',
        },
        oracle_operator: {
          description: '오라클 노드와 성능을 관리하세요',
          title: '오라클 운영자용',
        },
        protocol_team: {
          description: 'DeFi 프로토콜에 안정적인 오라클 데이터를 보장하세요',
          title: '프로토콜 팀용',
        },
      },
      selectRole: '개인화된 안내를 받으려면 역할을 선택해 주세요:',
      skipTour: '안내 건너뛰기',
      steps: {
        developer: {
          api: {
            description: '프로그래밍 방식으로 오라클 데이터에 접근하기 위한 REST API를 탐색하세요.',
            title: 'API 접근',
          },
          integration: {
            description: '간단한 SDK로 dApp에 오라클 데이터를 통합하세요.',
            title: '간편한 통합',
          },
          monitoring: {
            description: '애플리케이션에서 오라클 데이터의 성능을 추적하세요.',
            title: '통합 모니터링',
          },
        },
        general_user: {
          assertions: {
            description: '오라클 데이터에 대한 주장을 생성하고 추적하세요.',
            title: '주장 생성',
          },
          disputes: {
            description: '분쟁에 투표하고 결과에 영향을 미치세요.',
            title: '분쟁 참여',
          },
          exploration: {
            description: '다양한 시장과 프로토콜의 오라클 데이터를 탐색하세요.',
            title: '데이터 탐색',
          },
        },
        oracle_operator: {
          alerts: {
            description: '중요한 이벤트와 이상에 대한 경고를 구성하세요.',
            title: '경고 관리',
          },
          nodeMonitoring: {
            description: '오라클 노드의 성능과 상태를 모니터링하세요.',
            title: '노드 모니터링',
          },
          syncStatus: {
            description: '체인 간 동기화 상태와 지연을 추적하세요.',
            title: '동기화 상태',
          },
        },
        protocol_team: {
          analytics: {
            description: '다양한 시장에서 오라클 성능을 분석하세요.',
            title: '성능 분석',
          },
          disputes: {
            description: '분쟁에 참여하고 공정한 결과를 보장하세요.',
            title: '분쟁 해결',
          },
          monitoring: {
            description: '프로토콜에 대한 오라클 데이터 트렌드와 동기화 상태를 모니터링하세요.',
            title: '실시간 모니터링',
          },
        },
      },
      title: 'Insight 빠른 안내',
      welcome: 'Insight에 오신 것을 환영합니다',
      welcomeDesc:
        'Insight는 오라클 모니터링과 분쟁 해결을 위한 게이트웨이입니다. 시작하기 전에 빠른 안내를 진행해보겠습니다.',
    },
    oracle: {
      alerts: {
        channels: '채널',
        channelsEmail: 'Email',
        channelsTelegram: 'Telegram',
        channelsWebhook: 'Webhook',
        description: '시스템 모니터링 및 알림 규칙 구성',
        disabled: '비활성화됨',
        enabled: '활성화됨',
        error: '저장 실패',
        event: '트리거 이벤트',
        events: {
          backlog_assertions: '주장 적체',
          backlog_disputes: '분쟁 적체',
          contract_paused: '계약 중단',
          database_slow_query: '느린 DB 쿼리',
          dispute_created: '분쟁 생성',
          execution_delayed: '실행 지연',
          high_dispute_rate: '높은 분쟁률',
          high_error_rate: '높은 오류율',
          high_vote_divergence: '높은 투표 분산',
          liveness_expiring: '챌린지 기간 만료 임박',
          low_gas: '가스 잔액 부족',
          low_participation: '낮은 참여도',
          market_stale: '시장 데이터 정체',
          price_deviation: '가격 편차',
          slow_api_request: '느린 API 요청',
          stale_sync: '동기화 정체',
          sync_backlog: '동기화 지연',
          sync_error: '동기화 오류',
        },
        noRules: '규칙을 찾을 수 없습니다',
        opsAlertMttr: '평균 경고 해결 시간',
        opsAlertsAcknowledged: '확인된 경고',
        opsAlertsOpen: '열린 경고',
        opsIncidentMttr: '평균 인시던트 해결 시간',
        opsIncidentsOpen: '열린 인시던트',
        opsMtta: '평균 확인 시간',
        opsTitle: '운영 지표',
        opsTrend: '운영 트렌드',
        owner: '담당자',
        ownerPlaceholder: '예: alice@ops',
        params: {
          cooldownMs: '쿨다운 (분)',
          escalateAfterMs: '다음 후 에스컬레이션 (분)',
          maxAgeMinutes: '최대 경과 (분)',
          maxDelayMinutes: '최대 지연 (분)',
          maxLagBlocks: '최대 지연 블록',
          maxMarginPercent: '최대 격차 (%)',
          maxOpenAssertions: '최대 미결 주장',
          maxOpenDisputes: '최대 미결 분쟁',
          minAssertions: '최소 주장 수',
          minBalanceEth: '최소 가스 잔액 (ETH)',
          minTotalVotes: '최소 총 투표 수',
          priceDeviationThreshold: '가격 편차 임계값 (%)',
          thresholdMs: '임계값 (ms)',
          thresholdPercent: '임계값 (%)',
          windowDays: '윈도우 (일)',
          windowMinutes: '윈도우 (분)',
          withinMinutes: '윈도우 (분)',
        },
        recipient: '수신자',
        recipientPlaceholder: 'ops@example.com',
        rule: '규칙 이름',
        ruleId: '규칙 ID',
        runbook: 'Runbook',
        runbookPlaceholder: '예: https://… 또는 /docs/…',
        save: '구성 저장',
        saving: '저장 중...',
        severities: {
          critical: '심각',
          info: '정보',
          warning: '경고',
        },
        severity: '심각도',
        status: '상태',
        success: '구성이 저장되었습니다',
        testFailed: '테스트 전송 실패',
        testSend: '테스트 전송',
        testSending: '전송 중…',
        testSent: '테스트 전송됨',
        title: '경고 규칙',
        topRisks: '상위 위험',
        validation: {
          databaseSlowQueryThresholdMsPositive: '임계값은 양수여야 합니다',
          emailRecipientInvalid: '수신자 이메일 형식이 올바르지 않습니다',
          emailRecipientRequired: 'Email을 활성화하면 수신자가 필요합니다',
          executionDelayedMaxDelayMinutesPositive: '최대 지연 시간은 양수여야 합니다',
          highDisputeRateMinAssertionsPositive: '최소 주장 수는 양수여야 합니다',
          highDisputeRateThresholdPercentRange: '임계값은 1에서 100 사이여야 합니다',
          highDisputeRateWindowDaysPositive: '윈도우 일수는 양수여야 합니다',
          highErrorRateThresholdPercentRange: '임계값은 1에서 100 사이여야 합니다',
          highErrorRateWindowMinutesPositive: '윈도우 분은 양수여야 합니다',
          lowGasPositive: '최소 가스 잔액은 양수여야 합니다',
          marketStaleMaxAgeMsPositive: '최대 경과는 양수여야 합니다',
          maxLagBlocksPositive: '최대 지연 블록은 양수여야 합니다',
          maxMarginPercentRange: '최대 격차는 1에서 100 사이여야 합니다',
          maxOpenAssertionsPositive: '최대 미결 주장은 양수여야 합니다',
          maxOpenDisputesPositive: '최대 미결 분쟁은 양수여야 합니다',
          minTotalVotesNonNegative: '최소 총 투표 수는 음수일 수 없습니다',
          minTotalVotesPositive: '최소 총 투표 수는 양수여야 합니다',
          priceDeviationPositive: '가격 편차 임계값은 양수여야 합니다',
          slowApiThresholdMsPositive: '임계값은 양수여야 합니다',
          staleSyncMaxAgeMsPositive: '최대 경과는 양수여야 합니다',
          withinMinutesPositive: '윈도우 분은 양수여야 합니다',
        },
      },
      card: {
        asserter: '주장자',
        assertion: '주장',
        bond: '보증금',
        disputer: '이의 제기자',
        gridView: '그리드 뷰',
        listView: '리스트 뷰',
        livenessEnds: '생명 주기 종료',
        marketQuestion: '시장 질문',
        tx: '거래',
      },
      charts: {
        activityDesc: '시간에 따른 활동',
        anomalyNone: '유의미한 이상치가 없습니다',
        anomalyThreshold: '이상치 임계값',
        anomalyView: '이상치 보기',
        dailyAssertions: '일일 주장',
        dataQuality: '데이터 품질',
        dataQualityDesc: '오라클과 기준 가격 간 편차 및 이상치 개요',
        dataQualitySummary: '품질 요약',
        dataSamples: '샘플 수',
        deviationAvg: '평균 편차',
        deviationLatest: '최신 편차',
        deviationMax: '최대 편차',
        deviationPercent: '편차 %',
        healthScore: '건강 점수',
        lastSample: '최근 샘플',
        marketsDesc: '최근 30일 분쟁 집중 분포',
        noData: '차트 데이터가 없습니다',
        oraclePrice: '오라클 가격',
        referencePrice: '기준 가격',
        syncDesc: '시간에 따른 인덱서 지연 및 지속 시간',
        syncDuration: '동기화 지속 시간 (ms)',
        syncHealth: '동기화 건강',
        syncLagBlocks: '지연 (블록)',
        topMarkets: '인기 시장',
        tvsCumulative: '총 보장 가치 (누적)',
        tvsDesc: '누적 가치',
        waitingData: '활동 트렌드를 생성하기 위해 더 많은 역사적 데이터를 기다리고 있습니다.',
      },
      config: {
        adminActor: '행위자',
        adminActorPlaceholder: '예: alice@ops',
        adminToken: '관리자 토큰',
        chain: '체인',
        confirmationBlocks: '확인 블록',
        consecutiveFailures: '연속 실패',
        contractAddress: '계약 주소',
        demo: '데모',
        demoHint: '데모 모드는 테스트 데이터를 사용하며 실제 체인에 연결되지 않습니다.',
        indexed: '인덱싱됨',
        indexedHint: '온체인 데이터에 연결되었습니다. 데이터가 자동으로 업데이트됩니다.',
        lagBlocks: '지연 (블록)',
        lastBlock: '마지막 블록',
        latestBlock: '최신 블록',
        maxBlockRange: '최대 블록 범위',
        owner: '소유자',
        ownerType: '소유자 유형',
        ownerTypeContract: '계약',
        ownerTypeEoa: 'EOA',
        ownerTypeUnknown: '알 수 없음',
        rpcActive: 'RPC 활성',
        rpcUrl: 'RPC URL',
        safeBlock: '안전 블록',
        save: '저장',
        startBlock: '시작 블록',
        syncDuration: '기간',
        syncError: '마지막 오류',
        syncing: '동기화 중...',
        syncNow: '지금 동기화',
        syncStatus: '동기화 상태',
        title: '연결 및 동기화',
        votingPeriodHours: '투표 기간 (시간)',
      },
      createAssertionModal: {
        assertionLabel: '주장',
        assertionPlaceholder: '예: 50000',
        bondInvalid: '보증금 금액은 양수여야 합니다',
        bondLabel: '보증금 (ETH)',
        marketLabel: '시장 질문',
        marketPlaceholder: '예: 1월 1일 UTC 8시에 BTC/USD는?',
        protocolLabel: '프로토콜',
        protocolPlaceholder: '예: UMA, Chainlink',
        submit: '주장 생성',
      },
      description: 'UMA Optimistic Oracle 주장과 분쟁의 실시간 추적',
      detail: {
        actions: '작업',
        against: '반대',
        assertedOutcome: '주장된 결과',
        asserter: '주장자',
        back: '뒤로 가기',
        bondAmount: '보증금 금액',
        cancel: '취소',
        confirmDispute: '분쟁 확인',
        confirming: '확인 중...',
        disputeActive: '분쟁 진행 중',
        disputeAssertion: '이 주장에异议 제기',
        disputeRequiresBond: '분쟁에는 보증금이 필요합니다',
        errorNotFound: '요청한 주장을 찾을 수 없습니다.',
        errorTitle: '오류: 데이터 로드 실패',
        goBack: '돌아가기',
        hash: '해시',
        installWallet: 'MetaMask 또는 다른 Web3 지갑을 설치하세요.',
        marketQuestion: '시장 질문',
        reason: '사유',
        reasonForDispute: '분쟁 사유',
        reasonPlaceholder: '이 주장이 왜 잘못되었는지 설명하세요...',
        reasonRequired: '분쟁 사유를 입력해주세요.',
        relatedAssertion: '연관 주장',
        relatedDispute: '연관 분쟁',
        resolved: '해결됨',
        resolvedDesc: '이 주장이 성공적으로 해결되었습니다.',
        riskImpactDesc: '관련 위험 신호와 잠재적 영향',
        riskImpactTitle: '위험 및 영향',
        riskNone: '관련 위험이 없습니다',
        settleAssertion: '주장 결제',
        settleDesc: '이 주장에 대한 이의 제기 기간이 종료되어 결제가 가능합니다.',
        settlementFalse: '무효/거짓',
        settlementResult: '결제 결과',
        settlementTrue: '유효/참',
        submitting: '제출 중...',
        support: '지지',
        timeline: '타임라인',
        title: '주장 세부 정보',
        transaction: '거래',
        txFailed: '거래 실패',
        txSent: '거래가 전송됨',
        validationError: '유효성 검사 오류',
        voteOnDispute: '분쟁에 투표',
        votes: '투표',
        walletNotFound: '지갑이 감지되지 않음',
      },
      disputeModal: {
        bondLabel: '보증금 (ETH)',
        desc: '이 주장이 잘못되었다고 생각되면 이의를 제기하세요.',
        reasonExample: '예: 공식 데이터가 정반대 결과를 보여주고 소스가 수정되었습니다.',
        reasonHint: '답변이 왜 잘못되었는지 설명하세요.',
        submit: '이의 제출',
        warning: '경고: 검증 결과 주장이 올바르면 보증금을 잃게 됩니다.',
      },
      healthScore: {
        critical: '위험',
        degraded: '저하됨',
        excellent: '우수',
        good: '양호',
        title: '오라클 건강 점수',
      },
      leaderboard: {
        assertions: '주장',
        bonded: '보증금',
        disputes: '분쟁',
        noData: '데이터 없음',
        topAsserters: '상위 주장자',
        topAssertersDesc: '잠긴 보증금 기준 주장자 순위',
        topDisputers: '상위 이의 제기자',
        topDisputersDesc: '잠긴 보증금 기준 이의 제기자 순위',
      },
      myActivity: '내 활동',
      myActivityEmpty: '아직 주장을 만들지 않았습니다.',
      myActivityTooltip: '내가 만든 주장만 표시',
      myAssertions: {
        connectWalletDesc: '주장 기록을 보려면 지갑을 연결하세요.',
        connectWalletTitle: '보려면 지갑을 연결하세요',
        createFirst: '첫 주장 만들기',
        description: '내가 만든 모든 주장 관리',
        noAssertions: '아직 주장을 만들지 않았습니다.',
        searchPlaceholder: '주장 검색…',
        title: '내 주장',
      },
      myDisputes: {
        connectWalletDesc: '분쟁 기록을 보려면 지갑을 연결하세요.',
        connectWalletTitle: '보려면 지갑을 연결하세요',
        description: '내가 시작한 모든 분쟁 관리',
        noDisputes: '아직 분쟁을 시작하지 않았습니다.',
        searchPlaceholder: '분쟁 검색…',
        title: '내 분쟁',
      },
      myDisputesEmpty: '아직 분쟁을 시작하지 않았습니다.',
      myDisputesFilter: '내 분쟁',
      myDisputesTooltip: '내가 시작한 분쟁만 표시',
      newAssertion: '새 주장',
      profile: {
        assertionsHistory: '주장 이력',
        disputesHistory: '분쟁 이력',
        title: '프로필',
      },
      searchPlaceholder: '주장 검색…',
      settleModal: {
        assertionId: '주장 ID',
        confirming: '확인 중...',
        confirmSettle: '결제 확인',
        outcomeFalse: '무효/거짓',
        outcomeFalseDesc: '주장이 무효하고 거짓임을 확인',
        outcomeTrue: '유효/참',
        outcomeTrueDesc: '주장이 유효하고 참임을 확인',
        readyDesc:
          '투표/생명 주기가 종료되었습니다. 이제 결과를 해결하고 보증금/보상을 분배하기 위해 이 주장을 출금할 수 있습니다.',
        readyTitle: '출금 준비 완료',
        selectOutcome: '결제 결과 선택',
        selectOutcomeRequired: '결과를 선택하세요',
        transactionNoteBody: '이 거래에는 개인화된 메모가 포함됩니다.',
        transactionNoteTitle: '거래 메모',
      },
      stats: {
        activeDisputes: '활성 분쟁',
        avgResolution: '평균 해결 시간',
        liveCap: '라이브 오라클 시가 총액',
        resolved24h: '해결됨 (24시간)',
        totalAssertions: '총 주장 수',
        totalBonded: '총 보증금',
        totalDisputes: '총 분쟁 수',
        tvs: '총 보장 가치',
        winRate: '승률',
      },
      sync: {
        block: '블록 높이',
        error: '동기화 오류',
        lagging: '동기화 지연',
        lastUpdate: '마지막 업데이트',
        status: '인덱서 상태',
        synced: '동기화됨',
      },
      tabs: {
        leaderboard: '순위표',
        overview: '개요',
        tools: '도구',
      },
      timeline: {
        active: '진행 중',
        asserted: '주장됨',
        disputed: '분쟁됨',
        livenessEnds: '생명 주기 종료',
        resolved: '해결됨',
        votingEnds: '투표 종료',
      },
      title: '오라클 모니터링',
      tx: {
        assertionCreatedMsg: '주장이 성공적으로 생성되었습니다.',
        assertionCreatedTitle: '주장 생성됨',
        confirmedMsg: '거래가 확인되었습니다.',
        confirmedTitle: '확인됨',
        confirmingMsg: '거래가 확인 대기 중입니다.',
        confirmingTitle: '확인 대기 중',
        disputeSubmittedMsg: '분쟁이 성공적으로 제출되었습니다.',
        disputeSubmittedTitle: '분쟁 제출됨',
        sentMsg: '거래가 성공적으로 전송되었습니다.',
        sentTitle: '거래 전송됨',
        settlementSubmittedMsg: '결제가 성공적으로 제출되었습니다.',
        settlementSubmittedTitle: '결제 제출됨',
        voteCastAgainstMsg: '반대阵营에 투표하셨습니다.',
        voteCastSupportMsg: '찬성阵营에 투표하셨습니다.',
        voteCastTitle: '투표 완료',
      },
    },
    pnl: {
      bondAmount: '보증금 금액 (USD)',
      description: '잠재적 수익 추정',
      disclaimer: '*표준 1:1 보증금 승격 게임 로직을 가정합니다.',
      iWantToAssert: '주장하려고 합니다',
      iWantToDispute: '异议하려고 합니다',
      profit: '잠재적 수익',
      roi: '수익률',
      title: '수익 계산기',
      totalReturn: '총 수익',
    },
    sidebar: {
      notConnected: '연결되지 않음',
      userWallet: '사용자 지갑',
    },
    status: {
      executed: '실행됨',
      pendingExecution: '실행 대기 중',
      voting: '투표 중',
    },
    tooltips: {
      assertion:
        '당신이 진실로 주장하는 사실입니다.客觀적이고 검증 가능하며 명확한 시간과 출처가 있어야 합니다.',
      bond: '본드는 주장자가 정보의 진실성을 보장하기 위해 잠그는 자금입니다. 정보가 거짓으로 입증되면 본드가 몰수됩니다.',
      liveness:
        '생명 주기는 누구나 주장에异议를 제기할 수 있는 시간 창입니다. 종료 후 주장은 진실로 간주됩니다.',
      market:
        '시장 질문은 오라클이 답해야 할具체적인 내용을 정의하며, 일반적으로 예/아니오 질문이나 수치입니다.',
      protocol: '이 주장과 관련된 프로토콜 또는 프로젝트의 이름입니다.',
      reward:
        '만약异议 기간 내에异议가 없다면, 주장자는 본드를 회수합니다.异议가 발생하고 승리하면 상대방의 본드를 보상으로 받게 됩니다.',
    },
    wallet: {
      balance: '잔액',
      connect: '지갑 연결',
      connected: '지갑이 연결되었습니다',
      connectedMsg: '에 연결되었습니다',
      connecting: '연결 중...',
      copyAddress: '주소 복사',
      disconnect: '연결 해제',
      failed: '연결 실패',
      install: 'MetaMask 또는 Rabby를 설치하세요!',
      myProfile: '내 프로필',
      network: '네트워크',
      networkAlreadySelected: '이 네트워크에 이미 있습니다',
      networkSwitched: '네트워크가 전환되었습니다',
      networkSwitchFailed: '네트워크 전환 실패',
      notFound: '지갑을 찾을 수 없음',
      switchingNetwork: '전환 중…',
      unknownNetwork: '알 수 없는 네트워크',
    },
    watchlist: {
      emptyDesc: '아직 관심 목록에 주장을 추가하지 않았습니다.',
    },
  },
  zh: {
    adminTokens: {
      create: '创建',
      createdAt: '创建时间',
      description: '创建、轮换与吊销管理员 Token。',
      label: '标签',
      revoke: '吊销',
      revokedAt: '吊销时间',
      role: '角色',
      title: '管理密钥',
      tokenValue: '新 Token（仅显示一次）',
    },
    alerts: {
      acknowledge: '确认',
      actions: {
        backlog_assertions: {
          1: '检查断言写入通道',
          2: '清理异常断言队列',
        },
        backlog_disputes: {
          1: '检查争议处理队列',
          2: '协调投票与结算流程',
        },
        contract_paused: {
          1: '确认暂停原因与范围',
          2: '通知协议团队处理',
        },
        database_slow_query: {
          1: '定位慢查询语句',
          2: '优化索引与资源',
        },
        dispute_created: {
          1: '查看争议详情与证据',
          2: '通知相关负责人介入',
        },
        execution_delayed: {
          1: '检查执行器健康状态',
          2: '评估链上拥堵情况',
        },
        high_dispute_rate: {
          1: '定位争议集中的市场',
          2: '评估断言创建规则',
        },
        high_error_rate: {
          1: '检查错误日志与告警',
          2: '回滚最近变更',
        },
        high_vote_divergence: {
          1: '检查争议焦点与证据',
          2: '分析投票偏差原因',
        },
        liveness_expiring: {
          1: '复核断言与数据源',
          2: '必要时提交争议',
        },
        low_gas: {
          1: '补充节点 gas 余额',
          2: '设置余额告警阈值',
        },
        low_participation: {
          1: '提醒投票人参与',
          2: '评估激励与时限设置',
        },
        market_stale: {
          1: '检查市场数据源',
          2: '校准更新频率',
        },
        price_deviation: {
          1: '比对参考价格源',
          2: '检查喂价延迟',
        },
        slow_api_request: {
          1: '排查慢接口与依赖',
          2: '启用缓存或限流',
        },
        stale_sync: {
          1: '确认同步落后原因',
          2: '临时提高同步资源',
        },
        sync_backlog: {
          1: '查看积压任务类型',
          2: '扩容索引处理能力',
        },
        sync_error: {
          1: '检查 RPC 与索引器日志',
          2: '重启或切换备援节点',
        },
      },
      adminActor: '操作者',
      adminActorPlaceholder: '例如：alice@ops',
      adminToken: '管理员 Token',
      adminTokenHint: '仅保存在本地，用于访问管理员接口',
      adminTokenWarning: '未填写 Token 时只能查看告警，不能确认/解决或保存规则。',
      description: '聚合告警、确认处理并追踪系统健康。',
      explanation: '异常说明',
      explanations: {
        backlog_assertions: '断言积压异常，可能存在处理瓶颈。',
        backlog_disputes: '争议积压异常，投票与结算可能延迟。',
        contract_paused: '预言机合约暂停，断言与结算流程受影响。',
        database_slow_query: '数据库查询变慢，可能拖慢核心流程。',
        dispute_created: '检测到新争议，需确认争议原因与影响范围。',
        execution_delayed: '执行延迟超过阈值，可能影响结算及时性。',
        high_dispute_rate: '争议率偏高，需排查数据质量与断言流程。',
        high_error_rate: '错误率升高，需定位异常来源。',
        high_vote_divergence: '投票分歧较大，结果存在不确定性。',
        liveness_expiring: '挑战期即将结束，需尽快评估是否需要争议。',
        low_gas: '节点 gas 余额过低，可能导致交易失败。',
        low_participation: '投票参与度偏低，结果可信度下降。',
        market_stale: '市场数据过期，需检查数据源与更新频率。',
        price_deviation: '价格偏差扩大，需核对参考源。',
        slow_api_request: 'API 请求延迟升高，影响下游体验。',
        stale_sync: '同步停滞超过阈值，数据可能已过期。',
        sync_backlog: '同步积压增加，处理延迟可能扩大。',
        sync_error: '索引器同步失败，可能影响告警与数据时效。',
      },
      lastSeen: '最近',
      loadRules: '加载规则',
      occurrences: '次数',
      owner: '负责人',
      recommendedActions: '行动建议',
      refresh: '刷新',
      resolve: '解决',
      rules: '告警规则',
      runbook: 'Runbook',
      saveRules: '保存',
      savingRules: '保存中…',
      searchPlaceholder: '搜索标题/内容/实体…',
      severity: '级别',
      silence24h: '静默 24 小时',
      silence2h: '静默 2 小时',
      silence30m: '静默 30 分钟',
      silencedUntil: '静默至',
      status: '状态',
      title: '告警中心',
      type: '类型',
      unsilence: '取消静默',
    },
    app: {
      brand: 'Insight',
      description: 'UMA Optimistic Oracle 争议与结算可视化监控',
      logoAlt: 'Insight 标志',
      subtitle: '预言机监控',
      title: 'Insight · UMA 结算监控',
    },
    audit: {
      action: '动作',
      actionPlaceholder: '例如：alert_rules_updated',
      actor: '操作者',
      actorPlaceholder: '例如：alice@ops',
      adminToken: '管理员 Token',
      adminTokenHint: '使用监控台里保存的管理员 Token。',
      adminTokenPlaceholder: 'Bearer …',
      apply: '应用',
      clear: '清空',
      description: '追踪管理员操作与关键配置变更。',
      empty: '暂无审计记录。',
      entityId: '实体 ID',
      entityIdPlaceholder: '例如：0x…',
      entityType: '实体类型',
      entityTypePlaceholder: '例如：alerts',
      error: '错误',
      exportCsv: '导出 CSV',
      exporting: '导出中…',
      exportJson: '导出 JSON',
      filters: '筛选',
      query: '全文搜索',
      queryPlaceholder: '搜索 actor/action/entity/details…',
      refresh: '刷新',
      title: '审计日志',
      total: '总记录',
    },
    chain: {
      arbitrum: 'Arbitrum',
      local: '本地',
      optimism: 'Optimism',
      polygon: 'Polygon',
    },
    common: {
      addToWatchlist: '加入关注',
      all: '全部',
      allLoaded: '已全部加载',
      breadcrumb: '面包屑导航',
      cancel: '取消',
      close: '关闭',
      closeMenu: '关闭菜单',
      comingSoon: '敬请期待',
      confirm: '确认',
      copied: '已复制',
      copyHash: '复制哈希',
      disputed: '有争议',
      example: '示例',
      home: '首页',
      language: '语言',
      loading: '加载中…',
      loadMore: '加载更多',
      min: '最小',
      noData: '暂无数据',
      ok: '好的',
      openMenu: '打开菜单',
      pending: '待确认',
      popular: '热门',
      refresh: '刷新',
      removeFromWatchlist: '取消关注',
      resolved: '已结算',
      retry: '重试',
      sidebar: '侧边栏',
      success: '成功',
      usd: 'USD',
      viewDetails: '查看详情',
      viewOnExplorer: '在浏览器查看',
      viewTx: '查看交易',
    },
    keyboardShortcuts: {
      title: '键盘快捷键',
      pressAny: '按任意键关闭',
    },
    pwa: {
      install: '安装应用',
      installDescription: '将 Insight Oracle 添加到主屏幕以快速访问和离线支持。',
      installTitle: '安装 Insight Oracle',
      installing: '安装中…',
      offline: '您已离线',
      offlineDescription: '重新连接前，部分功能可能不可用。',
      update: '更新',
      updateAvailable: '有可用更新',
      updateDescription: '有新版本的 Insight Oracle 可用。',
    },
    disputes: {
      card: {
        dispute: '争议',
        disputer: '争议发起方',
        votes: '票数',
      },
      description: '监控争议进展、投票情况与最终裁决。',
      disputedAt: '发起时间',
      disputer: '争议发起方',
      emptyDesc: '当前系统没有活跃争议，可稍后再查看。',
      emptyTitle: '暂无活跃争议',
      endsAt: '截止',
      reason: '争议原因',
      reject: '反对断言',
      support: '支持断言',
      title: '争议结算',
      totalVotesCast: '已投票总数',
      umaDvmActive: 'UMA DVM 运行中',
      viewOnUma: '在 UMA 查看',
      votingProgress: '投票进度',
    },
    errorPage: {
      description: '抱歉给您带来不便。处理您的请求时发生了意外错误。',
      digest: '错误摘要',
      home: '返回首页',
      retry: '重试',
      title: '出错了',
    },
    errors: {
      apiError: '服务端错误',
      chainNotAdded: '钱包未添加该网络，请先添加后再重试。',
      contractNotFound: '合约地址不存在或不可用',
      forbidden: '无权限操作（需要管理员 Token）',
      httpError: '网络请求失败',
      insufficientFunds: '余额不足，无法支付交易费用或转账金额。',
      invalidAddress: '地址格式不正确',
      invalidApiResponse: '响应格式不正确',
      invalidChain: '链配置不正确',
      invalidContractAddress: '合约地址格式不正确',
      invalidJson: '响应解析失败',
      invalidMaxBlockRange: '最大区块跨度不在允许范围内',
      invalidRequestBody: '请求参数不正确',
      invalidRpcUrl: 'RPC URL 格式不正确',
      invalidVotingPeriodHours: '投票期小时数不在允许范围内',
      missingConfig: '缺少配置：RPC URL 或合约地址',
      requestPending: '钱包中已有待处理请求，请先在钱包内完成或取消。',
      rpcUnreachable: 'RPC 连接失败',
      syncFailed: '同步失败',
      unknownError: '未知错误',
      userRejected: '你已取消钱包请求。',
      walletNotConnected: '钱包未连接',
      wrongNetwork: '网络不匹配，请切换到目标链后重试。',
      requestTimeout: '请求超时，请稍后重试',
      networkConnectionFailed: '网络连接失败，请检查网络',
      rateLimitExceeded: '请求过于频繁，请稍后再试',
      authenticationFailed: '认证失败，请重新登录',
      permissionDenied: '权限不足，无法执行此操作',
      resourceNotFound: '{resource} 未找到',
    },
    howItWorks: {
      step1: {
        desc: '任何人都可以将任何陈述作为事实发布，并附带质押金作为保证金。',
        title: '提出断言',
      },
      step2: {
        desc: '在挑战期内，如果断言不实，任何人都可以通过质押相同金额来发起挑战。',
        title: '验证与争议',
      },
      step3: {
        desc: '若无挑战，断言生效。若发生挑战，UMA 验证者将裁决，胜者赢取对方的质押金。',
        title: '结算与奖励',
      },
      title: '工作原理',
    },
    nav: {
      adminTokens: '密钥',
      alerts: '告警',
      audit: '审计',
      disputes: '争议',
      myAssertions: '我的断言',
      myDisputes: '我的争议',
      oracle: '监控台',
      umaOracle: 'UMA 预言机',
      watchlist: '关注列表',
    },
    onboarding: {
      continueAsGeneral: '以普通用户身份继续',
      getStarted: '开始使用',
      next: '下一步',
      roles: {
        developer: {
          description: '使用我们的预言机数据 API 自信地构建应用',
          title: '面向开发者',
        },
        general_user: {
          description: '探索预言机数据并参与生态系统',
          title: '面向普通用户',
        },
        oracle_operator: {
          description: '管理您的预言机节点和性能',
          title: '面向预言机操作者',
        },
        protocol_team: {
          description: '确保您的 DeFi 协议获得可靠的预言机数据',
          title: '面向协议团队',
        },
      },
      selectRole: '请选择您的角色，获取个性化导览：',
      skipTour: '跳过导览',
      steps: {
        developer: {
          api: {
            description: '探索我们的 REST API，以编程方式访问预言机数据。',
            title: 'API 访问',
          },
          integration: {
            description: '使用简单的 SDK 将预言机数据集成到您的 dApps 中。',
            title: '轻松集成',
          },
          monitoring: {
            description: '跟踪预言机数据在您应用中的性能。',
            title: '监控您的集成',
          },
        },
        general_user: {
          assertions: {
            description: '创建和跟踪预言机数据的断言。',
            title: '创建断言',
          },
          disputes: {
            description: '对争议进行投票并影响结果。',
            title: '参与争议',
          },
          exploration: {
            description: '浏览不同市场和协议的预言机数据。',
            title: '数据探索',
          },
        },
        oracle_operator: {
          alerts: {
            description: '为重要事件和异常配置告警。',
            title: '告警管理',
          },
          nodeMonitoring: {
            description: '监控您的预言机节点的性能和状态。',
            title: '节点监控',
          },
          syncStatus: {
            description: '跟踪跨链的同步状态和延迟。',
            title: '同步状态',
          },
        },
        protocol_team: {
          analytics: {
            description: '分析不同市场的预言机性能。',
            title: '性能分析',
          },
          disputes: {
            description: '参与争议并确保公平结果。',
            title: '争议解决',
          },
          monitoring: {
            description: '监控您协议的预言机数据趋势和同步状态。',
            title: '实时监控',
          },
        },
      },
      title: 'Insight 快速导览',
      welcome: '欢迎使用 Insight',
      welcomeDesc:
        'Insight 是您进入预言机监控和争议解决的门户。让我们快速浏览一下，帮助您开始使用。',
    },
    oracle: {
      alerts: {
        channels: '通知渠道',
        channelsEmail: 'Email',
        channelsTelegram: 'Telegram',
        channelsWebhook: 'Webhook',
        description: '配置系统监控与通知规则。',
        disabled: '已禁用',
        enabled: '已启用',
        error: '保存失败',
        event: '触发事件',
        events: {
          backlog_assertions: '断言积压',
          backlog_disputes: '争议积压',
          contract_paused: '合约暂停',
          database_slow_query: '慢查询',
          dispute_created: '争议创建',
          execution_delayed: '执行延迟',
          high_dispute_rate: '争议率过高',
          high_error_rate: '错误率过高',
          high_vote_divergence: '投票分歧过大',
          liveness_expiring: '挑战期即将结束',
          low_gas: 'Gas 余额过低',
          low_participation: '投票参与度过低',
          market_stale: '市场数据停滞',
          price_deviation: '价格偏离',
          slow_api_request: '慢请求',
          stale_sync: '同步停滞',
          sync_backlog: '同步落后',
          sync_error: '同步错误',
        },
        noRules: '暂无规则',
        opsAlertMttr: '告警平均恢复时间',
        opsAlertsAcknowledged: '已确认告警',
        opsAlertsOpen: '未关闭告警',
        opsIncidentMttr: '事件平均恢复时间',
        opsIncidentsOpen: '未关闭事件',
        opsMtta: '平均确认时间',
        opsTitle: '运维指标',
        opsTrend: '运维趋势',
        owner: '负责人',
        ownerPlaceholder: '例如：alice@ops',
        params: {
          cooldownMs: '冷却时间（分钟）',
          escalateAfterMs: '升级等待（分钟）',
          maxAgeMinutes: '最大滞后（分钟）',
          maxDelayMinutes: '最大延迟（分钟）',
          maxLagBlocks: '最大落后区块数',
          maxMarginPercent: '最大票差 (%)',
          maxOpenAssertions: '最大未结算断言数',
          maxOpenDisputes: '最大未结算争议数',
          minAssertions: '最小断言数',
          minBalanceEth: '最低 Gas 余额 (ETH)',
          minTotalVotes: '最少投票数',
          priceDeviationThreshold: '价格偏差阈值 (%)',
          thresholdMs: '阈值（毫秒）',
          thresholdPercent: '错误率阈值（%）',
          windowDays: '统计窗口（天）',
          windowMinutes: '统计窗口（分钟）',
          withinMinutes: '预警窗口（分钟）',
        },
        recipient: '收件人',
        recipientPlaceholder: 'ops@example.com',
        rule: '规则名称',
        ruleId: '规则 ID',
        runbook: 'Runbook',
        runbookPlaceholder: '例如：https://… 或 /docs/…',
        save: '保存配置',
        saving: '保存中...',
        severities: {
          critical: '严重',
          info: '信息',
          warning: '警告',
        },
        severity: '严重程度',
        status: '状态',
        success: '配置已保存',
        testFailed: '测试发送失败',
        testSend: '发送测试',
        testSending: '发送中…',
        testSent: '测试已发送',
        title: '告警规则',
        topRisks: '高风险项',
        validation: {
          databaseSlowQueryThresholdMsPositive: '慢查询阈值必须为正数',
          emailRecipientInvalid: 'Email 收件人格式不正确',
          emailRecipientRequired: '启用 Email 时必须填写收件人',
          executionDelayedMaxDelayMinutesPositive: '执行延迟阈值必须为正数',
          highDisputeRateMinAssertionsPositive: '最小断言数必须为正数',
          highDisputeRateThresholdPercentRange: '争议率阈值必须在 1-100 之间',
          highDisputeRateWindowDaysPositive: '争议率统计窗口必须为正数',
          highErrorRateThresholdPercentRange: '错误率阈值必须在 1-100 之间',
          highErrorRateWindowMinutesPositive: '错误率统计窗口必须为正数',
          lowGasPositive: '最低 Gas 余额必须为正数',
          marketStaleMaxAgeMsPositive: '市场数据停滞的最大时长必须为正数',
          maxLagBlocksPositive: '最大落后区块数必须为正数',
          maxMarginPercentRange: '最大票差必须在 1-100 之间',
          maxOpenAssertionsPositive: '最大未结算断言数必须为正数',
          maxOpenDisputesPositive: '最大未结算争议数必须为正数',
          minTotalVotesNonNegative: '最少投票数不能为负数',
          minTotalVotesPositive: '最少投票数必须为正数',
          priceDeviationPositive: '价格偏差阈值必须为正数',
          slowApiThresholdMsPositive: '慢请求阈值必须为正数',
          staleSyncMaxAgeMsPositive: '同步停滞的最大时长必须为正数',
          withinMinutesPositive: '预警窗口必须为正数',
        },
      },
      card: {
        asserter: '断言发起方',
        assertion: '断言',
        bond: '保证金',
        disputer: '争议发起方',
        gridView: '网格视图',
        listView: '列表视图',
        livenessEnds: '挑战期结束',
        marketQuestion: '市场问题',
        tx: '交易',
      },
      charts: {
        activityDesc: '随时间变化的活动',
        anomalyNone: '当前未发现显著异常',
        anomalyThreshold: '异常阈值',
        anomalyView: '异常视图',
        dailyAssertions: '每日断言数',
        dataQuality: '数据质量',
        dataQualityDesc: '预言机与参考价格偏差与异常概览',
        dataQualitySummary: '质量摘要',
        dataSamples: '样本数',
        deviationAvg: '平均偏差',
        deviationLatest: '最新偏差',
        deviationMax: '最大偏差',
        deviationPercent: '偏差百分比',
        healthScore: '健康评分',
        lastSample: '最近采样',
        marketsDesc: '过去 30 天内争议集中分布',
        noData: '暂无图表数据',
        oraclePrice: '预言机价格',
        referencePrice: '参考价格',
        syncDesc: '索引器同步滞后与耗时趋势',
        syncDuration: '同步耗时（毫秒）',
        syncHealth: '同步健康',
        syncLagBlocks: '落后区块',
        topMarkets: '热门市场',
        tvsCumulative: '安全总价值（累计）',
        tvsDesc: '累计价值',
        waitingData: '等待更多历史数据以生成活动趋势。',
      },
      config: {
        adminActor: '操作者',
        adminActorPlaceholder: '例如：alice@ops',
        adminToken: '管理员 Token',
        chain: '链',
        confirmationBlocks: '确认区块数',
        consecutiveFailures: '连续失败次数',
        contractAddress: '合约地址',
        demo: '演示数据',
        demoHint: '当前展示演示数据。填写配置并点击立即同步获取链上数据。',
        indexed: '已索引',
        indexedHint: '已连接到链上数据，数据将自动刷新。',
        lagBlocks: '落后区块',
        lastBlock: '处理到区块',
        latestBlock: '最新区块',
        maxBlockRange: '最大区块跨度',
        owner: '合约 Owner',
        ownerType: 'Owner 类型',
        ownerTypeContract: '合约 / 多签',
        ownerTypeEoa: '外部账户 (EOA)',
        ownerTypeUnknown: '未知类型',
        rpcActive: '当前 RPC',
        rpcUrl: 'RPC URL',
        safeBlock: '安全区块',
        save: '保存',
        startBlock: '起始区块',
        syncDuration: '耗时',
        syncError: '上次失败原因',
        syncing: '同步中…',
        syncNow: '立即同步',
        syncStatus: '同步状态',
        title: '连接与同步',
        votingPeriodHours: '投票期（小时）',
      },
      createAssertionModal: {
        assertionLabel: '断言内容',
        assertionPlaceholder: '你认为的事实是什么？',
        bondInvalid: '保证金金额必须大于 0',
        bondLabel: '保证金 (ETH)',
        marketLabel: '市场 / ID',
        marketPlaceholder: '例如：ETH-USDC',
        protocolLabel: '协议',
        protocolPlaceholder: '例如：Aave V3',
        submit: '创建断言',
      },
      description: '实时追踪 UMA Optimistic Oracle 断言与争议。',
      detail: {
        actions: '操作',
        against: '反对',
        assertedOutcome: '断言结果',
        asserter: '断言者',
        back: '返回概览',
        bondAmount: '保证金金额',
        cancel: '取消',
        confirmDispute: '确认争议',
        confirming: '确认中…',
        disputeActive: '争议进行中',
        disputeAssertion: '争议此断言',
        disputeRequiresBond: '争议需要缴纳保证金：',
        errorNotFound: '该断言不存在或已被移除。',
        errorTitle: '未找到断言',
        goBack: '返回列表',
        hash: '哈希',
        installWallet: '请安装 MetaMask 或其他 Web3 钱包。',
        marketQuestion: '市场问题',
        reason: '理由',
        reasonForDispute: '争议理由',
        reasonPlaceholder: '请详细说明为什么此断言不正确...',
        reasonRequired: '请提供争议理由。',
        relatedAssertion: '关联断言',
        relatedDispute: '关联争议',
        resolved: '已解决',
        resolvedDesc: '此断言已成功解决。',
        riskImpactDesc: '与该断言相关的风险线索与潜在影响',
        riskImpactTitle: '风险与影响',
        riskNone: '暂无关联风险',
        settleAssertion: '结算断言',
        settleDesc: '该断言已通过挑战期，可以进行结算。',
        settlementFalse: '无效 / 虚假',
        settlementResult: '结算结果',
        settlementTrue: '有效 / 真实',
        submitting: '提交中…',
        support: '支持',
        timeline: '时间轴',
        title: '断言详情',
        transaction: '交易',
        txFailed: '交易失败',
        txSent: '交易已发送',
        validationError: '验证错误',
        voteOnDispute: '参与投票',
        votes: '票',
        walletNotFound: '未检测到钱包',
      },
      disputeModal: {
        bondLabel: '保证金（ETH）',
        desc: '提交争议需要缴纳保证金（Bond）。',
        reasonExample: '例如：官方公告显示结果相反，且数据源已被更正。',
        reasonHint: '请说明事实依据、数据来源或时间范围。',
        submit: '提交争议',
        warning: '警告：如果断言被验证为正确，您将失去质押金。',
      },
      healthScore: {
        critical: '严重',
        degraded: '降级',
        excellent: '优秀',
        good: '良好',
        title: '预言机健康评分',
      },
      leaderboard: {
        assertions: '断言数',
        bonded: '已质押',
        disputes: '争议数',
        noData: '暂无数据',
        topAsserters: '最佳断言方',
        topAssertersDesc: '最活跃的贡献者',
        topDisputers: '最佳争议方',
        topDisputersDesc: '最活跃的验证者',
      },
      myActivity: '我的动态',
      myActivityEmpty: '您尚未创建任何断言。',
      myActivityTooltip: '仅显示由我创建的断言',
      myAssertions: {
        connectWalletDesc: '请连接您的钱包以查看您的断言历史记录。',
        connectWalletTitle: '连接钱包以查看',
        createFirst: '创建您的第一个断言',
        description: '管理您创建的所有断言。',
        noAssertions: '您尚未创建任何断言。',
        searchPlaceholder: '搜索断言…',
        title: '我的断言',
      },
      myDisputes: {
        connectWalletDesc: '请连接您的钱包以查看您的争议历史记录。',
        connectWalletTitle: '连接钱包以查看',
        description: '管理您发起的所有争议。',
        noDisputes: '您尚未发起任何争议。',
        searchPlaceholder: '搜索争议…',
        title: '我的争议',
      },
      myDisputesEmpty: '您尚未发起任何争议。',
      myDisputesFilter: '我的争议',
      myDisputesTooltip: '仅显示由我发起的争议',
      newAssertion: '新建断言',
      profile: {
        assertionsHistory: '断言历史',
        disputesHistory: '争议历史',
        title: '地址概览',
      },
      searchPlaceholder: '搜索断言…',
      settleModal: {
        assertionId: '断言 ID',
        confirming: '确认中…',
        confirmSettle: '确认结算',
        outcomeFalse: '无效/虚假',
        outcomeFalseDesc: '确认该断言为虚假无效的陈述',
        outcomeTrue: '有效/真实',
        outcomeTrueDesc: '确认该断言为真实有效的陈述',
        readyDesc: '挑战期已结束。你可以结算该断言以确认结果并分配保证金/奖励。',
        readyTitle: '可结算',
        selectOutcome: '选择结算结果',
        selectOutcomeRequired: '请选择一个结算结果后再继续',
        transactionNoteBody:
          '你将提交一笔链上交易来结算该断言。请在钱包中确认，并等待链上确认完成。',
        transactionNoteTitle: '交易提示',
      },
      stats: {
        activeDisputes: '进行中争议',
        avgResolution: '平均结算耗时',
        liveCap: '实时预言机市值',
        resolved24h: '24 小时已结算',
        totalAssertions: '断言总数',
        totalBonded: '累计质押',
        totalDisputes: '争议总数',
        tvs: '安全总价值',
        winRate: '胜率',
      },
      sync: {
        block: '区块高度',
        error: '同步错误',
        lagging: '同步滞后',
        lastUpdate: '最后更新',
        status: '索引器状态',
        synced: '已同步',
      },
      tabs: {
        leaderboard: '排行榜',
        overview: '概览',
        tools: '工具',
      },
      timeline: {
        active: '进行中',
        asserted: '已断言',
        disputed: '已争议',
        livenessEnds: '挑战期结束',
        resolved: '已结算',
        votingEnds: '投票截止',
      },
      title: '预言机监控',
      tx: {
        assertionCreatedMsg: '交易已提交，稍后将出现在列表中。',
        assertionCreatedTitle: '断言已创建',
        confirmedMsg: '交易已在链上确认。',
        confirmedTitle: '交易已确认',
        confirmingMsg: '交易已提交，正在等待链上确认。',
        confirmingTitle: '等待确认',
        disputeSubmittedMsg: '你的争议已成功提交。',
        disputeSubmittedTitle: '争议已提交',
        sentMsg: '你的交易已提交。',
        sentTitle: '交易已发送',
        settlementSubmittedMsg: '该断言已发起结算。',
        settlementSubmittedTitle: '结算已提交',
        voteCastAgainstMsg: '你已投票反对该断言。',
        voteCastSupportMsg: '你已投票支持该断言。',
        voteCastTitle: '投票已提交',
      },
    },
    pnl: {
      bondAmount: '保证金金额 (USD)',
      description: '估算您的潜在回报',
      disclaimer: '*假设标准的 1:1 保证金升级博弈逻辑。',
      iWantToAssert: '我要断言',
      iWantToDispute: '我要争议',
      profit: '潜在利润',
      roi: '投资回报率',
      title: '收益计算器',
      totalReturn: '总回报',
    },
    sidebar: {
      notConnected: '未连接',
      userWallet: '用户钱包',
    },
    status: {
      executed: '已执行',
      pendingExecution: '待执行',
      voting: '投票中',
    },
    tooltips: {
      assertion: '您要陈述的事实。请确保它是客观、可验证的，并且有明确的时间和来源。',
      bond: '质押金是断言者为确保信息真实而锁定的资金。如果信息被证明错误，质押金将被没收。',
      liveness: '挑战期是允许任何人对断言提出异议的时间窗口。结束后断言将被视为真实。',
      market: '市场问题定义了预言机需要回答的具体内容，通常是一个是/否问题或数值。',
      protocol: '该断言所涉及的协议或项目名称。',
      reward:
        '如果在挑战期结束前没有异议，断言者将取回质押金。如果发生争议且你获胜，你将获得对方的质押金作为奖励。',
    },
    wallet: {
      balance: '余额',
      connect: '连接钱包',
      connected: '钱包已连接',
      connectedMsg: '已连接到',
      connecting: '连接中...',
      copyAddress: '复制地址',
      disconnect: '断开连接',
      failed: '连接失败',
      install: '请安装 MetaMask 或 Rabby！',
      myProfile: '我的资料',
      network: '网络',
      networkAlreadySelected: '当前已在该网络',
      networkSwitched: '网络已切换',
      networkSwitchFailed: '切换网络失败',
      notFound: '未找到钱包',
      switchingNetwork: '切换中…',
      unknownNetwork: '未知网络',
    },
    watchlist: {
      emptyDesc: '您尚未添加任何关注项。',
    },
  },
} as const;

export type TranslationKey =
  | 'tooltips.bond'
  | 'tooltips.market'
  | 'tooltips.liveness'
  | 'tooltips.reward'
  | 'tooltips.protocol'
  | 'tooltips.assertion'
  | 'app.title'
  | 'app.description'
  | 'app.subtitle'
  | 'app.brand'
  | 'app.logoAlt'
  | 'howItWorks.title'
  | 'howItWorks.step1.title'
  | 'howItWorks.step1.desc'
  | 'howItWorks.step2.title'
  | 'howItWorks.step2.desc'
  | 'howItWorks.step3.title'
  | 'howItWorks.step3.desc'
  | 'nav.oracle'
  | 'nav.umaOracle'
  | 'nav.disputes'
  | 'nav.alerts'
  | 'nav.adminTokens'
  | 'nav.myAssertions'
  | 'nav.myDisputes'
  | 'nav.audit'
  | 'nav.watchlist'
  | 'common.language'
  | 'common.breadcrumb'
  | 'common.home'
  | 'common.loading'
  | 'common.comingSoon'
  | 'common.loadMore'
  | 'common.retry'
  | 'common.noData'
  | 'common.all'
  | 'common.pending'
  | 'common.disputed'
  | 'common.resolved'
  | 'common.openMenu'
  | 'common.closeMenu'
  | 'common.sidebar'
  | 'common.close'
  | 'common.viewTx'
  | 'common.copyHash'
  | 'common.copied'
  | 'common.viewDetails'
  | 'common.viewOnExplorer'
  | 'common.allLoaded'
  | 'common.popular'
  | 'common.example'
  | 'common.min'
  | 'common.usd'
  | 'common.addToWatchlist'
  | 'common.removeFromWatchlist'
  | 'common.success'
  | 'common.notNow'
  | 'sidebar.userWallet'
  | 'sidebar.notConnected'
  | 'wallet.connect'
  | 'wallet.connecting'
  | 'wallet.notFound'
  | 'wallet.install'
  | 'wallet.connected'
  | 'wallet.connectedMsg'
  | 'wallet.failed'
  | 'wallet.disconnect'
  | 'wallet.copyAddress'
  | 'wallet.balance'
  | 'wallet.myProfile'
  | 'wallet.network'
  | 'wallet.unknownNetwork'
  | 'wallet.networkSwitched'
  | 'wallet.networkSwitchFailed'
  | 'wallet.switchingNetwork'
  | 'wallet.networkAlreadySelected'
  | 'chain.local'
  | 'chain.polygon'
  | 'chain.arbitrum'
  | 'chain.optimism'
  | 'oracle.title'
  | 'oracle.description'
  | 'oracle.newAssertion'
  | 'oracle.myActivity'
  | 'oracle.myActivityTooltip'
  | 'oracle.myActivityEmpty'
  | 'oracle.myDisputesFilter'
  | 'oracle.myDisputesTooltip'
  | 'oracle.myDisputesEmpty'
  | 'oracle.searchPlaceholder'
  | 'oracle.tabs.overview'
  | 'oracle.tabs.leaderboard'
  | 'oracle.tabs.tools'
  | 'oracle.leaderboard.topAsserters'
  | 'oracle.leaderboard.topAssertersDesc'
  | 'oracle.leaderboard.topDisputers'
  | 'oracle.leaderboard.topDisputersDesc'
  | 'oracle.leaderboard.bonded'
  | 'oracle.leaderboard.noData'
  | 'oracle.leaderboard.assertions'
  | 'oracle.leaderboard.disputes'
  | 'oracle.profile.title'
  | 'oracle.profile.assertionsHistory'
  | 'oracle.profile.disputesHistory'
  | 'oracle.charts.dailyAssertions'
  | 'oracle.charts.tvsCumulative'
  | 'oracle.charts.syncHealth'
  | 'oracle.charts.topMarkets'
  | 'oracle.charts.noData'
  | 'oracle.charts.marketsDesc'
  | 'oracle.charts.dataQuality'
  | 'oracle.charts.dataQualityDesc'
  | 'oracle.charts.dataQualitySummary'
  | 'oracle.charts.lastSample'
  | 'oracle.charts.healthScore'
  | 'oracle.charts.deviationAvg'
  | 'oracle.charts.deviationMax'
  | 'oracle.charts.deviationLatest'
  | 'oracle.charts.dataSamples'
  | 'oracle.charts.anomalyView'
  | 'oracle.charts.anomalyThreshold'
  | 'oracle.charts.anomalyNone'
  | 'oracle.charts.deviationPercent'
  | 'oracle.charts.oraclePrice'
  | 'oracle.charts.referencePrice'
  | 'oracle.charts.activityDesc'
  | 'oracle.charts.tvsDesc'
  | 'oracle.charts.syncDesc'
  | 'oracle.charts.syncLagBlocks'
  | 'oracle.charts.syncDuration'
  | 'oracle.charts.waitingData'
  | 'oracle.healthScore.title'
  | 'oracle.healthScore.excellent'
  | 'oracle.healthScore.good'
  | 'oracle.healthScore.degraded'
  | 'oracle.healthScore.critical'
  | 'myAssertions.title'
  | 'myAssertions.description'
  | 'myAssertions.connectWalletTitle'
  | 'myAssertions.connectWalletDesc'
  | 'myAssertions.noAssertions'
  | 'myAssertions.createFirst'
  | 'myDisputes.title'
  | 'myDisputes.description'
  | 'myDisputes.connectWalletTitle'
  | 'myDisputes.connectWalletDesc'
  | 'oracle.charts.waitingData'
  | 'oracle.myAssertions.title'
  | 'oracle.myAssertions.description'
  | 'oracle.myAssertions.connectWalletTitle'
  | 'oracle.myAssertions.connectWalletDesc'
  | 'oracle.myAssertions.noAssertions'
  | 'oracle.myAssertions.createFirst'
  | 'oracle.myAssertions.searchPlaceholder'
  | 'oracle.myDisputes.title'
  | 'oracle.myDisputes.description'
  | 'oracle.myDisputes.connectWalletTitle'
  | 'oracle.myDisputes.connectWalletDesc'
  | 'oracle.myDisputes.noDisputes'
  | 'oracle.myDisputes.searchPlaceholder'
  | 'oracle.sync.synced'
  | 'oracle.sync.lagging'
  | 'oracle.sync.error'
  | 'oracle.sync.status'
  | 'oracle.sync.block'
  | 'oracle.sync.lastUpdate'
  | 'oracle.timeline.asserted'
  | 'oracle.timeline.disputed'
  | 'oracle.timeline.resolved'
  | 'oracle.timeline.votingEnds'
  | 'oracle.timeline.livenessEnds'
  | 'oracle.timeline.active'
  | 'oracle.detail.back'
  | 'oracle.detail.title'
  | 'oracle.detail.marketQuestion'
  | 'oracle.detail.assertedOutcome'
  | 'oracle.detail.asserter'
  | 'oracle.detail.transaction'
  | 'oracle.detail.bondAmount'
  | 'oracle.detail.confirming'
  | 'oracle.detail.disputeAssertion'
  | 'oracle.detail.disputeRequiresBond'
  | 'oracle.detail.disputeActive'
  | 'oracle.detail.reason'
  | 'oracle.detail.support'
  | 'oracle.detail.against'
  | 'oracle.detail.voteOnDispute'
  | 'oracle.detail.errorTitle'
  | 'oracle.detail.errorNotFound'
  | 'oracle.detail.goBack'
  | 'oracle.detail.walletNotFound'
  | 'oracle.detail.installWallet'
  | 'oracle.detail.txSent'
  | 'oracle.detail.txFailed'
  | 'oracle.detail.hash'
  | 'oracle.detail.votes'
  | 'oracle.detail.reasonForDispute'
  | 'oracle.detail.reasonPlaceholder'
  | 'oracle.detail.validationError'
  | 'oracle.detail.reasonRequired'
  | 'oracle.detail.submitting'
  | 'oracle.detail.cancel'
  | 'oracle.detail.confirmDispute'
  | 'oracle.detail.timeline'
  | 'oracle.detail.actions'
  | 'oracle.detail.resolved'
  | 'oracle.detail.resolvedDesc'
  | 'oracle.detail.settleAssertion'
  | 'oracle.detail.settleDesc'
  | 'oracle.detail.settlementResult'
  | 'oracle.detail.settlementTrue'
  | 'oracle.detail.settlementFalse'
  | 'oracle.detail.riskImpactTitle'
  | 'oracle.detail.riskImpactDesc'
  | 'oracle.detail.riskNone'
  | 'oracle.detail.relatedAssertion'
  | 'oracle.detail.relatedDispute'
  | 'oracle.tx.disputeSubmittedTitle'
  | 'oracle.tx.disputeSubmittedMsg'
  | 'oracle.tx.assertionCreatedTitle'
  | 'oracle.tx.assertionCreatedMsg'
  | 'oracle.tx.voteCastTitle'
  | 'oracle.tx.voteCastSupportMsg'
  | 'oracle.tx.voteCastAgainstMsg'
  | 'oracle.tx.settlementSubmittedTitle'
  | 'oracle.tx.settlementSubmittedMsg'
  | 'oracle.tx.sentTitle'
  | 'oracle.tx.sentMsg'
  | 'oracle.tx.confirmingTitle'
  | 'oracle.tx.confirmingMsg'
  | 'oracle.tx.confirmedTitle'
  | 'oracle.tx.confirmedMsg'
  | 'oracle.createAssertionModal.protocolLabel'
  | 'oracle.createAssertionModal.protocolPlaceholder'
  | 'oracle.createAssertionModal.marketLabel'
  | 'oracle.createAssertionModal.marketPlaceholder'
  | 'oracle.createAssertionModal.assertionLabel'
  | 'oracle.createAssertionModal.assertionPlaceholder'
  | 'oracle.createAssertionModal.bondLabel'
  | 'oracle.createAssertionModal.submit'
  | 'oracle.createAssertionModal.bondInvalid'
  | 'oracle.disputeModal.desc'
  | 'oracle.disputeModal.reasonHint'
  | 'oracle.disputeModal.reasonExample'
  | 'oracle.disputeModal.bondLabel'
  | 'oracle.disputeModal.submit'
  | 'oracle.disputeModal.warning'
  | 'oracle.settleModal.readyTitle'
  | 'oracle.settleModal.readyDesc'
  | 'oracle.settleModal.assertionId'
  | 'oracle.settleModal.selectOutcome'
  | 'oracle.settleModal.outcomeTrue'
  | 'oracle.settleModal.outcomeTrueDesc'
  | 'oracle.settleModal.outcomeFalse'
  | 'oracle.settleModal.outcomeFalseDesc'
  | 'oracle.settleModal.selectOutcomeRequired'
  | 'oracle.settleModal.transactionNoteTitle'
  | 'oracle.settleModal.transactionNoteBody'
  | 'oracle.config.title'
  | 'oracle.config.rpcUrl'
  | 'oracle.config.contractAddress'
  | 'oracle.config.chain'
  | 'oracle.config.startBlock'
  | 'oracle.config.maxBlockRange'
  | 'oracle.config.votingPeriodHours'
  | 'oracle.config.confirmationBlocks'
  | 'oracle.config.adminToken'
  | 'oracle.config.adminActor'
  | 'oracle.config.adminActorPlaceholder'
  | 'oracle.config.save'
  | 'oracle.config.syncNow'
  | 'oracle.config.syncStatus'
  | 'oracle.config.syncing'
  | 'oracle.config.syncDuration'
  | 'oracle.config.syncError'
  | 'oracle.config.lastBlock'
  | 'oracle.config.latestBlock'
  | 'oracle.config.safeBlock'
  | 'oracle.config.lagBlocks'
  | 'oracle.config.consecutiveFailures'
  | 'oracle.config.rpcActive'
  | 'oracle.config.owner'
  | 'oracle.config.ownerType'
  | 'oracle.config.ownerTypeContract'
  | 'oracle.config.ownerTypeEoa'
  | 'oracle.config.ownerTypeUnknown'
  | 'oracle.config.indexed'
  | 'oracle.config.demo'
  | 'oracle.config.demoHint'
  | 'oracle.config.indexedHint'
  | 'oracle.stats.tvs'
  | 'oracle.stats.activeDisputes'
  | 'oracle.stats.resolved24h'
  | 'oracle.stats.avgResolution'
  | 'oracle.stats.liveCap'
  | 'oracle.stats.totalAssertions'
  | 'oracle.stats.totalDisputes'
  | 'oracle.stats.totalBonded'
  | 'oracle.stats.winRate'
  | 'oracle.card.marketQuestion'
  | 'oracle.card.assertion'
  | 'oracle.card.asserter'
  | 'oracle.card.disputer'
  | 'oracle.card.tx'
  | 'oracle.card.bond'
  | 'oracle.card.livenessEnds'
  | 'oracle.card.gridView'
  | 'oracle.card.listView'
  | 'pnl.title'
  | 'pnl.description'
  | 'pnl.iWantToDispute'
  | 'pnl.iWantToAssert'
  | 'pnl.bondAmount'
  | 'pnl.disclaimer'
  | 'pnl.profit'
  | 'pnl.roi'
  | 'pnl.totalReturn'
  | 'audit.title'
  | 'audit.description'
  | 'audit.adminToken'
  | 'audit.adminTokenPlaceholder'
  | 'audit.adminTokenHint'
  | 'audit.filters'
  | 'audit.total'
  | 'audit.refresh'
  | 'audit.action'
  | 'audit.entityType'
  | 'audit.entityId'
  | 'audit.query'
  | 'audit.actorPlaceholder'
  | 'audit.actionPlaceholder'
  | 'audit.entityTypePlaceholder'
  | 'audit.entityIdPlaceholder'
  | 'audit.queryPlaceholder'
  | 'audit.apply'
  | 'audit.clear'
  | 'audit.exportJson'
  | 'audit.exportCsv'
  | 'audit.exporting'
  | 'audit.error'
  | 'audit.empty'
  | 'audit.actor'
  | 'adminTokens.title'
  | 'adminTokens.description'
  | 'adminTokens.label'
  | 'adminTokens.role'
  | 'adminTokens.create'
  | 'adminTokens.revoke'
  | 'adminTokens.createdAt'
  | 'adminTokens.revokedAt'
  | 'adminTokens.tokenValue'
  | 'disputes.title'
  | 'disputes.description'
  | 'disputes.umaDvmActive'
  | 'disputes.viewOnUma'
  | 'disputes.reason'
  | 'disputes.disputer'
  | 'disputes.disputedAt'
  | 'disputes.votingProgress'
  | 'disputes.endsAt'
  | 'disputes.support'
  | 'disputes.reject'
  | 'disputes.totalVotesCast'
  | 'disputes.emptyTitle'
  | 'disputes.emptyDesc'
  | 'disputes.card.dispute'
  | 'disputes.card.disputer'
  | 'disputes.card.votes'
  | 'alerts.title'
  | 'alerts.description'
  | 'alerts.adminToken'
  | 'alerts.adminActor'
  | 'alerts.adminActorPlaceholder'
  | 'alerts.rules'
  | 'alerts.refresh'
  | 'alerts.acknowledge'
  | 'alerts.resolve'
  | 'alerts.status'
  | 'alerts.severity'
  | 'alerts.type'
  | 'alerts.searchPlaceholder'
  | 'alerts.loadRules'
  | 'alerts.saveRules'
  | 'alerts.savingRules'
  | 'alerts.lastSeen'
  | 'alerts.occurrences'
  | 'alerts.adminTokenHint'
  | 'alerts.adminTokenWarning'
  | 'alerts.owner'
  | 'alerts.runbook'
  | 'alerts.silencedUntil'
  | 'alerts.unsilence'
  | 'alerts.silence30m'
  | 'alerts.silence2h'
  | 'alerts.silence24h'
  | 'alerts.explanation'
  | 'alerts.recommendedActions'
  | 'alerts.explanations.dispute_created'
  | 'alerts.explanations.liveness_expiring'
  | 'alerts.explanations.sync_error'
  | 'alerts.explanations.stale_sync'
  | 'alerts.explanations.contract_paused'
  | 'alerts.explanations.sync_backlog'
  | 'alerts.explanations.backlog_assertions'
  | 'alerts.explanations.backlog_disputes'
  | 'alerts.explanations.market_stale'
  | 'alerts.explanations.execution_delayed'
  | 'alerts.explanations.low_participation'
  | 'alerts.explanations.high_vote_divergence'
  | 'alerts.explanations.high_dispute_rate'
  | 'alerts.explanations.slow_api_request'
  | 'alerts.explanations.high_error_rate'
  | 'alerts.explanations.database_slow_query'
  | 'alerts.explanations.price_deviation'
  | 'alerts.explanations.low_gas'
  | 'alerts.actions.dispute_created.1'
  | 'alerts.actions.dispute_created.2'
  | 'alerts.actions.liveness_expiring.1'
  | 'alerts.actions.liveness_expiring.2'
  | 'alerts.actions.sync_error.1'
  | 'alerts.actions.sync_error.2'
  | 'alerts.actions.stale_sync.1'
  | 'alerts.actions.stale_sync.2'
  | 'alerts.actions.contract_paused.1'
  | 'alerts.actions.contract_paused.2'
  | 'alerts.actions.sync_backlog.1'
  | 'alerts.actions.sync_backlog.2'
  | 'alerts.actions.backlog_assertions.1'
  | 'alerts.actions.backlog_assertions.2'
  | 'alerts.actions.backlog_disputes.1'
  | 'alerts.actions.backlog_disputes.2'
  | 'alerts.actions.market_stale.1'
  | 'alerts.actions.market_stale.2'
  | 'alerts.actions.execution_delayed.1'
  | 'alerts.actions.execution_delayed.2'
  | 'alerts.actions.low_participation.1'
  | 'alerts.actions.low_participation.2'
  | 'alerts.actions.high_vote_divergence.1'
  | 'alerts.actions.high_vote_divergence.2'
  | 'alerts.actions.high_dispute_rate.1'
  | 'alerts.actions.high_dispute_rate.2'
  | 'alerts.actions.slow_api_request.1'
  | 'alerts.actions.slow_api_request.2'
  | 'alerts.actions.high_error_rate.1'
  | 'alerts.actions.high_error_rate.2'
  | 'alerts.actions.database_slow_query.1'
  | 'alerts.actions.database_slow_query.2'
  | 'alerts.actions.price_deviation.1'
  | 'alerts.actions.price_deviation.2'
  | 'alerts.actions.low_gas.1'
  | 'alerts.actions.low_gas.2'
  | 'watchlist.emptyDesc'
  | 'status.voting'
  | 'status.pendingExecution'
  | 'status.executed'
  | 'errors.unknownError'
  | 'errors.walletNotConnected'
  | 'errors.userRejected'
  | 'errors.requestPending'
  | 'errors.chainNotAdded'
  | 'errors.wrongNetwork'
  | 'errors.insufficientFunds'
  | 'errors.invalidAddress'
  | 'errors.invalidMaxBlockRange'
  | 'errors.invalidVotingPeriodHours'
  | 'onboarding.title'
  | 'onboarding.welcome'
  | 'onboarding.welcomeDesc'
  | 'onboarding.selectRole'
  | 'onboarding.skipTour'
  | 'onboarding.continueAsGeneral'
  | 'onboarding.getStarted'
  | 'onboarding.next'
  | 'onboarding.roles.developer.title'
  | 'onboarding.roles.developer.description'
  | 'onboarding.roles.protocol_team.title'
  | 'onboarding.roles.protocol_team.description'
  | 'onboarding.roles.oracle_operator.title'
  | 'onboarding.roles.oracle_operator.description'
  | 'onboarding.roles.general_user.title'
  | 'onboarding.roles.general_user.description'
  | 'onboarding.steps.developer.api.title'
  | 'onboarding.steps.developer.api.description'
  | 'onboarding.steps.developer.integration.title'
  | 'onboarding.steps.developer.integration.description'
  | 'onboarding.steps.developer.monitoring.title'
  | 'onboarding.steps.developer.monitoring.description'
  | 'onboarding.steps.protocol_team.monitoring.title'
  | 'onboarding.steps.protocol_team.monitoring.description'
  | 'onboarding.steps.protocol_team.disputes.title'
  | 'onboarding.steps.protocol_team.disputes.description'
  | 'onboarding.steps.protocol_team.analytics.title'
  | 'onboarding.steps.protocol_team.analytics.description'
  | 'onboarding.steps.oracle_operator.nodeMonitoring.title'
  | 'onboarding.steps.oracle_operator.nodeMonitoring.description'
  | 'onboarding.steps.oracle_operator.syncStatus.title'
  | 'onboarding.steps.oracle_operator.syncStatus.description'
  | 'onboarding.steps.oracle_operator.alerts.title'
  | 'onboarding.steps.oracle_operator.alerts.description'
  | 'onboarding.steps.general_user.exploration.title'
  | 'onboarding.steps.general_user.exploration.description'
  | 'onboarding.steps.general_user.assertions.title'
  | 'onboarding.steps.general_user.assertions.description'
  | 'onboarding.steps.general_user.disputes.title'
  | 'onboarding.steps.general_user.disputes.description'
  | 'errors.httpError'
  | 'errors.invalidJson'
  | 'errors.apiError'
  | 'errors.invalidApiResponse'
  | 'errors.missingConfig'
  | 'errors.invalidRpcUrl'
  | 'errors.invalidContractAddress'
  | 'errors.invalidChain'
  | 'errors.invalidRequestBody'
  | 'errors.forbidden'
  | 'errors.rpcUnreachable'
  | 'errors.contractNotFound'
  | 'errors.syncFailed'
  | 'oracle.alerts.title'
  | 'oracle.alerts.description'
  | 'oracle.alerts.rule'
  | 'oracle.alerts.ruleId'
  | 'oracle.alerts.event'
  | 'oracle.alerts.severity'
  | 'oracle.alerts.owner'
  | 'oracle.alerts.ownerPlaceholder'
  | 'oracle.alerts.runbook'
  | 'oracle.alerts.runbookPlaceholder'
  | 'oracle.alerts.status'
  | 'oracle.alerts.enabled'
  | 'oracle.alerts.disabled'
  | 'oracle.alerts.save'
  | 'oracle.alerts.saving'
  | 'oracle.alerts.success'
  | 'oracle.alerts.error'
  | 'oracle.alerts.noRules'
  | 'oracle.alerts.events.dispute_created'
  | 'oracle.alerts.events.liveness_expiring'
  | 'oracle.alerts.events.contract_paused'
  | 'oracle.alerts.events.sync_error'
  | 'oracle.alerts.events.stale_sync'
  | 'oracle.alerts.events.sync_backlog'
  | 'oracle.alerts.events.backlog_assertions'
  | 'oracle.alerts.events.backlog_disputes'
  | 'oracle.alerts.events.market_stale'
  | 'oracle.alerts.events.execution_delayed'
  | 'oracle.alerts.events.low_participation'
  | 'oracle.alerts.events.high_vote_divergence'
  | 'oracle.alerts.events.high_dispute_rate'
  | 'oracle.alerts.events.slow_api_request'
  | 'oracle.alerts.events.high_error_rate'
  | 'oracle.alerts.events.database_slow_query'
  | 'oracle.alerts.events.price_deviation'
  | 'oracle.alerts.events.low_gas'
  | 'oracle.alerts.channels'
  | 'oracle.alerts.channelsWebhook'
  | 'oracle.alerts.channelsEmail'
  | 'oracle.alerts.channelsTelegram'
  | 'oracle.alerts.recipient'
  | 'oracle.alerts.recipientPlaceholder'
  | 'oracle.alerts.params.maxAgeMinutes'
  | 'oracle.alerts.params.maxLagBlocks'
  | 'oracle.alerts.params.maxOpenAssertions'
  | 'oracle.alerts.params.maxOpenDisputes'
  | 'oracle.alerts.params.maxDelayMinutes'
  | 'oracle.alerts.params.thresholdMs'
  | 'oracle.alerts.params.thresholdPercent'
  | 'oracle.alerts.params.windowMinutes'
  | 'oracle.alerts.params.windowDays'
  | 'oracle.alerts.params.withinMinutes'
  | 'oracle.alerts.params.minTotalVotes'
  | 'oracle.alerts.params.minAssertions'
  | 'oracle.alerts.params.maxMarginPercent'
  | 'oracle.alerts.params.cooldownMs'
  | 'oracle.alerts.params.escalateAfterMs'
  | 'oracle.alerts.params.priceDeviationThreshold'
  | 'oracle.alerts.params.minBalanceEth'
  | 'oracle.alerts.validation.emailRecipientRequired'
  | 'oracle.alerts.validation.emailRecipientInvalid'
  | 'oracle.alerts.validation.staleSyncMaxAgeMsPositive'
  | 'oracle.alerts.validation.marketStaleMaxAgeMsPositive'
  | 'oracle.alerts.validation.maxLagBlocksPositive'
  | 'oracle.alerts.validation.maxOpenAssertionsPositive'
  | 'oracle.alerts.validation.maxOpenDisputesPositive'
  | 'oracle.alerts.validation.executionDelayedMaxDelayMinutesPositive'
  | 'oracle.alerts.validation.slowApiThresholdMsPositive'
  | 'oracle.alerts.validation.databaseSlowQueryThresholdMsPositive'
  | 'oracle.alerts.validation.highErrorRateThresholdPercentRange'
  | 'oracle.alerts.validation.highErrorRateWindowMinutesPositive'
  | 'oracle.alerts.validation.withinMinutesPositive'
  | 'oracle.alerts.validation.minTotalVotesNonNegative'
  | 'oracle.alerts.validation.minTotalVotesPositive'
  | 'oracle.alerts.validation.maxMarginPercentRange'
  | 'oracle.alerts.validation.highDisputeRateWindowDaysPositive'
  | 'oracle.alerts.validation.highDisputeRateMinAssertionsPositive'
  | 'oracle.alerts.validation.highDisputeRateThresholdPercentRange'
  | 'oracle.alerts.validation.priceDeviationPositive'
  | 'oracle.alerts.validation.lowGasPositive'
  | 'oracle.alerts.testSend'
  | 'oracle.alerts.testSending'
  | 'oracle.alerts.testSent'
  | 'oracle.alerts.testFailed'
  | 'oracle.alerts.opsTitle'
  | 'oracle.alerts.opsAlertsOpen'
  | 'oracle.alerts.opsAlertsAcknowledged'
  | 'oracle.alerts.opsMtta'
  | 'oracle.alerts.opsAlertMttr'
  | 'oracle.alerts.opsIncidentsOpen'
  | 'oracle.alerts.opsIncidentMttr'
  | 'oracle.alerts.opsTrend'
  | 'oracle.alerts.topRisks'
  | 'oracle.alerts.severities.info'
  | 'oracle.alerts.severities.warning'
  | 'oracle.alerts.severities.critical'
  | 'pwa.install'
  | 'pwa.installDescription'
  | 'pwa.installTitle'
  | 'pwa.installing'
  | 'pwa.offline'
  | 'pwa.offlineDescription'
  | 'pwa.update'
  | 'pwa.updateAvailable'
  | 'pwa.updateDescription'
  | 'common.export'
  | 'common.refresh'
  | 'keyboardShortcuts.title'
  | 'keyboardShortcuts.pressAny'
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
  | 'uma.assertionDetail.against'
  | 'tooltips.help'
  | 'tooltips.noContent'
  | 'tooltips.keyboardShortcuts'
  | 'tooltips.viewDocs'
  | 'errors.unknown'
  | 'errors.retry'
  | 'errors.contactSupport'
  | 'errors.refreshPage'
  | 'errors.errorCode'
  | 'errors.errorDetails'
  | 'errors.retryable'
  | 'errors.noItems'
  | 'errors.cancelled'
  | 'errors.processing'
  | 'common.settings'
  | 'common.disconnect'
  | 'common.search'
  | 'common.notifications'
  | 'common.userMenu'
  | 'common.openMenu'
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
  | 'validation.protocolLength'
  | 'validation.marketLength'
  | 'validation.assertionLength'
  | 'validation.invalidUrl'
  | 'batch.processing'
  | 'errors.severity'
  | 'errors.severityCritical'
  | 'errors.severityHigh'
  | 'errors.severityMedium'
  | 'errors.severityLow'
  | 'errors.requestTimeout'
  | 'errors.networkConnectionFailed'
  | 'errors.rateLimitExceeded'
  | 'errors.authenticationFailed'
  | 'errors.permissionDenied'
  | 'errors.resourceNotFound'
  | 'common.page'
  | 'common.of'
  | 'common.total'
  | 'common.previous'
  | 'common.next'
  | 'common.navigation';

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
