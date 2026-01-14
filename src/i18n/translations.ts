export type Lang = "zh" | "en" | "es" | "fr" | "ko";

export const languages: Array<{ code: Lang; label: string }> = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ko", label: "한국어" },
];

export const LANG_STORAGE_KEY = "insight_lang";

export function isLang(value: unknown): value is Lang {
  return (
    value === "zh" ||
    value === "en" ||
    value === "es" ||
    value === "fr" ||
    value === "ko"
  );
}

export function detectLangFromAcceptLanguage(
  value: string | null | undefined
): Lang {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("zh")) return "zh";
  if (lower.includes("fr")) return "fr";
  if (lower.includes("ko")) return "ko";
  if (lower.includes("es")) return "es";
  return "en";
}

export const langToHtmlLang: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en",
  es: "es",
  fr: "fr",
  ko: "ko",
};

export const langToLocale: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  ko: "ko-KR",
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
        selectOutcome: "选择结算结果",
        outcomeTrue: "有效/真实",
        outcomeTrueDesc: "确认该断言为真实有效的陈述",
        outcomeFalse: "无效/虚假",
        outcomeFalseDesc: "确认该断言为虚假无效的陈述",
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
    onboarding: {
      title: "Insight 快速导览",
      welcome: "欢迎使用 Insight",
      welcomeDesc:
        "Insight 是您进入预言机监控和争议解决的门户。让我们快速浏览一下，帮助您开始使用。",
      selectRole: "请选择您的角色，获取个性化导览：",
      skipTour: "跳过导览",
      continueAsGeneral: "以普通用户身份继续",
      getStarted: "开始使用",
      next: "下一步",
      roles: {
        developer: {
          title: "面向开发者",
          description: "使用我们的预言机数据 API 自信地构建应用",
        },
        protocol_team: {
          title: "面向协议团队",
          description: "确保您的 DeFi 协议获得可靠的预言机数据",
        },
        oracle_operator: {
          title: "面向预言机操作者",
          description: "管理您的预言机节点和性能",
        },
        general_user: {
          title: "面向普通用户",
          description: "探索预言机数据并参与生态系统",
        },
      },
      steps: {
        developer: {
          api: {
            title: "API 访问",
            description: "探索我们的 REST API，以编程方式访问预言机数据。",
          },
          integration: {
            title: "轻松集成",
            description: "使用简单的 SDK 将预言机数据集成到您的 dApps 中。",
          },
          monitoring: {
            title: "监控您的集成",
            description: "跟踪预言机数据在您应用中的性能。",
          },
        },
        protocol_team: {
          monitoring: {
            title: "实时监控",
            description: "监控您协议的预言机数据趋势和同步状态。",
          },
          disputes: {
            title: "争议解决",
            description: "参与争议并确保公平结果。",
          },
          analytics: {
            title: "性能分析",
            description: "分析不同市场的预言机性能。",
          },
        },
        oracle_operator: {
          nodeMonitoring: {
            title: "节点监控",
            description: "监控您的预言机节点的性能和状态。",
          },
          syncStatus: {
            title: "同步状态",
            description: "跟踪跨链的同步状态和延迟。",
          },
          alerts: {
            title: "告警管理",
            description: "为重要事件和异常配置告警。",
          },
        },
        general_user: {
          exploration: {
            title: "数据探索",
            description: "浏览不同市场和协议的预言机数据。",
          },
          assertions: {
            title: "创建断言",
            description: "创建和跟踪预言机数据的断言。",
          },
          disputes: {
            title: "参与争议",
            description: "对争议进行投票并影响结果。",
          },
        },
      },
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
        selectOutcome: "Select Settlement Outcome",
        outcomeTrue: "Valid/True",
        outcomeTrueDesc: "Confirm the assertion is valid and true",
        outcomeFalse: "Invalid/False",
        outcomeFalseDesc: "Confirm the assertion is invalid and false",
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
    onboarding: {
      title: "Insight: Recorrido Rápido",
      welcome: "Bienvenido a Insight",
      welcomeDesc:
        "Insight es tu puerta de acceso al monitoreo de oráculos y resolución de disputas. Tomemos un recorrido rápido para comenzar.",
      selectRole: "Selecciona tu rol para obtener un recorrido personalizado:",
      skipTour: "Saltar recorrido",
      continueAsGeneral: "Continuar como usuario general",
      getStarted: "Empezar",
      next: "Siguiente",
      roles: {
        developer: {
          title: "Para desarrolladores",
          description:
            "Construye con confianza usando nuestra API de datos de oráculo",
        },
        protocol_team: {
          title: "Para equipos de protocolo",
          description:
            "Asegura la fiabilidad de los datos del oráculo para tus protocolos DeFi",
        },
        oracle_operator: {
          title: "Para operadores de oráculos",
          description: "Gestiona tus nodos de oráculo y su rendimiento",
        },
        general_user: {
          title: "Para usuarios generales",
          description:
            "Explora los datos del oráculo y participa en el ecosistema",
        },
      },
      steps: {
        developer: {
          api: {
            title: "Acceso a API",
            description:
              "Explora nuestra API REST para acceder a datos de oráculo de forma programática.",
          },
          integration: {
            title: "Integración sencilla",
            description:
              "Integra datos de oráculo en tus dApps con SDKs simples.",
          },
          monitoring: {
            title: "Monitorea tus integraciones",
            description:
              "Rastrea el rendimiento de los datos del oráculo en tus aplicaciones.",
          },
        },
        protocol_team: {
          monitoring: {
            title: "Monitoreo en tiempo real",
            description:
              "Monitorea las tendencias de datos del oráculo y el estado de sincronización para tus protocolos.",
          },
          disputes: {
            title: "Resolución de disputas",
            description: "Participa en disputas y asegura resultados justos.",
          },
          analytics: {
            title: "Análisis de rendimiento",
            description:
              "Analiza el rendimiento del oráculo en diferentes mercados.",
          },
        },
        oracle_operator: {
          nodeMonitoring: {
            title: "Monitoreo de nodos",
            description:
              "Monitorea el rendimiento y estado de tus nodos de oráculo.",
          },
          syncStatus: {
            title: "Estado de sincronización",
            description:
              "Rastrea el estado de sincronización y latencia entre cadenas.",
          },
          alerts: {
            title: "Gestión de alertas",
            description:
              "Configura alertas para eventos importantes y anomalías.",
          },
        },
        general_user: {
          exploration: {
            title: "Exploración de datos",
            description:
              "Navega por los datos del oráculo en diferentes mercados y protocolos.",
          },
          assertions: {
            title: "Creación de afirmaciones",
            description: "Crea y rastrea afirmaciones sobre datos de oráculo.",
          },
          disputes: {
            title: "Participación en disputas",
            description: "Vota en disputas y forma el resultado.",
          },
        },
      },
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
        selectOutcome: "Seleccionar resultado de liquidación",
        outcomeTrue: "Válido/Veraz",
        outcomeTrueDesc: "Confirmar que la afirmación es válida y verdadera",
        outcomeFalse: "Inválido/Falso",
        outcomeFalseDesc: "Confirmar que la afirmación es inválida y falsa",
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
    onboarding: {
      title: "Insight Quick Tour",
      welcome: "Welcome to Insight",
      welcomeDesc:
        "Insight is your gateway to Oracle monitoring and dispute resolution. Let's take a quick tour to get you started.",
      selectRole: "Please select your role to get a personalized tour:",
      skipTour: "Skip Tour",
      continueAsGeneral: "Continue as General User",
      getStarted: "Get Started",
      next: "Next",
      roles: {
        developer: {
          title: "For Developers",
          description: "Build with confidence using our Oracle data API",
        },
        protocol_team: {
          title: "For Protocol Teams",
          description: "Ensure Oracle data reliability for your DeFi protocols",
        },
        oracle_operator: {
          title: "For Oracle Operators",
          description: "Manage your Oracle nodes and performance",
        },
        general_user: {
          title: "For General Users",
          description: "Explore Oracle data and participate in the ecosystem",
        },
      },
      steps: {
        developer: {
          api: {
            title: "API Access",
            description:
              "Explore our REST API for accessing Oracle data programmatically.",
          },
          integration: {
            title: "Easy Integration",
            description:
              "Integrate Oracle data into your dApps with simple SDKs.",
          },
          monitoring: {
            title: "Monitor Your Integrations",
            description:
              "Track the performance of Oracle data in your applications.",
          },
        },
        protocol_team: {
          monitoring: {
            title: "Real-time Monitoring",
            description:
              "Monitor Oracle data trends and sync status for your protocols.",
          },
          disputes: {
            title: "Dispute Resolution",
            description: "Participate in disputes and ensure fair outcomes.",
          },
          analytics: {
            title: "Performance Analytics",
            description: "Analyze Oracle performance across different markets.",
          },
        },
        oracle_operator: {
          nodeMonitoring: {
            title: "Node Monitoring",
            description:
              "Monitor the performance and status of your Oracle nodes.",
          },
          syncStatus: {
            title: "Sync Status",
            description: "Track sync status and latency across chains.",
          },
          alerts: {
            title: "Alert Management",
            description: "Configure alerts for important events and anomalies.",
          },
        },
        general_user: {
          exploration: {
            title: "Data Exploration",
            description:
              "Browse Oracle data across different markets and protocols.",
          },
          assertions: {
            title: "Assertion Creation",
            description: "Create and track assertions on Oracle data.",
          },
          disputes: {
            title: "Dispute Participation",
            description: "Vote on disputes and shape the outcome.",
          },
        },
      },
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
  fr: {
    tooltips: {
      bond: "Le caution est le capital bloqué par l'assertionneur pour garantir la véracité des informations. Si les informations sont prouvées fausses, la caution est confisquée.",
      market:
        "La question de marché définit ce que l'oracle doit répondre, généralement une question oui/non ou une valeur.",
      liveness:
        "La période de vie est la fenêtre temporelle permettant à quiconque de contester une assertion. Après cette période, l'assertion est considérée comme vraie.",
      reward:
        "Si aucune contestation n'a lieu, l'assertionneur récupère sa caution. Si une contestation se produit et que vous gagnez, vous gagnez la caution de l'opposant en récompense.",
      protocol:
        "Le nom du protocole ou du projet concerné par cette assertion.",
      assertion:
        "Le fait que vous déclarez. Assurez-vous qu'il est objectif, vérifiable et dispose d'un temps et d'une source clairs.",
    },
    app: {
      title: "Insight · Surveillance UMA",
      description:
        "Surveillance visuelle des contestations et des règlements de l'UMA Optimistic Oracle.",
      subtitle: "Surveillance de l'oracle",
    },
    howItWorks: {
      title: "Comment ça fonctionne",
      step1: {
        title: "Déclarer une vérité",
        desc: "Quiconque peut publier toute déclaration comme un fait, accompagnée d'une caution en garantie.",
      },
      step2: {
        title: "Vérifier et contester",
        desc: "Pendant la période de vie, si l'assertion est fausse, quiconque peut la contester en bloquant un montant égal.",
      },
      step3: {
        title: "Régler et récompenser",
        desc: "Si aucune contestation n'a lieu, l'assertion est valide. Si une contestation se produit, les vérificateurs UMA voteront et le gagnant prend la caution de l'opposant.",
      },
    },
    nav: {
      oracle: "Oracle",
      disputes: "Contestations",
      alerts: "Alertes",
      audit: "Audit",
      adminTokens: "Jetons",
      myAssertions: "Mes assertions",
      myDisputes: "Mes contestations",
      watchlist: "Liste de surveillance",
    },
    common: {
      language: "Langue",
      loading: "Chargement…",
      comingSoon: "Bientôt disponible",
      loadMore: "Charger plus",
      retry: "Réessayer",
      noData: "Aucune donnée",
      all: "Tous",
      pending: "En attente",
      disputed: "Contesté",
      resolved: "Résolu",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      close: "Fermer",
      viewTx: "Voir la transaction",
      copyHash: "Copier le hash",
      copied: "Copié",
      viewDetails: "Voir les détails",
      viewOnExplorer: "Voir sur l'explorateur",
      allLoaded: "Tout chargé",
      ok: "OK",
      cancel: "Annuler",
      confirm: "Confirmer",
      popular: "Populaire",
      example: "Exemple",
      min: "Minimum",
      addToWatchlist: "Ajouter à la liste de surveillance",
      removeFromWatchlist: "Retirer de la liste de surveillance",
      success: "Succès",
    },
    sidebar: {
      userWallet: "Portefeuille utilisateur",
      notConnected: "Non connecté",
    },
    wallet: {
      connect: "Connecter le portefeuille",
      connecting: "Connexion…",
      notFound: "Portefeuille non trouvé",
      install: "Veuillez installer MetaMask ou Rabby !",
      connected: "Portefeuille connecté",
      connectedMsg: "Connecté à",
      failed: "Échec de la connexion",
      disconnect: "Déconnecter",
      copyAddress: "Copier l'adresse",
      balance: "Solde",
      myProfile: "Mon profil",
      network: "Réseau",
      unknownNetwork: "Réseau inconnu",
      networkSwitched: "Réseau basculé",
      networkSwitchFailed: "Échec du basculement de réseau",
      switchingNetwork: "Basculement…",
      networkAlreadySelected: "Déjà sur ce réseau",
    },
    chain: {
      local: "Local",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
    },
    oracle: {
      title: "Surveillance de l'oracle",
      description:
        "Suivi en temps réel des assertions et des contestations de l'UMA Optimistic Oracle.",
      newAssertion: "Nouvelle assertion",
      myActivity: "Mon activité",
      myActivityTooltip: "Afficher uniquement les assertions créées par moi",
      myActivityEmpty: "Vous n'avez pas encore créé d'assertions.",
      myDisputesFilter: "Mes contestations",
      myDisputesTooltip:
        "Afficher uniquement les contestations initiées par moi",
      myDisputesEmpty: "Vous n'avez pas encore initié de contestations.",
      searchPlaceholder: "Rechercher des assertions…",
      tabs: {
        overview: "Aperçu",
        leaderboard: "Classement",
        tools: "Outils",
      },
      sync: {
        synced: "Synchronisé",
        lagging: "En retard",
        error: "Erreur de synchronisation",
        status: "Statut de l'indexeur",
        block: "Hauteur du bloc",
        lastUpdate: "Dernière mise à jour",
      },
      charts: {
        dailyAssertions: "Assertions quotidiennes",
        tvsCumulative: "Valeur totale sécurisée (cumulée)",
        syncHealth: "Santé de la synchronisation",
        topMarkets: "Marchés populaires",
        noData: "Aucune donnée de graphique",
        activityDesc: "Activité au fil du temps",
        tvsDesc: "Valeur cumulée",
        syncDesc: "Délai et durée de l'indexeur au fil du temps",
        syncLagBlocks: "Délai (blocs)",
        syncDuration: "Durée de synchronisation (ms)",
        waitingData:
          "Attente de plus de données historiques pour générer des tendances d'activité.",
      },
      alerts: {
        title: "Règles d'alerte",
        description:
          "Configurer les règles de surveillance et de notification du système.",
        rule: "Nom de la règle",
        event: "Événement de déclenchement",
        severity: "Gravité",
        status: "Statut",
        enabled: "Activé",
        disabled: "Désactivé",
        save: "Enregistrer la configuration",
        saving: "Enregistrement…",
        success: "Configuration enregistrée",
        error: "Échec de l'enregistrement",
        noRules: "Aucune règle",
        events: {
          dispute_created: "Contestation créée",
          sync_error: "Erreur de synchronisation",
          stale_sync: "Synchronisation figée",
        },
        severities: {
          info: "Info",
          warning: "Avertissement",
          critical: "Critique",
        },
      },
      myAssertions: {
        title: "Mes assertions",
        description: "Gérez toutes les assertions créées par vous.",
        connectWalletTitle: "Connectez votre portefeuille pour voir",
        connectWalletDesc:
          "Veuillez connecter votre portefeuille pour voir votre historique d'assertions.",
        noAssertions: "Vous n'avez pas encore créé d'assertions.",
        createFirst: "Créer votre première assertion",
      },
      myDisputes: {
        title: "Mes contestations",
        description: "Gérez toutes les contestations initiées par vous.",
        connectWalletTitle: "Connectez votre portefeuille pour voir",
        connectWalletDesc:
          "Veuillez connecter votre portefeuille pour voir votre historique de contestations.",
        noDisputes: "Vous n'avez pas encore initié de contestations.",
      },
      timeline: {
        asserted: "Asserté",
        disputed: "Contesté",
        resolved: "Résolu",
        votingEnds: "Fin du vote",
        livenessEnds: "Fin de la période de vie",
        active: "Actif",
      },
      detail: {
        title: "Détails de l'assertion",
        back: "Retour",
        goBack: "Retour",
        asserter: "Assertionneur",
        bondAmount: "Montant de la caution",
        marketQuestion: "Question de marché",
        assertedOutcome: "Résultat asserté",
        settlementResult: "Résultat du règlement",
        settleAssertion: "Régler l'assertion",
        cancel: "Annuler",
        submitting: "Soumission…",
        confirming: "Confirmation…",
        errorTitle: "Erreur de chargement des données",
        errorNotFound: "L'assertion demandée n'a pas pu être trouvée.",
        disputeAssertion: "Contester cette assertion",
        voteOnDispute: "Voter sur la contestation",
        support: "Prend en charge",
        against: "Contre",
      },
    },
    pnl: {
      title: "Calculateur de profit",
      description: "Estimez vos rendements potentiels",
      iWantToDispute: "Je veux contester",
      iWantToAssert: "Je veux affirmer",
      bondAmount: "Montant de la caution (USD)",
      disclaimer:
        "*Supposant une logique standard de jeu d'escalade de caution 1:1.",
      profit: "Profit potentiel",
      roi: "ROI",
      totalReturn: "Retour total",
    },
    audit: {
      title: "Journal d'audit",
      description:
        "Suivez les actions d'administration et les modifications critiques.",
      adminToken: "Jeton d'administration",
      adminTokenPlaceholder: "Bearer …",
      adminTokenHint:
        "Utilisez le même jeton d'administration stocké dans cette session.",
      total: "Total",
      refresh: "Actualiser",
      error: "Erreur",
      empty: "Aucune entrée d'audit pour le moment.",
      actor: "Acteur",
    },
    adminTokens: {
      title: "Jetons d'administration",
      description:
        "Créez, faites pivoter et révoquez les jetons d'administration.",
      label: "Étiquette",
      role: "Rôle",
      create: "Créer",
      revoke: "Révoquer",
      createdAt: "Créé",
      revokedAt: "Révoqué",
      tokenValue: "Nouveau jeton (affiché une fois)",
    },
    disputes: {
      title: "Règlement des contestations",
      description:
        "Surveillez les contestations actives, suivez la progression des votes et analysez les résultats.",
      umaDvmActive: "UMA DVM Actif",
      viewOnUma: "Voir sur UMA",
      reason: "Raison de la contestation",
      disputer: "Contestataire",
      disputedAt: "Contesté le",
      votingProgress: "Progression du vote",
      endsAt: "Se termine",
      support: "Soutenir l'assertion",
      reject: "Rejeter l'assertion",
      totalVotesCast: "Total des votes exprimés",
      emptyTitle: "Aucune contestation active",
      emptyDesc:
        "Il n'y a actuellement aucune contestation active dans le système.",
      card: {
        dispute: "Contestation",
        disputer: "Contestataire",
        votes: "Votes",
      },
    },
    alerts: {
      title: "Alertes",
      description: "Aggrégez les alertes, reconnaissez-les et suivez la santé.",
      adminToken: "Jeton d'administration",
      adminActor: "Acteur",
      adminActorPlaceholder: "ex. alice@ops",
      adminTokenHint:
        "Stocké localement dans cette session pour l'accès API administrateur",
      adminTokenWarning:
        "Sans jeton, vous ne pouvez que voir les alertes, pas les reconnaître/résoudre ni enregistrer les règles.",
      rules: "Règles d'alerte",
      refresh: "Actualiser",
      acknowledge: "Reconnaître",
      resolve: "Résoudre",
      status: "Statut",
      severity: "Gravité",
      type: "Type",
      searchPlaceholder: "Rechercher titre/contenu/entité…",
      loadRules: "Charger les règles",
      saveRules: "Enregistrer",
      savingRules: "Enregistrement…",
      lastSeen: "Dernière",
      occurrences: "Occurrences",
    },
    watchlist: {
      emptyDesc:
        "Vous n'avez pas encore ajouté d'assertions à votre liste de surveillance.",
    },
    status: {
      voting: "Voting",
      pendingExecution: "Exécution en attente",
      executed: "Exécuté",
    },
    errors: {
      unknownError: "Erreur inconnue",
      walletNotConnected: "Portefeuille non connecté",
      userRejected: "Vous avez refusé la demande de portefeuille.",
      requestPending:
        "Une demande de portefeuille est déjà en attente. Veuillez vérifier votre portefeuille.",
      chainNotAdded:
        "Ce réseau n'est pas ajouté dans votre portefeuille. Veuillez l'ajouter d'abord.",
      wrongNetwork: "Mauvais réseau. Veuillez basculer sur la chaîne cible.",
      insufficientFunds:
        "Fonds insuffisants pour payer les frais de transaction ou le montant de transfert.",
      invalidAddress: "Format d'adresse incorrect",
      invalidMaxBlockRange:
        "La plage de blocs maximale n'est pas dans les limites autorisées",
      invalidVotingPeriodHours:
        "Le nombre d'heures de période de vote n'est pas dans les limites autorisées",
      httpError: "Échec de la requête réseau",
      invalidJson: "Échec de l'analyse de la réponse",
      apiError: "Erreur serveur",
      invalidApiResponse: "Réponse API invalide",
      missingConfig: "Configuration manquante : URL RPC ou adresse de contrat",
      invalidRpcUrl: "Format d'URL RPC incorrect",
      invalidContractAddress: "Format d'adresse de contrat incorrect",
      invalidChain: "Configuration de chaîne incorrecte",
      invalidRequestBody: "Paramètres de requête incorrects",
      forbidden: "Interdit (jeton d'administration requis)",
      rpcUnreachable: "RPC inaccessible",
      contractNotFound: "Contrat non trouvé",
      syncFailed: "Échec de synchronisation",
    },
    errorPage: {
      title: "Quelque chose s'est mal passé",
      description:
        "Nous nous excusons pour le désagrément. Une erreur inattendue s'est produite lors du traitement de votre demande.",
      digest: "Résumé de l'erreur",
      retry: "Réessayer",
      home: "Retourner à l'accueil",
    },
    onboarding: {
      title: "Visite guidée Insight",
      welcome: "Bienvenue dans Insight",
      welcomeDesc:
        "Insight est votre passerelle vers la surveillance des oracles et la résolution des contestations. Faisons une petite visite pour vous familiariser.",
      selectRole:
        "Veuillez sélectionner votre rôle pour obtenir une visite personnalisée:",
      skipTour: "Ignorer la visite",
      continueAsGeneral: "Continuer en tant qu'utilisateur général",
      getStarted: "Commencer",
      next: "Suivant",
      roles: {
        developer: {
          title: "Pour les développeurs",
          description:
            "Construisez avec confiance en utilisant notre API de données d'oracle",
        },
        protocol_team: {
          title: "Pour les équipes de protocole",
          description:
            "Assurez la fiabilité des données d'oracle pour vos protocoles DeFi",
        },
        oracle_operator: {
          title: "Pour les opérateurs d'oracles",
          description: "Gérez vos nœuds d'oracle et leur performance",
        },
        general_user: {
          title: "Pour les utilisateurs généraux",
          description:
            "Explorez les données d'oracle et participez à l'écosystème",
        },
      },
      steps: {
        developer: {
          api: {
            title: "Accès API",
            description:
              "Explorez notre API REST pour accéder aux données d'oracle de manière programmatique.",
          },
          integration: {
            title: "Intégration simple",
            description:
              "Intégrez les données d'oracle dans vos dApps avec des SDK simples.",
          },
          monitoring: {
            title: "Surveillez vos intégrations",
            description:
              "Suivez les performances des données d'oracle dans vos applications.",
          },
        },
        protocol_team: {
          monitoring: {
            title: "Surveillance en temps réel",
            description:
              "Surveillez les tendances des données d'oracle et l'état de synchronisation pour vos protocoles.",
          },
          disputes: {
            title: "Résolution des contestations",
            description:
              "Participez aux contestations et assurez des résultats équitables.",
          },
          analytics: {
            title: "Analytiques de performance",
            description:
              "Analysez les performances de l'oracle sur différents marchés.",
          },
        },
        oracle_operator: {
          nodeMonitoring: {
            title: "Surveillance des nœuds",
            description:
              "Surveillez les performances et l'état de vos nœuds d'oracle.",
          },
          syncStatus: {
            title: "État de synchronisation",
            description:
              "Suivez l'état de synchronisation et la latence entre les chaînes.",
          },
          alerts: {
            title: "Gestion des alertes",
            description:
              "Configurez des alertes pour les événements importants et les anomalies.",
          },
        },
        general_user: {
          exploration: {
            title: "Exploration des données",
            description:
              "Parcourez les données d'oracle sur différents marchés et protocoles.",
          },
          assertions: {
            title: "Création d'assertions",
            description:
              "Créez et suivez des assertions sur les données d'oracle.",
          },
          disputes: {
            title: "Participation aux contestations",
            description:
              "Votez sur les contestations et influencez le résultat.",
          },
        },
      },
    },
  },
  ko: {
    tooltips: {
      bond: "본드는 주장자가 정보의 진실성을 보장하기 위해 잠그는 자금입니다. 정보가 거짓으로 입증되면 본드가 몰수됩니다.",
      market:
        "시장 질문은 오라클이 답해야 할具체적인 내용을 정의하며, 일반적으로 예/아니오 질문이나 수치입니다.",
      liveness:
        "생명 주기는 누구나 주장에异议를 제기할 수 있는 시간 창입니다. 종료 후 주장은 진실로 간주됩니다.",
      reward:
        "만약异议 기간 내에异议가 없다면, 주장자는 본드를 회수합니다.异议가 발생하고 승리하면 상대방의 본드를 보상으로 받게 됩니다.",
      protocol: "이 주장과 관련된 프로토콜 또는 프로젝트의 이름입니다.",
      assertion:
        "당신이 진실로 주장하는 사실입니다.客觀적이고 검증 가능하며 명확한 시간과 출처가 있어야 합니다.",
    },
    app: {
      title: "Insight · UMA 모니터링",
      description: "UMA Optimistic Oracle 분쟁 및 결제의 시각적 모니터링",
      subtitle: "오라클 모니터링",
    },
    howItWorks: {
      title: "작동 원리",
      step1: {
        title: "진실 주장",
        desc: "누구나 보증금과 함께 사실로서 어떤 주장도 게시할 수 있습니다.",
      },
      step2: {
        title: "검증 및异议",
        desc: "생명 주기 동안 주장이 거짓이라면, 누구나 같은 금액을 보증하여异议를 제기할 수 있습니다.",
      },
      step3: {
        title: "결제 및 보상",
        desc: "异议가 없으면 주장이 유효합니다.异议가 발생하면 UMA 검증자가 투표하고, 승자는 상대방의 보증금을 받습니다.",
      },
    },
    nav: {
      oracle: "오라클",
      disputes: "분쟁",
      alerts: "경고",
      audit: "감사",
      adminTokens: "토큰",
      myAssertions: "내 주장",
      myDisputes: "내 분쟁",
      watchlist: "관심 목록",
    },
    common: {
      language: "언어",
      loading: "로딩 중…",
      comingSoon: "곧 출시됩니다",
      loadMore: "더 불러오기",
      retry: "재시도",
      noData: "데이터가 없습니다",
      all: "전체",
      pending: "대기 중",
      disputed: "분쟁 중",
      resolved: "해결됨",
      openMenu: "메뉴 열기",
      closeMenu: "메뉴 닫기",
      close: "닫기",
      viewTx: "거래 보기",
      copyHash: "해시 복사",
      copied: "복사됨",
      viewDetails: "세부 정보 보기",
      viewOnExplorer: "탐색기에서 보기",
      allLoaded: "모두 로드됨",
      ok: "확인",
      cancel: "취소",
      confirm: "확인",
      popular: "인기",
      example: "예시",
      min: "최소",
      addToWatchlist: "관심 목록에 추가",
      removeFromWatchlist: "관심 목록에서 제거",
      success: "성공",
    },
    sidebar: {
      userWallet: "사용자 지갑",
      notConnected: "연결되지 않음",
    },
    wallet: {
      connect: "지갑 연결",
      connecting: "연결 중...",
      notFound: "지갑을 찾을 수 없음",
      install: "MetaMask 또는 Rabby를 설치하세요!",
      connected: "지갑이 연결되었습니다",
      connectedMsg: "에 연결되었습니다",
      failed: "연결 실패",
      disconnect: "연결 해제",
      copyAddress: "주소 복사",
      balance: "잔액",
      myProfile: "내 프로필",
      network: "네트워크",
      unknownNetwork: "알 수 없는 네트워크",
      networkSwitched: "네트워크가 전환되었습니다",
      networkSwitchFailed: "네트워크 전환 실패",
      switchingNetwork: "전환 중…",
      networkAlreadySelected: "이 네트워크에 이미 있습니다",
    },
    chain: {
      local: "로컬",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
    },
    oracle: {
      title: "오라클 모니터링",
      description: "UMA Optimistic Oracle 주장과 분쟁의 실시간 추적",
      newAssertion: "새 주장",
      myActivity: "내 활동",
      myActivityTooltip: "내가 만든 주장만 표시",
      myActivityEmpty: "아직 주장을 만들지 않았습니다.",
      myDisputesFilter: "내 분쟁",
      myDisputesTooltip: "내가 시작한 분쟁만 표시",
      myDisputesEmpty: "아직 분쟁을 시작하지 않았습니다.",
      searchPlaceholder: "주장 검색…",
      tabs: {
        overview: "개요",
        leaderboard: "순위표",
        tools: "도구",
      },
      sync: {
        synced: "동기화됨",
        lagging: "동기화 지연",
        error: "동기화 오류",
        status: "인덱서 상태",
        block: "블록 높이",
        lastUpdate: "마지막 업데이트",
      },
      charts: {
        dailyAssertions: "일일 주장",
        tvsCumulative: "총 보장 가치 (누적)",
        syncHealth: "동기화 건강",
        topMarkets: "인기 시장",
        noData: "차트 데이터가 없습니다",
        activityDesc: "시간에 따른 활동",
        tvsDesc: "누적 가치",
        syncDesc: "시간에 따른 인덱서 지연 및 지속 시간",
        syncLagBlocks: "지연 (블록)",
        syncDuration: "동기화 지속 시간 (ms)",
        waitingData:
          "활동 트렌드를 생성하기 위해 더 많은 역사적 데이터를 기다리고 있습니다.",
      },
      alerts: {
        title: "경고 규칙",
        description: "시스템 모니터링 및 알림 규칙 구성",
        rule: "규칙 이름",
        event: "트리거 이벤트",
        severity: "심각도",
        status: "상태",
        enabled: "활성화됨",
        disabled: "비활성화됨",
        save: "구성 저장",
        saving: "저장 중...",
        success: "구성이 저장되었습니다",
        error: "저장 실패",
        noRules: "규칙을 찾을 수 없습니다",
        events: {
          dispute_created: "분쟁 생성",
          sync_error: "동기화 오류",
          stale_sync: "동기화 정체",
        },
        severities: {
          info: "정보",
          warning: "경고",
          critical: "심각",
        },
      },
      myAssertions: {
        title: "내 주장",
        description: "내가 만든 모든 주장 관리",
        connectWalletTitle: "보려면 지갑을 연결하세요",
        connectWalletDesc: "주장 기록을 보려면 지갑을 연결하세요.",
        noAssertions: "아직 주장을 만들지 않았습니다.",
        createFirst: "첫 주장 만들기",
      },
      myDisputes: {
        title: "내 분쟁",
        description: "내가 시작한 모든 분쟁 관리",
        connectWalletTitle: "보려면 지갑을 연결하세요",
        connectWalletDesc: "분쟁 기록을 보려면 지갑을 연결하세요.",
        noDisputes: "아직 분쟁을 시작하지 않았습니다.",
      },
      timeline: {
        asserted: "주장됨",
        disputed: "분쟁됨",
        resolved: "해결됨",
        votingEnds: "투표 종료",
        livenessEnds: "생명 주기 종료",
        active: "진행 중",
      },
      detail: {
        title: "주장 세부 정보",
        back: "뒤로 가기",
        goBack: "돌아가기",
        asserter: "주장자",
        bondAmount: "보증금 금액",
        marketQuestion: "시장 질문",
        assertedOutcome: "주장된 결과",
        settlementResult: "결제 결과",
        settleAssertion: "주장 결제",
        cancel: "취소",
        submitting: "제출 중...",
        confirming: "확인 중...",
        errorTitle: "오류: 데이터 로드 실패",
        errorNotFound: "요청한 주장을 찾을 수 없습니다.",
        disputeAssertion: "이 주장에异议 제기",
        voteOnDispute: "분쟁에 투표",
        support: "지지",
        against: "반대",
      },
    },
    pnl: {
      title: "수익 계산기",
      description: "잠재적 수익 추정",
      iWantToDispute: "异议하려고 합니다",
      iWantToAssert: "주장하려고 합니다",
      bondAmount: "보증금 금액 (USD)",
      disclaimer: "*표준 1:1 보증금 승격 게임 로직을 가정합니다.",
      profit: "잠재적 수익",
      roi: "수익률",
      totalReturn: "총 수익",
    },
    audit: {
      title: "감사 로그",
      description: "관리자 작업과 중요한 변경사항 추적",
      adminToken: "관리자 토큰",
      adminTokenPlaceholder: "Bearer …",
      adminTokenHint: "이 세션에 저장된 동일한 관리자 토큰을 사용하세요.",
      total: "총계",
      refresh: "새로 고침",
      error: "오류",
      empty: "아직 감사 항목이 없습니다.",
      actor: "행위자",
    },
    adminTokens: {
      title: "관리자 토큰",
      description: "관리자 토큰 생성, 회전 및 취소",
      label: "레이블",
      role: "역할",
      create: "생성",
      revoke: "취소",
      createdAt: "생성일",
      revokedAt: "취소일",
      tokenValue: "새 토큰 (한 번만 표시)",
    },
    disputes: {
      title: "분쟁 결제",
      description: "활성 분쟁 모니터링, 투표 진행 상황 및 결과 분석",
      umaDvmActive: "UMA DVM 활성",
      viewOnUma: "UMA에서 보기",
      reason: "분쟁 이유",
      disputer: "异议자",
      disputedAt: "异议 일시",
      votingProgress: "투표 진행 상황",
      endsAt: "종료 일시",
      support: "지지",
      reject: "거부",
      totalVotesCast: "총 투표 수",
      emptyTitle: "활성 분쟁이 없습니다",
      emptyDesc: "현재 시스템에 활성 분쟁이 없습니다.",
      card: {
        dispute: "분쟁",
        disputer: "异议자",
        votes: "투표",
      },
    },
    alerts: {
      title: "경고",
      description: "경고 집계, 확인 및 건강 추적",
      adminToken: "관리자 토큰",
      adminActor: "행위자",
      adminActorPlaceholder: "예: alice@ops",
      adminTokenHint: "관리자 API 접근을 위해 이 세션에 로컬로 저장됨",
      adminTokenWarning:
        "토큰 없이는 경고를 보기만 할 수 있고, 확인/해결하거나 규칙을 저장할 수 없습니다.",
      rules: "경고 규칙",
      refresh: "새로 고침",
      acknowledge: "확인",
      resolve: "해결",
      status: "상태",
      severity: "심각도",
      type: "유형",
      searchPlaceholder: "제목/내용/엔티티 검색…",
      loadRules: "규칙 로드",
      saveRules: "저장",
      savingRules: "저장 중…",
      lastSeen: "마지막",
      occurrences: "발생 횟수",
    },
    watchlist: {
      emptyDesc: "아직 관심 목록에 주장을 추가하지 않았습니다.",
    },
    status: {
      voting: "투표 중",
      pendingExecution: "실행 대기 중",
      executed: "실행됨",
    },
    errors: {
      unknownError: "알 수 없는 오류",
      walletNotConnected: "지갑이 연결되지 않았습니다",
      userRejected: "지갑 요청을 거부했습니다.",
      requestPending:
        "지갑에 이미 대기 중인 요청이 있습니다. 지갑을 확인하세요.",
      chainNotAdded:
        "이 네트워크가 지갑에 추가되지 않았습니다. 먼저 추가하세요.",
      wrongNetwork: "잘못된 네트워크입니다. 대상 체인으로 전환하세요.",
      insufficientFunds:
        "트랜잭션 비용이나 전송 금액을 지불할 잔액이 부족합니다.",
      invalidAddress: "주소 형식이 올바르지 않습니다",
      invalidMaxBlockRange: "최대 블록 범위가 허용 범위를 벗어났습니다",
      invalidVotingPeriodHours: "투표 기간 시간이 허용 범위를 벗어났습니다",
      httpError: "네트워크 요청 실패",
      invalidJson: "응답 파싱 실패",
      apiError: "서버 오류",
      invalidApiResponse: "API 응답이 유효하지 않습니다",
      missingConfig: "구성 누락: RPC URL 또는 계약 주소",
      invalidRpcUrl: "RPC URL 형식이 올바르지 않습니다",
      invalidContractAddress: "계약 주소 형식이 올바르지 않습니다",
      invalidChain: "체인 구성이 올바르지 않습니다",
      invalidRequestBody: "요청 본문이 올바르지 않습니다",
      forbidden: "금지됨 (관리자 토큰 필요)",
      rpcUnreachable: "RPC에 연결할 수 없습니다",
      contractNotFound: "계약을 찾을 수 없습니다",
      syncFailed: "동기화 실패",
    },
    errorPage: {
      title: "문제가 발생했습니다",
      description:
        "불편을 드려 죄송합니다. 요청을 처리하는 동안 예기치 않은 오류가 발생했습니다.",
      digest: "오류 요약",
      retry: "재시도",
      home: "홈으로 가기",
    },
    onboarding: {
      title: "Insight 빠른 안내",
      welcome: "Insight에 오신 것을 환영합니다",
      welcomeDesc:
        "Insight는 오라클 모니터링과 분쟁 해결을 위한 게이트웨이입니다. 시작하기 전에 빠른 안내를 진행해보겠습니다.",
      selectRole: "개인화된 안내를 받으려면 역할을 선택해 주세요:",
      skipTour: "안내 건너뛰기",
      continueAsGeneral: "일반 사용자로 계속하기",
      getStarted: "시작하기",
      next: "다음",
      roles: {
        developer: {
          title: "개발자용",
          description: "오라클 데이터 API를 사용하여 자신 있게 개발하세요",
        },
        protocol_team: {
          title: "프로토콜 팀용",
          description: "DeFi 프로토콜에 안정적인 오라클 데이터를 보장하세요",
        },
        oracle_operator: {
          title: "오라클 운영자용",
          description: "오라클 노드와 성능을 관리하세요",
        },
        general_user: {
          title: "일반 사용자용",
          description: "오라클 데이터를 탐색하고 생태계에 참여하세요",
        },
      },
      steps: {
        developer: {
          api: {
            title: "API 접근",
            description:
              "프로그래밍 방식으로 오라클 데이터에 접근하기 위한 REST API를 탐색하세요.",
          },
          integration: {
            title: "간편한 통합",
            description: "간단한 SDK로 dApp에 오라클 데이터를 통합하세요.",
          },
          monitoring: {
            title: "통합 모니터링",
            description: "애플리케이션에서 오라클 데이터의 성능을 추적하세요.",
          },
        },
        protocol_team: {
          monitoring: {
            title: "실시간 모니터링",
            description:
              "프로토콜에 대한 오라클 데이터 트렌드와 동기화 상태를 모니터링하세요.",
          },
          disputes: {
            title: "분쟁 해결",
            description: "분쟁에 참여하고 공정한 결과를 보장하세요.",
          },
          analytics: {
            title: "성능 분석",
            description: "다양한 시장에서 오라클 성능을 분석하세요.",
          },
        },
        oracle_operator: {
          nodeMonitoring: {
            title: "노드 모니터링",
            description: "오라클 노드의 성능과 상태를 모니터링하세요.",
          },
          syncStatus: {
            title: "동기화 상태",
            description: "체인 간 동기화 상태와 지연을 추적하세요.",
          },
          alerts: {
            title: "경고 관리",
            description: "중요한 이벤트와 이상에 대한 경고를 구성하세요.",
          },
        },
        general_user: {
          exploration: {
            title: "데이터 탐색",
            description: "다양한 시장과 프로토콜의 오라클 데이터를 탐색하세요.",
          },
          assertions: {
            title: "주장 생성",
            description: "오라클 데이터에 대한 주장을 생성하고 추적하세요.",
          },
          disputes: {
            title: "분쟁 참여",
            description: "분쟁에 투표하고 결과에 영향을 미치세요.",
          },
        },
      },
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
  | "oracle.settleModal.selectOutcome"
  | "oracle.settleModal.outcomeTrue"
  | "oracle.settleModal.outcomeTrueDesc"
  | "oracle.settleModal.outcomeFalse"
  | "oracle.settleModal.outcomeFalseDesc"
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
  | "onboarding.title"
  | "onboarding.welcome"
  | "onboarding.welcomeDesc"
  | "onboarding.selectRole"
  | "onboarding.skipTour"
  | "onboarding.continueAsGeneral"
  | "onboarding.getStarted"
  | "onboarding.next"
  | "onboarding.roles.developer.title"
  | "onboarding.roles.developer.description"
  | "onboarding.roles.protocol_team.title"
  | "onboarding.roles.protocol_team.description"
  | "onboarding.roles.oracle_operator.title"
  | "onboarding.roles.oracle_operator.description"
  | "onboarding.roles.general_user.title"
  | "onboarding.roles.general_user.description"
  | "onboarding.steps.developer.api.title"
  | "onboarding.steps.developer.api.description"
  | "onboarding.steps.developer.integration.title"
  | "onboarding.steps.developer.integration.description"
  | "onboarding.steps.developer.monitoring.title"
  | "onboarding.steps.developer.monitoring.description"
  | "onboarding.steps.protocol_team.monitoring.title"
  | "onboarding.steps.protocol_team.monitoring.description"
  | "onboarding.steps.protocol_team.disputes.title"
  | "onboarding.steps.protocol_team.disputes.description"
  | "onboarding.steps.protocol_team.analytics.title"
  | "onboarding.steps.protocol_team.analytics.description"
  | "onboarding.steps.oracle_operator.nodeMonitoring.title"
  | "onboarding.steps.oracle_operator.nodeMonitoring.description"
  | "onboarding.steps.oracle_operator.syncStatus.title"
  | "onboarding.steps.oracle_operator.syncStatus.description"
  | "onboarding.steps.oracle_operator.alerts.title"
  | "onboarding.steps.oracle_operator.alerts.description"
  | "onboarding.steps.general_user.exploration.title"
  | "onboarding.steps.general_user.exploration.description"
  | "onboarding.steps.general_user.assertions.title"
  | "onboarding.steps.general_user.assertions.description"
  | "onboarding.steps.general_user.disputes.title"
  | "onboarding.steps.general_user.disputes.description"
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
