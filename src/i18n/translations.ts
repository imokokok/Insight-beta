export type Lang = "zh" | "en" | "es";

export const languages: Array<{ code: Lang; label: string }> = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export const LANG_STORAGE_KEY = "insight_lang";

export function isLang(value: unknown): value is Lang {
  return value === "zh" || value === "en" || value === "es";
}

export function detectLangFromAcceptLanguage(
  value: string | null | undefined
): Lang {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("zh")) return "zh";
  if (lower.includes("es")) return "es";
  return "en";
}

export const langToHtmlLang: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en",
  es: "es",
};

export const langToLocale: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en-US",
  es: "es-ES",
};

export const translations = {
  zh: {
    tooltips: {
      bond: "质押金是断言者为确保信息真实而锁定的资金。如果信息被证明错误，质押金将被没收。",
      market:
        "市场问题定义了预言机需要回答的具体内容，通常是一个是/否问题或数值。",
      liveness:
        "挑战期是允许任何人对断言提出异议的时间窗口。结束后断言将被视为真实。",
      reward:
        "如果在挑战期结束前没有异议，断言者将取回质押金。如果发生争议且你获胜，你将获得对方的质押金作为奖励。",
      protocol: "该断言所涉及的协议或项目名称。",
      assertion:
        "您要陈述的事实。请确保它是客观、可验证的，并且有明确的时间和来源。",
    },
    app: {
      title: "Insight · UMA 结算监控",
      description: "UMA Optimistic Oracle 争议与结算可视化监控",
      subtitle: "预言机监控",
    },
    howItWorks: {
      title: "工作原理",
      step1: {
        title: "提出断言",
        desc: "任何人都可以将任何陈述作为事实发布，并附带质押金作为保证金。",
      },
      step2: {
        title: "验证与争议",
        desc: "在挑战期内，如果断言不实，任何人都可以通过质押相同金额来发起挑战。",
      },
      step3: {
        title: "结算与奖励",
        desc: "若无挑战，断言生效。若发生挑战，UMA 验证者将裁决，胜者赢取对方的质押金。",
      },
    },
    nav: {
      oracle: "监控台",
      disputes: "争议",
      alerts: "告警",
      audit: "审计",
      adminTokens: "密钥",
      myAssertions: "我的断言",
      myDisputes: "我的争议",
      watchlist: "关注列表",
    },
    common: {
      language: "语言",
      loading: "加载中…",
      comingSoon: "敬请期待",
      loadMore: "加载更多",
      retry: "重试",
      noData: "暂无数据",
      all: "全部",
      pending: "待确认",
      disputed: "有争议",
      resolved: "已结算",
      openMenu: "打开菜单",
      closeMenu: "关闭菜单",
      close: "关闭",
      viewTx: "查看交易",
      copyHash: "复制哈希",
      copied: "已复制",
      viewDetails: "查看详情",
      viewOnExplorer: "在浏览器查看",
      allLoaded: "已全部加载",
      ok: "好的",
      cancel: "取消",
      confirm: "确认",
      success: "成功",
      popular: "热门",
      example: "示例",
      min: "最小",
      addToWatchlist: "加入关注",
      removeFromWatchlist: "取消关注",
    },
    sidebar: {
      userWallet: "用户钱包",
      notConnected: "未连接",
    },
    wallet: {
      connect: "连接钱包",
      connecting: "连接中...",
      notFound: "未找到钱包",
      install: "请安装 MetaMask 或 Rabby！",
      connected: "钱包已连接",
      connectedMsg: "已连接到",
      failed: "连接失败",
      disconnect: "断开连接",
      copyAddress: "复制地址",
      balance: "余额",
      myProfile: "我的资料",
      network: "网络",
      unknownNetwork: "未知网络",
      networkSwitched: "网络已切换",
      networkSwitchFailed: "切换网络失败",
      switchingNetwork: "切换中…",
      networkAlreadySelected: "当前已在该网络",
    },
    chain: {
      local: "本地",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
    },
    oracle: {
      title: "预言机监控",
      description: "实时追踪 UMA Optimistic Oracle 断言与争议。",
      newAssertion: "新建断言",
      myActivity: "我的动态",
      myActivityTooltip: "仅显示由我创建的断言",
      myActivityEmpty: "您尚未创建任何断言。",
      myDisputesFilter: "我的争议",
      myDisputesTooltip: "仅显示由我发起的争议",
      myDisputesEmpty: "您尚未发起任何争议。",
      searchPlaceholder: "搜索断言…",
      tabs: {
        overview: "概览",
        leaderboard: "排行榜",
        tools: "工具",
      },
      sync: {
        synced: "已同步",
        lagging: "同步滞后",
        error: "同步错误",
        status: "索引器状态",
        block: "区块高度",
        lastUpdate: "最后更新",
      },
      charts: {
        dailyAssertions: "每日断言数",
        tvsCumulative: "安全总价值（累计）",
        syncHealth: "同步健康",
        topMarkets: "热门市场",
        noData: "暂无图表数据",
        activityDesc: "随时间变化的活动",
        tvsDesc: "累计价值",
        syncDesc: "索引器同步滞后与耗时趋势",
        syncLagBlocks: "落后区块",
        syncDuration: "同步耗时（毫秒）",
        waitingData: "等待更多历史数据以生成活动趋势。",
      },
      alerts: {
        title: "告警规则",
        description: "配置系统监控与通知规则。",
        rule: "规则名称",
        event: "触发事件",
        severity: "严重程度",
        status: "状态",
        enabled: "已启用",
        disabled: "已禁用",
        save: "保存配置",
        saving: "保存中...",
        success: "配置已保存",
        error: "保存失败",
        noRules: "暂无规则",
        events: {
          dispute_created: "争议创建",
          sync_error: "同步错误",
          stale_sync: "同步停滞",
        },
        severities: {
          info: "信息",
          warning: "警告",
          critical: "严重",
        },
      },
      myAssertions: {
        title: "我的断言",
        description: "管理您创建的所有断言。",
        connectWalletTitle: "连接钱包以查看",
        connectWalletDesc: "请连接您的钱包以查看您的断言历史记录。",
        noAssertions: "您尚未创建任何断言。",
        createFirst: "创建您的第一个断言",
      },
      myDisputes: {
        title: "我的争议",
        description: "管理您发起的所有争议。",
        connectWalletTitle: "连接钱包以查看",
        connectWalletDesc: "请连接您的钱包以查看您的争议历史记录。",
        noDisputes: "您尚未发起任何争议。",
      },
      timeline: {
        asserted: "已断言",
        disputed: "已争议",
        resolved: "已结算",
        votingEnds: "投票截止",
        livenessEnds: "挑战期结束",
        active: "进行中",
      },
      detail: {
        title: "断言详情",
        back: "返回概览",
        errorTitle: "未找到断言",
        errorNotFound: "该断言不存在或已被移除。",
        goBack: "返回列表",
        walletNotFound: "未检测到钱包",
        installWallet: "请安装 MetaMask 或其他 Web3 钱包。",
        validationError: "验证错误",
        reasonRequired: "请提供争议理由。",
        submitting: "提交中…",
        confirming: "确认中…",
        txSent: "交易已发送",
        hash: "哈希",
        txFailed: "交易失败",
        marketQuestion: "市场问题",
        assertedOutcome: "断言结果",
        asserter: "断言者",
        transaction: "交易",
        disputeAssertion: "争议此断言",
        reasonForDispute: "争议理由",
        reasonPlaceholder: "请详细说明为什么此断言不正确...",
        cancel: "取消",
        confirmDispute: "确认争议",
        disputeRequiresBond: "争议需要缴纳保证金：",
        disputeActive: "争议进行中",
        reason: "理由",
        support: "支持",
        against: "反对",
        votes: "票",
        voteOnDispute: "参与投票",
        bondAmount: "保证金金额",
        timeline: "时间轴",
        actions: "操作",
        resolved: "已解决",
        resolvedDesc: "此断言已成功解决。",
        settleAssertion: "结算断言",
        settleDesc: "该断言已通过挑战期，可以进行结算。",
        settlementResult: "结算结果",
        settlementTrue: "有效 / 真实",
        settlementFalse: "无效 / 虚假",
      },
      tx: {
        sentTitle: "交易已发送",
        sentMsg: "你的交易已提交。",
        confirmingTitle: "等待确认",
        confirmingMsg: "交易已提交，正在等待链上确认。",
        confirmedTitle: "交易已确认",
        confirmedMsg: "交易已在链上确认。",
        disputeSubmittedTitle: "争议已提交",
        disputeSubmittedMsg: "你的争议已成功提交。",
        assertionCreatedTitle: "断言已创建",
        assertionCreatedMsg: "交易已提交，稍后将出现在列表中。",
        voteCastTitle: "投票已提交",
        voteCastSupportMsg: "你已投票支持该断言。",
        voteCastAgainstMsg: "你已投票反对该断言。",
        settlementSubmittedTitle: "结算已提交",
        settlementSubmittedMsg: "该断言已发起结算。",
      },
      createAssertionModal: {
        protocolLabel: "协议",
        protocolPlaceholder: "例如：Aave V3",
        marketLabel: "市场 / ID",
        marketPlaceholder: "例如：ETH-USDC",
        assertionLabel: "断言内容",
        assertionPlaceholder: "你认为的事实是什么？",
        bondLabel: "保证金 (ETH)",
        submit: "创建断言",
        bondInvalid: "保证金金额必须大于 0",
      },
      disputeModal: {
        desc: "提交争议需要缴纳保证金（Bond）。",
        bondLabel: "保证金（ETH）",
        submit: "提交争议",
        warning: "警告：如果断言被验证为正确，您将失去质押金。",
      },
      settleModal: {
        readyTitle: "可结算",
        readyDesc:
          "挑战期已结束。你可以结算该断言以确认结果并分配保证金/奖励。",
      },
      config: {
        title: "连接与同步",
        rpcUrl: "RPC URL",
        contractAddress: "合约地址",
        chain: "链",
        startBlock: "起始区块",
        maxBlockRange: "最大区块跨度",
        votingPeriodHours: "投票期（小时）",
        confirmationBlocks: "确认区块数",
        adminToken: "管理员 Token",
        adminActor: "操作者",
        adminActorPlaceholder: "例如：alice@ops",
        save: "保存",
        syncNow: "立即同步",
        syncStatus: "同步状态",
        syncing: "同步中…",
        syncDuration: "耗时",
        syncError: "上次失败原因",
        lastBlock: "处理到区块",
        latestBlock: "最新区块",
        safeBlock: "安全区块",
        lagBlocks: "落后区块",
        consecutiveFailures: "连续失败次数",
        rpcActive: "当前 RPC",
        owner: "合约 Owner",
        ownerType: "Owner 类型",
        ownerTypeContract: "合约 / 多签",
        ownerTypeEoa: "外部账户 (EOA)",
        ownerTypeUnknown: "未知类型",
        indexed: "已索引",
        demo: "演示数据",
        demoHint: "当前展示演示数据。填写配置并点击立即同步获取链上数据。",
        indexedHint: "已连接到链上数据，数据将自动刷新。",
      },
      stats: {
        tvs: "安全总价值",
        activeDisputes: "进行中争议",
        resolved24h: "24 小时已结算",
        avgResolution: "平均结算耗时",
        liveCap: "实时预言机市值",
        totalAssertions: "断言总数",
        totalDisputes: "争议总数",
        totalBonded: "累计质押",
        winRate: "胜率",
      },
      card: {
        marketQuestion: "市场问题",
        assertion: "断言",
        asserter: "断言发起方",
        disputer: "争议发起方",
        tx: "交易",
        bond: "保证金",
        livenessEnds: "挑战期结束",
        gridView: "网格视图",
        listView: "列表视图",
      },
      leaderboard: {
        topAsserters: "最佳断言方",
        topAssertersDesc: "最活跃的贡献者",
        topDisputers: "最佳争议方",
        topDisputersDesc: "最活跃的验证者",
        bonded: "已质押",
        noData: "暂无数据",
        assertions: "断言数",
        disputes: "争议数",
      },
      profile: {
        title: "地址概览",
        assertionsHistory: "断言历史",
        disputesHistory: "争议历史",
      },
    },
    pnl: {
      title: "收益计算器",
      description: "估算您的潜在回报",
      iWantToDispute: "我要争议",
      iWantToAssert: "我要断言",
      bondAmount: "保证金金额 (USD)",
      disclaimer: "*假设标准的 1:1 保证金升级博弈逻辑。",
      profit: "潜在利润",
      roi: "投资回报率",
      totalReturn: "总回报",
    },
    audit: {
      title: "审计日志",
      description: "追踪管理员操作与关键配置变更。",
      adminToken: "管理员 Token",
      adminTokenPlaceholder: "Bearer …",
      adminTokenHint: "使用监控台里保存的管理员 Token。",
      total: "总记录",
      refresh: "刷新",
      error: "错误",
      empty: "暂无审计记录。",
      actor: "操作者",
    },
    adminTokens: {
      title: "管理密钥",
      description: "创建、轮换与吊销管理员 Token。",
      label: "标签",
      role: "角色",
      create: "创建",
      revoke: "吊销",
      createdAt: "创建时间",
      revokedAt: "吊销时间",
      tokenValue: "新 Token（仅显示一次）",
    },
    disputes: {
      title: "争议结算",
      description: "监控争议进展、投票情况与最终裁决。",
      umaDvmActive: "UMA DVM 运行中",
      viewOnUma: "在 UMA 查看",
      reason: "争议原因",
      disputer: "争议发起方",
      disputedAt: "发起时间",
      votingProgress: "投票进度",
      endsAt: "截止",
      support: "支持断言",
      reject: "反对断言",
      totalVotesCast: "已投票总数",
      emptyTitle: "暂无活跃争议",
      emptyDesc: "当前系统没有活跃争议，可稍后再查看。",
      card: {
        dispute: "争议",
        disputer: "争议发起方",
        votes: "票数",
      },
    },
    alerts: {
      title: "告警中心",
      description: "聚合告警、确认处理并追踪系统健康。",
      adminToken: "管理员 Token",
      adminActor: "操作者",
      adminActorPlaceholder: "例如：alice@ops",
      adminTokenHint: "仅保存在本地，用于访问管理员接口",
      adminTokenWarning:
        "未填写 Token 时只能查看告警，不能确认/解决或保存规则。",
      rules: "告警规则",
      refresh: "刷新",
      acknowledge: "确认",
      resolve: "解决",
      status: "状态",
      severity: "级别",
      type: "类型",
      searchPlaceholder: "搜索标题/内容/实体…",
      loadRules: "加载规则",
      saveRules: "保存",
      savingRules: "保存中…",
      lastSeen: "最近",
      occurrences: "次数",
    },
    watchlist: {
      emptyDesc: "你还没有将任何断言加入关注列表。",
    },
    status: {
      voting: "投票中",
      pendingExecution: "待执行",
      executed: "已执行",
    },
    errors: {
      unknownError: "未知错误",
      walletNotConnected: "钱包未连接",
      userRejected: "你已取消钱包请求。",
      requestPending: "钱包中已有待处理请求，请先在钱包内完成或取消。",
      chainNotAdded: "钱包未添加该网络，请先添加后再重试。",
      wrongNetwork: "网络不匹配，请切换到目标链后重试。",
      insufficientFunds: "余额不足，无法支付交易费用或转账金额。",
      invalidAddress: "地址格式不正确",
      invalidMaxBlockRange: "最大区块跨度不在允许范围内",
      invalidVotingPeriodHours: "投票期小时数不在允许范围内",
      httpError: "网络请求失败",
      invalidJson: "响应解析失败",
      apiError: "服务端错误",
      invalidApiResponse: "响应格式不正确",
      missingConfig: "缺少配置：RPC URL 或合约地址",
      invalidRpcUrl: "RPC URL 格式不正确",
      invalidContractAddress: "合约地址格式不正确",
      invalidChain: "链配置不正确",
      invalidRequestBody: "请求参数不正确",
      forbidden: "无权限操作（需要管理员 Token）",
      rpcUnreachable: "RPC 连接失败",
      contractNotFound: "合约地址不存在或不可用",
      syncFailed: "同步失败",
    },
    errorPage: {
      title: "出错了",
      description: "抱歉给您带来不便。处理您的请求时发生了意外错误。",
      digest: "错误摘要",
      retry: "重试",
      home: "返回首页",
    },
  },
  en: {
    tooltips: {
      bond: "Bond is the collateral locked by the asserter. If the information is proven wrong, the bond is slashed.",
      market:
        "Market Question defines what the oracle needs to answer, usually a Yes/No question or a value.",
      liveness:
        "Liveness period is the window for anyone to dispute the assertion. After this, the assertion is treated as truth.",
      reward:
        "If no disputes occur, the asserter gets the bond back. If a dispute occurs and you win, you earn the opponent's bond.",
      protocol:
        "The name of the protocol or project this assertion relates to.",
      assertion:
        "The fact you are stating. Ensure it is objective, verifiable, and has clear timing and sources.",
    },
    app: {
      title: "Insight · UMA Settlement Monitor",
      description:
        "Visual monitoring of UMA Optimistic Oracle disputes and settlements.",
      subtitle: "Oracle Monitor",
    },
    howItWorks: {
      title: "How It Works",
      step1: {
        title: "Assert Truth",
        desc: "Anyone can publish any statement as fact, backed by a bond as collateral.",
      },
      step2: {
        title: "Verify & Dispute",
        desc: "During the liveness period, if the assertion is false, anyone can challenge it by staking an equal bond.",
      },
      step3: {
        title: "Settle & Reward",
        desc: "If unchallenged, the assertion holds. If disputed, UMA verifiers vote, and the winner takes the opponent's bond.",
      },
    },
    nav: {
      oracle: "Oracle",
      disputes: "Disputes",
      alerts: "Alerts",
      audit: "Audit",
      adminTokens: "Tokens",
      myAssertions: "My Assertions",
      myDisputes: "My Disputes",
      watchlist: "Watchlist",
    },
    common: {
      language: "Language",
      loading: "Loading…",
      comingSoon: "Coming Soon",
      loadMore: "Load More",
      retry: "Retry",
      noData: "No Data",
      all: "All",
      pending: "Pending",
      disputed: "Disputed",
      resolved: "Resolved",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      close: "Close",
      viewTx: "View TX",
      copyHash: "Copy hash",
      copied: "Copied",
      viewDetails: "View Details",
      viewOnExplorer: "View on Explorer",
      addToWatchlist: "Add to Watchlist",
      removeFromWatchlist: "Remove from Watchlist",
      allLoaded: "All loaded",
      ok: "OK",
      cancel: "Cancel",
      confirm: "Confirm",
      popular: "Popular",
      example: "Example",
      success: "Success",
    },
    sidebar: {
      userWallet: "User Wallet",
      notConnected: "Not connected",
    },
    wallet: {
      connect: "Connect Wallet",
      connecting: "Connecting...",
      notFound: "Wallet Not Found",
      install: "Please install MetaMask or Rabby!",
      connected: "Wallet Connected",
      connectedMsg: "Connected to",
      failed: "Connection Failed",
      disconnect: "Disconnect",
      copyAddress: "Copy Address",
      balance: "Balance",
      myProfile: "My Profile",
      network: "Network",
      unknownNetwork: "Unknown network",
      networkSwitched: "Network switched",
      networkSwitchFailed: "Failed to switch network",
      switchingNetwork: "Switching…",
      networkAlreadySelected: "Already on this network",
    },
    chain: {
      local: "Local",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
    },
    oracle: {
      title: "Oracle Monitor",
      description:
        "Real-time tracking of UMA Optimistic Oracle assertions and disputes.",
      newAssertion: "New Assertion",
      myActivity: "My Activity",
      myActivityTooltip: "Only show assertions created by me",
      myActivityEmpty: "You haven't created any assertions yet.",
      myDisputesFilter: "My Disputes",
      myDisputesTooltip: "Only show disputes initiated by me",
      myDisputesEmpty: "You haven't initiated any disputes yet.",
      searchPlaceholder: "Search assertions…",
      tabs: {
        overview: "Overview",
        leaderboard: "Leaderboard",
        tools: "Tools",
      },
      sync: {
        synced: "Synced",
        lagging: "Lagging",
        error: "Sync Error",
        status: "Indexer Status",
        block: "Block Height",
        lastUpdate: "Last Update",
      },
      charts: {
        dailyAssertions: "Daily Assertions",
        tvsCumulative: "Total Value Secured (Cumulative)",
        syncHealth: "Sync Health",
        noData: "No chart data",
        activityDesc: "Activity over time",
        tvsDesc: "Cumulative value",
        syncDesc: "Indexer lag and duration over time",
        syncLagBlocks: "Lag (blocks)",
        syncDuration: "Sync duration (ms)",
        waitingData:
          "Waiting for more historical data to generate activity trends.",
      },
      alerts: {
        title: "Alert Rules",
        description: "Configure system monitoring and notification rules.",
        rule: "Rule Name",
        event: "Trigger Event",
        severity: "Severity",
        status: "Status",
        enabled: "Enabled",
        disabled: "Disabled",
        save: "Save Config",
        saving: "Saving...",
        success: "Config saved",
        error: "Failed to save",
        noRules: "No rules found",
        events: {
          dispute_created: "Dispute Created",
          sync_error: "Sync Error",
          stale_sync: "Stale Sync",
        },
        severities: {
          info: "Info",
          warning: "Warning",
          critical: "Critical",
        },
      },
      myAssertions: {
        title: "My Assertions",
        description: "Manage all assertions created by you.",
        connectWalletTitle: "Connect Wallet to View",
        connectWalletDesc:
          "Please connect your wallet to see your assertion history.",
        noAssertions: "You haven't created any assertions yet.",
        createFirst: "Create your first assertion",
      },
      myDisputes: {
        title: "My Disputes",
        description: "Manage all disputes initiated by you.",
        connectWalletTitle: "Connect Wallet to View",
        connectWalletDesc:
          "Please connect your wallet to see your dispute history.",
        noDisputes: "You haven't initiated any disputes yet.",
      },
      timeline: {
        asserted: "Asserted",
        disputed: "Disputed",
        resolved: "Resolved",
        votingEnds: "Voting Ends",
        livenessEnds: "Liveness Ends",
        active: "Active",
      },
      detail: {
        title: "Assertion Details",
        back: "Back",
        goBack: "Go Back",
        asserter: "Asserter",
        bondAmount: "Bond Amount",
        marketQuestion: "Market Question",
        assertedOutcome: "Asserted Outcome",
        settlementResult: "Settlement Result",
        settleAssertion: "Settle Assertion",
        cancel: "Cancel",
        submitting: "Submitting...",
        confirming: "Confirming...",
        errorTitle: "Error Loading Data",
        errorNotFound: "The requested assertion could not be found.",
        disputeAssertion: "Dispute this Assertion",
        voteOnDispute: "Vote on Dispute",
        support: "Support",
        against: "Against",
      },
      tx: {
        sentTitle: "Transaction sent",
        sentMsg: "Your transaction has been submitted.",
        confirmingTitle: "Confirming",
        confirmingMsg: "Transaction submitted. Waiting for confirmation.",
        confirmedTitle: "Confirmed",
        confirmedMsg: "Transaction confirmed on-chain.",
        disputeSubmittedTitle: "Dispute Submitted",
        disputeSubmittedMsg: "Your dispute has been submitted successfully.",
        assertionCreatedTitle: "Assertion Created",
        assertionCreatedMsg: "Transaction submitted. It will appear shortly.",
        voteCastTitle: "Vote Cast",
        voteCastSupportMsg: "You voted to support the assertion.",
        voteCastAgainstMsg: "You voted to oppose the assertion.",
        settlementSubmittedTitle: "Settlement Submitted",
        settlementSubmittedMsg: "The assertion has been settled.",
      },
      createAssertionModal: {
        protocolLabel: "Protocol",
        protocolPlaceholder: "e.g. Aave V3",
        marketLabel: "Market / ID",
        marketPlaceholder: "e.g. ETH-USDC",
        assertionLabel: "Assertion Statement",
        assertionPlaceholder: "What is the truth you are asserting?",
        bondLabel: "Bond Amount (ETH)",
        submit: "Create Assertion",
        bondInvalid: "Bond amount must be greater than 0",
      },
      disputeModal: {
        desc: "Submitting a dispute requires a bond.",
        bondLabel: "Bond (ETH)",
        submit: "Submit Dispute",
        warning:
          "Warning: If the assertion is verified as correct, you will lose your bond.",
      },
      settleModal: {
        readyTitle: "Ready to Settle",
        readyDesc:
          "The voting/liveness period has ended. You can now settle this assertion to resolve the outcome and distribute bonds/rewards.",
      },
      config: {
        title: "Connection & Sync",
        rpcUrl: "RPC URL",
        contractAddress: "Contract Address",
        chain: "Chain",
        startBlock: "Start Block",
        maxBlockRange: "Max Block Range",
        votingPeriodHours: "Voting Period (hours)",
        confirmationBlocks: "Confirmation blocks",
        adminToken: "Admin Token",
        adminActor: "Actor",
        adminActorPlaceholder: "e.g. alice@ops",
        save: "Save",
        syncNow: "Sync Now",
        syncStatus: "Sync",
        syncing: "Syncing…",
        syncDuration: "Duration",
        syncError: "Last Error",
        lastBlock: "Processed Block",
        latestBlock: "Latest Block",
        safeBlock: "Safe Block",
        lagBlocks: "Lag Blocks",
        consecutiveFailures: "Consecutive failures",
        rpcActive: "Active RPC",
        owner: "Contract Owner",
        ownerType: "Owner Type",
        ownerTypeContract: "Contract / Multisig",
        ownerTypeEoa: "Externally Owned Account (EOA)",
        ownerTypeUnknown: "Unknown type",
        indexed: "Indexed",
        demo: "Demo",
        demoHint:
          "You are viewing demo data. Fill in config and click Sync Now to load on-chain data.",
        indexedHint:
          "Connected to on-chain data. Data refreshes automatically.",
      },
      stats: {
        tvs: "Total Value Secured",
        activeDisputes: "Active Disputes",
        resolved24h: "Resolved (24h)",
        avgResolution: "Avg Resolution Time",
        liveCap: "Live oracle market capitalization",
        totalAssertions: "Total Assertions",
        totalDisputes: "Total Disputes",
        totalBonded: "Total Bonded",
        winRate: "Win Rate",
      },
      card: {
        marketQuestion: "Market Question",
        assertion: "Assertion",
        asserter: "Asserter",
        disputer: "Disputer",
        tx: "Transaction",
        bond: "Bond",
        livenessEnds: "Liveness Ends",
        gridView: "Grid view",
        listView: "List view",
      },
      leaderboard: {
        topAsserters: "Top Asserters",
        topAssertersDesc: "Most active contributors",
        topDisputers: "Top Disputers",
        topDisputersDesc: "Most active verifiers",
        bonded: "Bonded",
        noData: "No data available",
        assertions: "Assertions",
        disputes: "Disputes",
      },
      profile: {
        title: "Address Profile",
        assertionsHistory: "Assertions History",
        disputesHistory: "Disputes History",
      },
    },
    pnl: {
      title: "Profit Calculator",
      description: "Estimate your potential returns",
      iWantToDispute: "I want to Dispute",
      iWantToAssert: "I want to Assert",
      bondAmount: "Bond Amount (USD)",
      disclaimer: "*Assuming standard 1:1 bond escalation game logic.",
      profit: "Potential Profit",
      roi: "ROI",
      totalReturn: "Total Return",
    },
    audit: {
      title: "Audit Log",
      description: "Track admin actions and critical changes.",
      adminToken: "Admin token",
      adminTokenPlaceholder: "Bearer …",
      adminTokenHint: "Use the same admin token stored in this session.",
      total: "Total",
      refresh: "Refresh",
      error: "Error",
      empty: "No audit entries yet.",
      actor: "Actor",
    },
    adminTokens: {
      title: "Admin Tokens",
      description: "Create, rotate, and revoke admin tokens.",
      label: "Label",
      role: "Role",
      create: "Create",
      revoke: "Revoke",
      createdAt: "Created",
      revokedAt: "Revoked",
      tokenValue: "New token (shown once)",
    },
    disputes: {
      title: "Dispute Resolution",
      description:
        "Monitor active disputes, track voting progress, and analyze outcomes.",
      umaDvmActive: "UMA DVM Active",
      viewOnUma: "View on UMA",
      reason: "Reason for Dispute",
      disputer: "Disputer",
      disputedAt: "Disputed At",
      votingProgress: "Voting Progress",
      endsAt: "Ends",
      support: "Support Assertion",
      reject: "Reject Assertion",
      totalVotesCast: "Total Votes Cast",
      emptyTitle: "No Active Disputes",
      emptyDesc: "There are currently no active disputes in the system.",
      card: {
        dispute: "Dispute",
        disputer: "Disputer",
        votes: "Votes",
      },
    },
    alerts: {
      title: "Alerts",
      description: "Aggregate alerts, acknowledge and track health.",
      adminToken: "Admin token",
      adminActor: "Actor",
      adminActorPlaceholder: "e.g. alice@ops",
      adminTokenHint: "Stored locally in this session for admin API access",
      adminTokenWarning:
        "Without a token you can only view alerts, not acknowledge/resolve or save rules.",
      rules: "Alert rules",
      refresh: "Refresh",
      acknowledge: "Acknowledge",
      resolve: "Resolve",
      status: "Status",
      severity: "Severity",
      type: "Type",
      searchPlaceholder: "Search title/content/entity…",
      loadRules: "Load Rules",
      saveRules: "Save",
      savingRules: "Saving…",
      lastSeen: "Last",
      occurrences: "Occurrences",
    },
    watchlist: {
      emptyDesc: "You have not added any assertions to your watchlist yet.",
    },
    status: {
      voting: "Voting",
      pendingExecution: "Pending Execution",
      executed: "Executed",
    },
    errors: {
      unknownError: "Unknown error",
      walletNotConnected: "Wallet not connected",
      userRejected: "You rejected the wallet request.",
      requestPending:
        "A wallet request is already pending. Please check your wallet.",
      chainNotAdded:
        "This network is not added in your wallet. Please add it first.",
      wrongNetwork: "Wrong network. Please switch to the target chain.",
      insufficientFunds: "Insufficient funds to pay for gas or value.",
      invalidAddress: "Invalid address",
      invalidMaxBlockRange: "Max block range is out of allowed bounds",
      invalidVotingPeriodHours: "Voting period hours is out of allowed bounds",
      httpError: "Network request failed",
      invalidJson: "Failed to parse response",
      apiError: "Server error",
      invalidApiResponse: "Invalid API response",
      missingConfig: "Missing config: RPC URL or contract address",
      invalidRpcUrl: "Invalid RPC URL",
      invalidContractAddress: "Invalid contract address",
      invalidChain: "Invalid chain",
      invalidRequestBody: "Invalid request body",
      forbidden: "Forbidden (admin token required)",
      rpcUnreachable: "RPC unreachable",
      contractNotFound: "Contract not found",
      syncFailed: "Sync failed",
    },
    errorPage: {
      title: "Something went wrong",
      description:
        "We apologize for the inconvenience. An unexpected error occurred while processing your request.",
      digest: "Error Digest",
      retry: "Retry",
      home: "Go Home",
    },
  },
  es: {
    tooltips: {
      bond: "La fianza es el colateral bloqueado por el afirmante. Si la información es incorrecta, se pierde la fianza.",
      market:
        "La pregunta de mercado define lo que el oráculo debe responder, usualmente Sí/No o un valor.",
      liveness:
        "El periodo de vida es la ventana para disputar. Después, la afirmación se considera verdadera.",
      reward:
        "Si no hay disputas, se recupera la fianza. Si ganas una disputa, ganas la fianza del oponente.",
      protocol:
        "El nombre del protocolo o proyecto al que se refiere esta afirmación.",
      assertion:
        "El hecho que estás afirmando. Asegúrate de que sea objetivo, verificable y tenga tiempos y fuentes claras.",
    },
    app: {
      title: "Insight · Monitor de liquidación UMA",
      description:
        "Monitoreo visual de disputas y liquidaciones de UMA Optimistic Oracle.",
      subtitle: "Monitor de Oráculo",
    },
    howItWorks: {
      title: "Cómo Funciona",
      step1: {
        title: "Afirmar Verdad",
        desc: "Cualquiera puede publicar cualquier declaración como hecho, respaldada por una fianza como garantía.",
      },
      step2: {
        title: "Verificar y Disputar",
        desc: "Durante el período de vigencia, si la afirmación es falsa, cualquiera puede impugnarla apostando una fianza igual.",
      },
      step3: {
        title: "Resolver y Recompensar",
        desc: "Si no se impugna, la afirmación se mantiene. Si se disputa, los verificadores de UMA votan y el ganador se lleva la fianza del oponente.",
      },
    },
    nav: {
      oracle: "Oráculo",
      disputes: "Disputas",
      alerts: "Alertas",
      audit: "Auditoría",
      adminTokens: "Tokens",
      myAssertions: "Mis Aserciones",
      myDisputes: "Mis Disputas",
      watchlist: "Lista de seguimiento",
    },
    common: {
      language: "Idioma",
      loading: "Cargando…",
      comingSoon: "Próximamente",
      loadMore: "Cargar más",
      retry: "Reintentar",
      all: "Todo",
      pending: "Pendiente",
      disputed: "En disputa",
      resolved: "Resuelto",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      close: "Cerrar",
      viewTx: "Ver TX",
      copyHash: "Copiar hash",
      copied: "Copiado",
      viewDetails: "Ver detalles",
      viewOnExplorer: "Ver en el explorador",
      allLoaded: "Todo cargado",
      noData: "Sin datos",
      ok: "OK",
      cancel: "Cancelar",
      confirm: "Confirmar",
      popular: "Popular",
      example: "Ejemplo",
      min: "Mínimo",
      addToWatchlist: "Añadir a lista de seguimiento",
      removeFromWatchlist: "Eliminar de lista de seguimiento",
      success: "Éxito",
    },
    sidebar: {
      userWallet: "Cartera de usuario",
      notConnected: "No conectado",
    },
    wallet: {
      connect: "Conectar cartera",
      connecting: "Conectando...",
      notFound: "Cartera no encontrada",
      install: "¡Por favor, instala una cartera como MetaMask o Rabby!",
      connected: "Cartera conectada",
      connectedMsg: "Conectado a",
      failed: "Conexión fallida",
      disconnect: "Desconectar",
      copyAddress: "Copiar dirección",
      balance: "Saldo",
      myProfile: "Mi perfil",
      network: "Red",
      unknownNetwork: "Red desconocida",
      networkSwitched: "Red cambiada",
      networkSwitchFailed: "No se pudo cambiar la red",
      switchingNetwork: "Cambiando…",
      networkAlreadySelected: "Ya estás en esta red",
    },
    chain: {
      local: "Local",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
    },
    oracle: {
      title: "Monitor de Oráculo",
      description:
        "Seguimiento en tiempo real de afirmaciones y disputas de UMA Optimistic Oracle.",
      newAssertion: "Nueva Afirmación",
      myActivity: "Mi Actividad",
      myActivityTooltip: "Mostrar solo afirmaciones creadas por mí",
      myActivityEmpty: "Aún no has creado ninguna afirmación.",
      myDisputesFilter: "Mis Disputas",
      myDisputesTooltip: "Mostrar solo disputas iniciadas por mí",
      myDisputesEmpty: "Aún no has iniciado ninguna disputa.",
      searchPlaceholder: "Buscar afirmaciones…",
      tabs: {
        overview: "Resumen",
        leaderboard: "Clasificación",
        tools: "Herramientas",
      },
      charts: {
        dailyAssertions: "Afirmaciones diarias",
        tvsCumulative: "Valor total asegurado (acumulado)",
        syncHealth: "Salud de sincronización",
        noData: "Sin datos de gráficos",
        activityDesc: "Actividad a lo largo del tiempo",
        tvsDesc: "Valor acumulado",
        syncDesc: "Retraso y duración del indexador a lo largo del tiempo",
        syncLagBlocks: "Retraso (bloques)",
        syncDuration: "Duración de sync (ms)",
        waitingData:
          "Esperando más datos históricos para generar tendencias de actividad.",
      },
      myAssertions: {
        title: "Mis Afirmaciones",
        description: "Gestiona todas las afirmaciones creadas por ti.",
        connectWalletTitle: "Conectar cartera para ver",
        connectWalletDesc:
          "Por favor, conecta tu cartera para ver tu historial de afirmaciones.",
        noAssertions: "Aún no has creado ninguna afirmación.",
        createFirst: "Crea tu primera afirmación",
      },
      myDisputes: {
        title: "Mis Disputas",
        description: "Gestiona todas las disputas iniciadas por ti.",
        connectWalletTitle: "Conectar cartera para ver",
        connectWalletDesc:
          "Por favor, conecta tu cartera para ver tu historial de disputas.",
        noDisputes: "Aún no has iniciado ninguna disputa.",
      },
      leaderboard: {
        topAsserters: "Mejores Afirmadores",
        topAssertersDesc: "Contribuyentes más activos",
        topDisputers: "Mejores Disputantes",
        topDisputersDesc: "Verificadores más activos",
        bonded: "En fianza",
        noData: "Sin datos disponibles",
        assertions: "Afirmaciones",
        disputes: "Disputas",
      },
      profile: {
        title: "Perfil de Dirección",
        assertionsHistory: "Historial de Afirmaciones",
        disputesHistory: "Historial de Disputas",
      },
      sync: {
        synced: "Sincronizado",
        lagging: "Retrasado",
        error: "Error de Sync",
        status: "Estado del Indexador",
        block: "Altura de Bloque",
        lastUpdate: "Última Actualización",
      },
      timeline: {
        asserted: "Afirmado",
        disputed: "Disputado",
        resolved: "Resuelto",
        votingEnds: "Fin de votación",
        livenessEnds: "Fin de vigencia",
        active: "Activo",
      },
      detail: {
        title: "Detalle de Afirmación",
        back: "Volver a la vista general",
        errorTitle: "Afirmación no encontrada",
        errorNotFound: "La afirmación que busca no existe o ha sido eliminada.",
        goBack: "Volver",
        walletNotFound: "Billetera no encontrada",
        installWallet: "Instale MetaMask u otra billetera Web3.",
        validationError: "Error de validación",
        reasonRequired: "Por favor, proporcione un motivo para la disputa.",
        submitting: "Enviando…",
        confirming: "Confirmando…",
        txSent: "Transacción enviada",
        hash: "Hash",
        txFailed: "Transacción fallida",
        marketQuestion: "Pregunta del mercado",
        assertedOutcome: "Resultado afirmado",
        asserter: "Afirmador",
        transaction: "Transacción",
        disputeAssertion: "Disputar esta afirmación",
        reasonForDispute: "Motivo de la disputa",
        reasonPlaceholder: "Explique por qué esta afirmación es incorrecta...",
        cancel: "Cancelar",
        confirmDispute: "Confirmar disputa",
        disputeRequiresBond: "Disputar requiere un depósito de",
        disputeActive: "Disputa activa",
        reason: "Motivo",
        support: "A favor",
        against: "En contra",
        votes: "votos",
        voteOnDispute: "Votar en la disputa",
        bondAmount: "Monto del depósito",
        timeline: "Cronología",
        actions: "Acciones",
        resolved: "Resuelto",
        resolvedDesc: "Esta afirmación ha sido resuelta con éxito.",
        settleAssertion: "Liquidar afirmación",
        settleDesc:
          "Esta afirmación ha pasado el período de desafío y puede ser liquidada.",
        settlementResult: "Resultado de liquidación",
        settlementTrue: "Válido / Verdadero",
        settlementFalse: "Inválido / Falso",
      },
      tx: {
        sentTitle: "Transacción enviada",
        sentMsg: "Tu transacción ha sido enviada.",
        confirmingTitle: "Confirmando",
        confirmingMsg: "Transacción enviada. Esperando confirmación.",
        confirmedTitle: "Confirmada",
        confirmedMsg: "Transacción confirmada en la cadena.",
        disputeSubmittedTitle: "Disputa enviada",
        disputeSubmittedMsg: "Tu disputa se ha enviado correctamente.",
        assertionCreatedTitle: "Afirmación creada",
        assertionCreatedMsg: "Transacción enviada. Aparecerá en breve.",
        voteCastTitle: "Voto emitido",
        voteCastSupportMsg: "Has votado a favor de la afirmación.",
        voteCastAgainstMsg: "Has votado en contra de la afirmación.",
        settlementSubmittedTitle: "Liquidación enviada",
        settlementSubmittedMsg: "La afirmación ha sido liquidada.",
      },
      createAssertionModal: {
        protocolLabel: "Protocolo",
        protocolPlaceholder: "p. ej. Aave V3",
        marketLabel: "Mercado / ID",
        marketPlaceholder: "p. ej. ETH-USDC",
        assertionLabel: "Declaración de afirmación",
        assertionPlaceholder: "¿Cuál es la verdad que afirmas?",
        bondLabel: "Depósito (ETH)",
        submit: "Crear afirmación",
        bondInvalid: "El depósito debe ser mayor que 0",
      },
      disputeModal: {
        desc: "Enviar una disputa requiere un depósito.",
        bondLabel: "Depósito (ETH)",
        submit: "Enviar disputa",
        warning:
          "Advertencia: Si la afirmación se verifica como correcta, perderá su fianza.",
      },
      settleModal: {
        readyTitle: "Listo para liquidar",
        readyDesc:
          "El período de votación/vigencia ha terminado. Ahora puedes liquidar esta afirmación para resolver el resultado y distribuir depósitos/recompensas.",
      },
      config: {
        title: "Conexión y sincronización",
        rpcUrl: "RPC URL",
        contractAddress: "Dirección del contrato",
        chain: "Cadena",
        startBlock: "Bloque inicial",
        maxBlockRange: "Rango máximo de bloques",
        votingPeriodHours: "Período de votación (horas)",
        confirmationBlocks: "Bloques de confirmación",
        adminToken: "Token de administrador",
        adminActor: "Actor",
        adminActorPlaceholder: "p.ej. alice@ops",
        save: "Guardar",
        syncNow: "Sincronizar",
        syncStatus: "Sincronización",
        syncing: "Sincronizando…",
        syncDuration: "Duración",
        syncError: "Último error",
        lastBlock: "Bloque procesado",
        latestBlock: "Último bloque",
        safeBlock: "Bloque seguro",
        lagBlocks: "Bloques de retraso",
        consecutiveFailures: "Fallos consecutivos",
        rpcActive: "RPC activo",
        owner: "Owner del contrato",
        ownerType: "Tipo de owner",
        ownerTypeContract: "Contrato / Multisig",
        ownerTypeEoa: "Cuenta externa (EOA)",
        ownerTypeUnknown: "Tipo desconocido",
        indexed: "Indexado",
        demo: "Demo",
        demoHint:
          "Estás viendo datos de demostración. Completa la configuración y pulsa Sincronizar.",
        indexedHint:
          "Conectado a datos on-chain. Los datos se actualizan automáticamente.",
      },
      stats: {
        tvs: "Valor total asegurado",
        activeDisputes: "Disputas activas",
        resolved24h: "Resueltas (24h)",
        avgResolution: "Tiempo medio de resolución",
        liveCap: "Capitalización de mercado de oráculo en vivo",
        totalAssertions: "Afirmaciones totales",
        totalDisputes: "Disputas totales",
        totalBonded: "Total en fianza",
        winRate: "Tasa de aciertos",
      },
      card: {
        marketQuestion: "Pregunta del mercado",
        assertion: "Afirmación",
        asserter: "Afirmador",
        disputer: "Disputante",
        tx: "Transacción",
        bond: "Depósito",
        livenessEnds: "Fin de vigencia",
        gridView: "Vista de cuadrícula",
        listView: "Vista de lista",
      },
      alerts: {
        title: "Reglas de Alertas",
        description: "Configurar reglas de monitoreo y notificación.",
        rule: "Nombre de regla",
        event: "Evento activador",
        severity: "Severidad",
        status: "Estado",
        enabled: "Habilitado",
        disabled: "Deshabilitado",
        save: "Guardar configuración",
        saving: "Guardando...",
        success: "Configuración guardada",
        error: "Error al guardar",
        noRules: "No hay reglas",
        events: {
          dispute_created: "Disputa creada",
          sync_error: "Error de sincronización",
          stale_sync: "Sincronización estancada",
        },
        severities: {
          info: "Info",
          warning: "Advertencia",
          critical: "Crítico",
        },
      },
    },
    pnl: {
      title: "Calculadora de Ganancias",
      description: "Estime sus retornos potenciales",
      iWantToDispute: "Quiero Disputar",
      iWantToAssert: "Quiero Afirmar",
      bondAmount: "Monto del Depósito (USD)",
      disclaimer: "*Asumiendo lógica estándar de escalada de bonos 1:1.",
      profit: "Beneficio Potencial",
      roi: "ROI",
      totalReturn: "Retorno Total",
    },
    audit: {
      title: "Registro de Auditoría",
      description: "Rastrea acciones de admin y cambios críticos.",
      adminToken: "Token de admin",
      adminTokenPlaceholder: "Bearer …",
      adminTokenHint: "Usa el mismo token de admin guardado en esta sesión.",
      total: "Total",
      refresh: "Actualizar",
      error: "Error",
      empty: "Aún no hay registros de auditoría.",
      actor: "Actor",
    },
    adminTokens: {
      title: "Tokens",
      description: "Crea, rota y revoca tokens de administrador.",
      label: "Etiqueta",
      role: "Rol",
      create: "Crear",
      revoke: "Revocar",
      createdAt: "Creado",
      revokedAt: "Revocado",
      tokenValue: "Nuevo token (se muestra una vez)",
    },
    disputes: {
      title: "Disputas",
      description:
        "Monitorea disputas activas, progreso de votación y resultados.",
      umaDvmActive: "UMA DVM Activo",
      viewOnUma: "Ver en UMA",
      reason: "Motivo de la disputa",
      disputer: "Disputante",
      disputedAt: "Disputado en",
      votingProgress: "Progreso de votación",
      endsAt: "Termina",
      support: "Apoyar",
      reject: "Rechazar",
      totalVotesCast: "Total de votos",
      emptyTitle: "Sin disputas activas",
      emptyDesc: "No hay disputas activas en el sistema.",
      card: {
        dispute: "Disputa",
        disputer: "Disputante",
        votes: "Votos",
      },
    },
    alerts: {
      title: "Alertas",
      description: "Agrupa alertas, confirma y sigue la salud.",
      adminToken: "Token de admin",
      adminActor: "Actor",
      adminActorPlaceholder: "p.ej. alice@ops",
      adminTokenHint:
        "Se guarda localmente en esta sesión para las APIs de administrador",
      adminTokenWarning:
        "Sin token solo puedes ver alertas; no podrás confirmar/resolver ni guardar reglas.",
      rules: "Reglas de alertas",
      refresh: "Actualizar",
      acknowledge: "Confirmar",
      resolve: "Resolver",
      status: "Estado",
      severity: "Severidad",
      type: "Tipo",
      searchPlaceholder: "Buscar título/contenido/entidad…",
      loadRules: "Cargar reglas",
      saveRules: "Guardar",
      savingRules: "Guardando…",
      lastSeen: "Última vez",
      occurrences: "Ocurrencias",
    },
    watchlist: {
      emptyDesc: "Aún no has añadido afirmaciones a tu lista de seguimiento.",
    },
    status: {
      voting: "Votación",
      pendingExecution: "Ejecución pendiente",
      executed: "Ejecutado",
    },
    errors: {
      unknownError: "Error desconocido",
      walletNotConnected: "Cartera no conectada",
      userRejected: "Has rechazado la solicitud de la cartera.",
      requestPending:
        "Ya hay una solicitud pendiente en la cartera. Revisa tu cartera.",
      chainNotAdded: "Esta red no está añadida en tu cartera. Añádela primero.",
      wrongNetwork: "Red incorrecta. Cambia a la cadena objetivo.",
      insufficientFunds: "Fondos insuficientes para pagar gas o el valor.",
      invalidAddress: "Dirección inválida",
      invalidMaxBlockRange:
        "El rango máximo de bloques está fuera de los límites permitidos",
      invalidVotingPeriodHours:
        "Las horas del período de votación están fuera de los límites permitidos",
      httpError: "Falló la solicitud de red",
      invalidJson: "No se pudo analizar la respuesta",
      apiError: "Error del servidor",
      invalidApiResponse: "Respuesta de API inválida",
      missingConfig: "Falta configuración: RPC URL o dirección del contrato",
      invalidRpcUrl: "RPC URL inválida",
      invalidContractAddress: "Dirección de contrato inválida",
      invalidChain: "Cadena inválida",
      invalidRequestBody: "Cuerpo de solicitud inválido",
      forbidden: "Prohibido (se requiere token de administrador)",
      rpcUnreachable: "RPC inaccesible",
      contractNotFound: "Contrato no encontrado",
      syncFailed: "Error de sincronización",
    },
    errorPage: {
      title: "Algo salió mal",
      description:
        "Nos disculpamos por las molestias. Ha ocurrido un error inesperado al procesar su solicitud.",
      digest: "Resumen del error",
      retry: "Reintentar",
      home: "Ir a Inicio",
    },
  },
} as const;

export type TranslationKey =
  | "tooltips.bond"
  | "tooltips.market"
  | "tooltips.liveness"
  | "tooltips.reward"
  | "tooltips.protocol"
  | "tooltips.assertion"
  | "app.title"
  | "app.description"
  | "app.subtitle"
  | "howItWorks.title"
  | "howItWorks.step1.title"
  | "howItWorks.step1.desc"
  | "howItWorks.step2.title"
  | "howItWorks.step2.desc"
  | "howItWorks.step3.title"
  | "howItWorks.step3.desc"
  | "nav.oracle"
  | "nav.disputes"
  | "nav.alerts"
  | "nav.adminTokens"
  | "nav.myAssertions"
  | "nav.myDisputes"
  | "nav.audit"
  | "nav.watchlist"
  | "common.language"
  | "common.loading"
  | "common.comingSoon"
  | "common.loadMore"
  | "common.retry"
  | "common.noData"
  | "common.all"
  | "common.pending"
  | "common.disputed"
  | "common.resolved"
  | "common.openMenu"
  | "common.closeMenu"
  | "common.close"
  | "common.viewTx"
  | "common.copyHash"
  | "common.copied"
  | "common.viewDetails"
  | "common.viewOnExplorer"
  | "common.allLoaded"
  | "common.popular"
  | "common.example"
  | "common.min"
  | "common.addToWatchlist"
  | "common.removeFromWatchlist"
  | "common.success"
  | "sidebar.userWallet"
  | "sidebar.notConnected"
  | "wallet.connect"
  | "wallet.connecting"
  | "wallet.notFound"
  | "wallet.install"
  | "wallet.connected"
  | "wallet.connectedMsg"
  | "wallet.failed"
  | "wallet.disconnect"
  | "wallet.copyAddress"
  | "wallet.balance"
  | "wallet.myProfile"
  | "wallet.network"
  | "wallet.unknownNetwork"
  | "wallet.networkSwitched"
  | "wallet.networkSwitchFailed"
  | "wallet.switchingNetwork"
  | "wallet.networkAlreadySelected"
  | "chain.local"
  | "chain.polygon"
  | "chain.arbitrum"
  | "chain.optimism"
  | "oracle.title"
  | "oracle.description"
  | "oracle.newAssertion"
  | "oracle.myActivity"
  | "oracle.myActivityTooltip"
  | "oracle.myActivityEmpty"
  | "oracle.myDisputesFilter"
  | "oracle.myDisputesTooltip"
  | "oracle.myDisputesEmpty"
  | "oracle.searchPlaceholder"
  | "oracle.tabs.overview"
  | "oracle.tabs.leaderboard"
  | "oracle.tabs.tools"
  | "oracle.leaderboard.topAsserters"
  | "oracle.leaderboard.topAssertersDesc"
  | "oracle.leaderboard.topDisputers"
  | "oracle.leaderboard.topDisputersDesc"
  | "oracle.leaderboard.bonded"
  | "oracle.leaderboard.noData"
  | "oracle.leaderboard.assertions"
  | "oracle.leaderboard.disputes"
  | "oracle.profile.title"
  | "oracle.profile.assertionsHistory"
  | "oracle.profile.disputesHistory"
  | "oracle.charts.dailyAssertions"
  | "oracle.charts.tvsCumulative"
  | "oracle.charts.syncHealth"
  | "oracle.charts.topMarkets"
  | "oracle.charts.noData"
  | "oracle.charts.activityDesc"
  | "oracle.charts.tvsDesc"
  | "oracle.charts.syncDesc"
  | "oracle.charts.syncLagBlocks"
  | "oracle.charts.syncDuration"
  | "oracle.charts.waitingData"
  | "myAssertions.title"
  | "myAssertions.description"
  | "myAssertions.connectWalletTitle"
  | "myAssertions.connectWalletDesc"
  | "myAssertions.noAssertions"
  | "myAssertions.createFirst"
  | "myDisputes.title"
  | "myDisputes.description"
  | "myDisputes.connectWalletTitle"
  | "myDisputes.connectWalletDesc"
  | "oracle.charts.waitingData"
  | "oracle.myAssertions.title"
  | "oracle.myAssertions.description"
  | "oracle.myAssertions.connectWalletTitle"
  | "oracle.myAssertions.connectWalletDesc"
  | "oracle.myAssertions.noAssertions"
  | "oracle.myAssertions.createFirst"
  | "oracle.myDisputes.title"
  | "oracle.myDisputes.description"
  | "oracle.myDisputes.connectWalletTitle"
  | "oracle.myDisputes.connectWalletDesc"
  | "oracle.myDisputes.noDisputes"
  | "oracle.sync.synced"
  | "oracle.sync.lagging"
  | "oracle.sync.error"
  | "oracle.sync.status"
  | "oracle.sync.block"
  | "oracle.sync.lastUpdate"
  | "oracle.timeline.asserted"
  | "oracle.timeline.disputed"
  | "oracle.timeline.resolved"
  | "oracle.timeline.votingEnds"
  | "oracle.timeline.livenessEnds"
  | "oracle.timeline.active"
  | "oracle.detail.back"
  | "oracle.detail.title"
  | "oracle.detail.marketQuestion"
  | "oracle.detail.assertedOutcome"
  | "oracle.detail.asserter"
  | "oracle.detail.transaction"
  | "oracle.detail.bondAmount"
  | "oracle.detail.confirming"
  | "oracle.detail.disputeAssertion"
  | "oracle.detail.disputeRequiresBond"
  | "oracle.detail.disputeActive"
  | "oracle.detail.reason"
  | "oracle.detail.support"
  | "oracle.detail.against"
  | "oracle.detail.voteOnDispute"
  | "oracle.detail.errorTitle"
  | "oracle.detail.errorNotFound"
  | "oracle.detail.goBack"
  | "oracle.detail.walletNotFound"
  | "oracle.detail.installWallet"
  | "oracle.detail.txSent"
  | "oracle.detail.txFailed"
  | "oracle.detail.hash"
  | "oracle.detail.votes"
  | "oracle.detail.reasonForDispute"
  | "oracle.detail.reasonPlaceholder"
  | "oracle.detail.validationError"
  | "oracle.detail.reasonRequired"
  | "oracle.detail.submitting"
  | "oracle.detail.cancel"
  | "oracle.detail.confirmDispute"
  | "oracle.detail.timeline"
  | "oracle.detail.actions"
  | "oracle.detail.resolved"
  | "oracle.detail.resolvedDesc"
  | "oracle.detail.settleAssertion"
  | "oracle.detail.settleDesc"
  | "oracle.detail.settlementResult"
  | "oracle.detail.settlementTrue"
  | "oracle.detail.settlementFalse"
  | "oracle.tx.disputeSubmittedTitle"
  | "oracle.tx.disputeSubmittedMsg"
  | "oracle.tx.assertionCreatedTitle"
  | "oracle.tx.assertionCreatedMsg"
  | "oracle.tx.voteCastTitle"
  | "oracle.tx.voteCastSupportMsg"
  | "oracle.tx.voteCastAgainstMsg"
  | "oracle.tx.settlementSubmittedTitle"
  | "oracle.tx.settlementSubmittedMsg"
  | "oracle.tx.sentTitle"
  | "oracle.tx.sentMsg"
  | "oracle.tx.confirmingTitle"
  | "oracle.tx.confirmingMsg"
  | "oracle.tx.confirmedTitle"
  | "oracle.tx.confirmedMsg"
  | "oracle.createAssertionModal.protocolLabel"
  | "oracle.createAssertionModal.protocolPlaceholder"
  | "oracle.createAssertionModal.marketLabel"
  | "oracle.createAssertionModal.marketPlaceholder"
  | "oracle.createAssertionModal.assertionLabel"
  | "oracle.createAssertionModal.assertionPlaceholder"
  | "oracle.createAssertionModal.bondLabel"
  | "oracle.createAssertionModal.submit"
  | "oracle.createAssertionModal.bondInvalid"
  | "oracle.disputeModal.desc"
  | "oracle.disputeModal.bondLabel"
  | "oracle.disputeModal.submit"
  | "oracle.disputeModal.warning"
  | "oracle.settleModal.readyTitle"
  | "oracle.settleModal.readyDesc"
  | "oracle.config.title"
  | "oracle.config.rpcUrl"
  | "oracle.config.contractAddress"
  | "oracle.config.chain"
  | "oracle.config.startBlock"
  | "oracle.config.maxBlockRange"
  | "oracle.config.votingPeriodHours"
  | "oracle.config.confirmationBlocks"
  | "oracle.config.adminToken"
  | "oracle.config.adminActor"
  | "oracle.config.adminActorPlaceholder"
  | "oracle.config.save"
  | "oracle.config.syncNow"
  | "oracle.config.syncStatus"
  | "oracle.config.syncing"
  | "oracle.config.syncDuration"
  | "oracle.config.syncError"
  | "oracle.config.lastBlock"
  | "oracle.config.latestBlock"
  | "oracle.config.safeBlock"
  | "oracle.config.lagBlocks"
  | "oracle.config.consecutiveFailures"
  | "oracle.config.rpcActive"
  | "oracle.config.owner"
  | "oracle.config.ownerType"
  | "oracle.config.ownerTypeContract"
  | "oracle.config.ownerTypeEoa"
  | "oracle.config.ownerTypeUnknown"
  | "oracle.config.indexed"
  | "oracle.config.demo"
  | "oracle.config.demoHint"
  | "oracle.config.indexedHint"
  | "oracle.stats.tvs"
  | "oracle.stats.activeDisputes"
  | "oracle.stats.resolved24h"
  | "oracle.stats.avgResolution"
  | "oracle.stats.liveCap"
  | "oracle.stats.totalAssertions"
  | "oracle.stats.totalDisputes"
  | "oracle.stats.totalBonded"
  | "oracle.stats.winRate"
  | "oracle.card.marketQuestion"
  | "oracle.card.assertion"
  | "oracle.card.asserter"
  | "oracle.card.disputer"
  | "oracle.card.tx"
  | "oracle.card.bond"
  | "oracle.card.livenessEnds"
  | "oracle.card.gridView"
  | "oracle.card.listView"
  | "pnl.title"
  | "pnl.description"
  | "pnl.iWantToDispute"
  | "pnl.iWantToAssert"
  | "pnl.bondAmount"
  | "pnl.disclaimer"
  | "pnl.profit"
  | "pnl.roi"
  | "pnl.totalReturn"
  | "audit.title"
  | "audit.description"
  | "audit.adminToken"
  | "audit.adminTokenPlaceholder"
  | "audit.adminTokenHint"
  | "audit.total"
  | "audit.refresh"
  | "audit.error"
  | "audit.empty"
  | "audit.actor"
  | "adminTokens.title"
  | "adminTokens.description"
  | "adminTokens.label"
  | "adminTokens.role"
  | "adminTokens.create"
  | "adminTokens.revoke"
  | "adminTokens.createdAt"
  | "adminTokens.revokedAt"
  | "adminTokens.tokenValue"
  | "disputes.title"
  | "disputes.description"
  | "disputes.umaDvmActive"
  | "disputes.viewOnUma"
  | "disputes.reason"
  | "disputes.disputer"
  | "disputes.disputedAt"
  | "disputes.votingProgress"
  | "disputes.endsAt"
  | "disputes.support"
  | "disputes.reject"
  | "disputes.totalVotesCast"
  | "disputes.emptyTitle"
  | "disputes.emptyDesc"
  | "disputes.card.dispute"
  | "disputes.card.disputer"
  | "disputes.card.votes"
  | "alerts.title"
  | "alerts.description"
  | "alerts.adminToken"
  | "alerts.adminActor"
  | "alerts.adminActorPlaceholder"
  | "alerts.rules"
  | "alerts.refresh"
  | "alerts.acknowledge"
  | "alerts.resolve"
  | "alerts.status"
  | "alerts.severity"
  | "alerts.type"
  | "alerts.searchPlaceholder"
  | "alerts.loadRules"
  | "alerts.saveRules"
  | "alerts.savingRules"
  | "alerts.lastSeen"
  | "alerts.occurrences"
  | "alerts.adminTokenHint"
  | "alerts.adminTokenWarning"
  | "watchlist.emptyDesc"
  | "status.voting"
  | "status.pendingExecution"
  | "status.executed"
  | "errors.unknownError"
  | "errors.walletNotConnected"
  | "errors.userRejected"
  | "errors.requestPending"
  | "errors.chainNotAdded"
  | "errors.wrongNetwork"
  | "errors.insufficientFunds"
  | "errors.invalidAddress"
  | "errors.invalidMaxBlockRange"
  | "errors.invalidVotingPeriodHours"
  | "errors.httpError"
  | "errors.invalidJson"
  | "errors.apiError"
  | "errors.invalidApiResponse"
  | "errors.missingConfig"
  | "errors.invalidRpcUrl"
  | "errors.invalidContractAddress"
  | "errors.invalidChain"
  | "errors.invalidRequestBody"
  | "errors.forbidden"
  | "errors.rpcUnreachable"
  | "errors.contractNotFound"
  | "errors.syncFailed"
  | "oracle.alerts.title"
  | "oracle.alerts.description"
  | "oracle.alerts.rule"
  | "oracle.alerts.event"
  | "oracle.alerts.severity"
  | "oracle.alerts.status"
  | "oracle.alerts.enabled"
  | "oracle.alerts.disabled"
  | "oracle.alerts.save"
  | "oracle.alerts.saving"
  | "oracle.alerts.success"
  | "oracle.alerts.error"
  | "oracle.alerts.noRules"
  | "oracle.alerts.events.dispute_created"
  | "oracle.alerts.events.sync_error"
  | "oracle.alerts.events.stale_sync"
  | "oracle.alerts.severities.info"
  | "oracle.alerts.severities.warning"
  | "oracle.alerts.severities.critical";

export function getUiErrorMessage(
  errorCode: string,
  t: (key: TranslationKey) => string
) {
  if (errorCode === "unknown_error") return t("errors.unknownError");
  if (errorCode.startsWith("http_"))
    return `${t("errors.httpError")} (${errorCode.slice(5)})`;
  if (errorCode === "invalid_json") return t("errors.invalidJson");
  if (errorCode === "invalid_json_response") return t("errors.invalidJson");
  if (errorCode === "api_error") return t("errors.apiError");
  if (errorCode === "invalid_api_response")
    return t("errors.invalidApiResponse");
  if (errorCode === "api_unknown_error") return t("errors.unknownError");
  if (errorCode === "missing_config") return t("errors.missingConfig");
  if (errorCode === "invalid_rpc_url") return t("errors.invalidRpcUrl");
  if (errorCode === "invalid_contract_address")
    return t("errors.invalidContractAddress");
  if (errorCode === "invalid_chain") return t("errors.invalidChain");
  if (errorCode === "invalid_request_body")
    return t("errors.invalidRequestBody");
  if (errorCode === "invalid_address") return t("errors.invalidAddress");
  if (errorCode === "invalid_max_block_range")
    return t("errors.invalidMaxBlockRange");
  if (errorCode === "invalid_voting_period_hours")
    return t("errors.invalidVotingPeriodHours");
  if (errorCode === "forbidden") return t("errors.forbidden");
  if (errorCode === "rpc_unreachable") return t("errors.rpcUnreachable");
  if (errorCode === "contract_not_found") return t("errors.contractNotFound");
  if (errorCode === "sync_failed") return t("errors.syncFailed");
  if (errorCode === "wallet_not_connected")
    return t("errors.walletNotConnected");
  if (errorCode === "user_rejected") return t("errors.userRejected");
  if (errorCode === "request_pending") return t("errors.requestPending");
  if (errorCode === "chain_not_added") return t("errors.chainNotAdded");
  if (errorCode === "wrong_network") return t("errors.wrongNetwork");
  if (errorCode === "insufficient_funds") return t("errors.insufficientFunds");
  return errorCode;
}
