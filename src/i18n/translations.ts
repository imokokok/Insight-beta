export type Lang = "zh" | "en" | "es";

export const languages: Array<{ code: Lang; label: string }> = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" }
];

export const LANG_STORAGE_KEY = "insight_lang";

export function isLang(value: unknown): value is Lang {
  return value === "zh" || value === "en" || value === "es";
}

export function detectLangFromAcceptLanguage(value: string | null | undefined): Lang {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("zh")) return "zh";
  if (lower.includes("es")) return "es";
  return "en";
}

export const langToHtmlLang: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en",
  es: "es"
};

export const langToLocale: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en-US",
  es: "es-ES"
};

export const translations = {
  zh: {
    app: {
      title: "Insight · UMA 结算监控",
      description: "UMA Optimistic Oracle 争议与结算可视化监控",
      subtitle: "预言机监控"
    },
    nav: {
      oracle: "监控台",
      disputes: "争议"
    },
    common: {
      language: "语言",
      loading: "加载中…",
      comingSoon: "敬请期待",
      loadMore: "加载更多",
      all: "全部",
      pending: "待确认",
      disputed: "已争议",
      resolved: "已结算",
      openMenu: "打开菜单",
      closeMenu: "关闭菜单",
      close: "关闭",
      viewTx: "查看交易",
      copyHash: "复制哈希",
      copied: "已复制",
      viewDetails: "查看详情",
      allLoaded: "已加载全部"
    },
    sidebar: {
      userWallet: "用户钱包",
      notConnected: "未连接"
    },
    wallet: {
      connect: "连接钱包",
      connecting: "连接中…",
      notFound: "未检测到钱包",
      install: "请安装 MetaMask 或 Rabby 等钱包！",
      connected: "钱包已连接",
      connectedMsg: "已连接到",
      failed: "连接失败"
    },
    chain: {
      local: "本地",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism"
    },
    oracle: {
      title: "预言机监控",
      description: "实时追踪 UMA Optimistic Oracle 断言与争议。",
      newAssertion: "新建断言",
      searchPlaceholder: "搜索断言…",
      tabs: {
        overview: "概览",
        leaderboard: "排行榜",
        tools: "工具"
      },
      charts: {
        dailyAssertions: "每日断言数",
        tvsCumulative: "安全总价值（累计）",
        noData: "暂无图表数据",
        activityDesc: "随时间变化的活动",
        tvsDesc: "累计价值",
        waitingData: "等待更多历史数据以生成活动趋势。"
      },
      timeline: {
        asserted: "已断言",
        disputed: "已争议",
        resolved: "已结算",
        votingEnds: "投票截止",
        livenessEnds: "挑战期结束",
        active: "进行中"
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
        asserter: "断言方",
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
      settlementFalse: "无效 / 虚假"
    },
    tx: {
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
      settlementSubmittedMsg: "该断言已发起结算。"
    },
    createAssertionModal: {
      protocolLabel: "协议",
      protocolPlaceholder: "例如：Aave V3",
      marketLabel: "市场 / ID",
      marketPlaceholder: "例如：ETH-USDC",
      assertionLabel: "断言内容",
      assertionPlaceholder: "请描述你要断言的事实…",
      bondLabel: "保证金（ETH）",
      submit: "创建断言"
    },
    disputeModal: {
      desc: "提交争议需要缴纳保证金（Bond）。",
      bondLabel: "保证金（ETH）",
      submit: "提交争议"
    },
    settleModal: {
      readyTitle: "可结算",
      readyDesc: "挑战期已结束。你可以结算该断言以确认结果并分配保证金/奖励。"
    },
    config: {
        title: "连接与同步",
        rpcUrl: "RPC URL",
        contractAddress: "合约地址",
        chain: "链",
        startBlock: "起始区块",
        maxBlockRange: "最大区块跨度",
        votingPeriodHours: "投票期（小时）",
        adminToken: "管理员 Token",
        save: "保存",
        syncNow: "立即同步",
        syncStatus: "同步状态",
        syncing: "同步中…",
        syncDuration: "耗时",
        syncError: "上次失败原因",
        lastBlock: "处理到区块",
        indexed: "已索引",
        demo: "演示数据",
        demoHint: "当前展示演示数据。填写配置并点击立即同步获取链上数据。",
        indexedHint: "已连接到链上数据，数据将自动刷新。"
      },
      stats: {
        tvs: "安全总价值",
        activeDisputes: "进行中争议",
        resolved24h: "24 小时已结算",
        avgResolution: "平均结算耗时",
        liveCap: "实时预言机市值"
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
        listView: "列表视图"
      },
      leaderboard: {
        topAsserters: "最佳断言方",
        topAssertersDesc: "最活跃的贡献者",
        topDisputers: "最佳争议方",
        topDisputersDesc: "最活跃的验证者",
        bonded: "已质押",
        noData: "暂无数据",
        assertions: "断言数",
        disputes: "争议数"
      }
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
      totalReturn: "总回报"
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
      emptyDesc: "当前系统没有活跃争议，可稍后再查看。"
    },
    status: {
      voting: "投票中",
      pendingExecution: "待执行",
      executed: "已执行"
    },
    errors: {
      unknownError: "未知错误",
      walletNotConnected: "钱包未连接",
      userRejected: "你已取消钱包请求。",
      requestPending: "钱包中已有待处理请求，请先在钱包内完成或取消。",
      chainNotAdded: "钱包未添加该网络，请先添加后再重试。",
      wrongNetwork: "网络不匹配，请切换到目标链后重试。",
      insufficientFunds: "余额不足，无法支付交易费用或转账金额。",
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
      syncFailed: "同步失败"
    }
  },
  en: {
    app: {
      title: "Insight · UMA Settlement Monitor",
      description: "Visual monitoring of UMA Optimistic Oracle disputes and settlements.",
      subtitle: "Oracle Monitor"
    },
    nav: {
      oracle: "Monitor",
      disputes: "Disputes"
    },
    common: {
      language: "Language",
      loading: "Loading…",
      comingSoon: "Coming soon",
      loadMore: "Load more",
      all: "All",
      pending: "Pending",
      disputed: "Disputed",
      resolved: "Resolved",
      openMenu: "Open Menu",
      closeMenu: "Close Menu",
      close: "Close",
      viewTx: "View TX",
      copyHash: "Copy hash",
      copied: "Copied",
      viewDetails: "View Details",
      allLoaded: "All loaded"
    },
    sidebar: {
      userWallet: "User Wallet",
      notConnected: "Not connected"
    },
    wallet: {
      connect: "Connect Wallet",
      connecting: "Connecting…",
      notFound: "Wallet Not Found",
      install: "Please install a wallet like MetaMask or Rabby!",
      connected: "Wallet Connected",
      connectedMsg: "Connected to",
      failed: "Connection Failed"
    },
    chain: {
      local: "Local",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism"
    },
    oracle: {
      title: "Oracle Monitor",
      description: "Real-time tracking of UMA Optimistic Oracle assertions and disputes.",
      newAssertion: "New Assertion",
      searchPlaceholder: "Search assertions…",
      tabs: {
        overview: "Overview",
        leaderboard: "Leaderboard",
        tools: "Tools"
      },
      charts: {
        dailyAssertions: "Daily Assertions",
        tvsCumulative: "Total Value Secured (Cumulative)",
        noData: "No chart data",
        activityDesc: "Activity over time",
        tvsDesc: "Cumulative value",
        waitingData: "Waiting for more historical data to generate activity trends."
      },
      timeline: {
        asserted: "Asserted",
        disputed: "Disputed",
        resolved: "Resolved",
        votingEnds: "Voting Ends",
        livenessEnds: "Liveness Ends",
        active: "Active"
      },
      detail: {
        title: "Assertion Detail",
        back: "Back to Overview",
        errorTitle: "Assertion Not Found",
        errorNotFound: "The assertion you are looking for does not exist or has been removed.",
        goBack: "Go Back",
        walletNotFound: "Wallet Not Found",
        installWallet: "Please install MetaMask or another Web3 wallet.",
        validationError: "Validation Error",
        reasonRequired: "Please provide a reason for the dispute.",
        submitting: "Submitting…",
        confirming: "Confirming…",
        txSent: "Transaction Sent",
        hash: "Hash",
        txFailed: "Transaction Failed",
        marketQuestion: "Market Question",
        assertedOutcome: "Asserted Outcome",
        asserter: "Asserter",
        transaction: "Transaction",
        disputeAssertion: "Dispute this Assertion",
        reasonForDispute: "Reason for Dispute",
        reasonPlaceholder: "Explain why this assertion is incorrect...",
        cancel: "Cancel",
        confirmDispute: "Confirm Dispute",
        disputeRequiresBond: "Disputing requires a bond of",
        disputeActive: "Active Dispute",
        reason: "Reason",
        support: "Support",
        against: "Against",
        votes: "votes",
        voteOnDispute: "Vote on Dispute",
        bondAmount: "Bond Amount",
        timeline: "Timeline",
        actions: "Actions",
        resolved: "Resolved",
        resolvedDesc: "This assertion has been resolved successfully.",
        settleAssertion: "Settle Assertion",
      settleDesc: "This assertion has passed the challenge period and can be settled.",
      settlementResult: "Settlement Result",
      settlementTrue: "Valid / True",
      settlementFalse: "Invalid / False"
    },
    tx: {
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
      settlementSubmittedMsg: "The assertion has been settled."
    },
    createAssertionModal: {
      protocolLabel: "Protocol",
      protocolPlaceholder: "e.g. Aave V3",
      marketLabel: "Market / ID",
      marketPlaceholder: "e.g. ETH-USDC",
      assertionLabel: "Assertion Statement",
      assertionPlaceholder: "What is the truth you are asserting?",
      bondLabel: "Bond Amount (ETH)",
      submit: "Create Assertion"
    },
    disputeModal: {
      desc: "Submitting a dispute requires a bond.",
      bondLabel: "Bond (ETH)",
      submit: "Submit Dispute"
    },
    settleModal: {
      readyTitle: "Ready to Settle",
      readyDesc: "The voting/liveness period has ended. You can now settle this assertion to resolve the outcome and distribute bonds/rewards."
    },
    config: {
        title: "Connection & Sync",
        rpcUrl: "RPC URL",
        contractAddress: "Contract Address",
        chain: "Chain",
        startBlock: "Start Block",
        maxBlockRange: "Max Block Range",
        votingPeriodHours: "Voting Period (hours)",
        adminToken: "Admin Token",
        save: "Save",
        syncNow: "Sync Now",
        syncStatus: "Sync",
        syncing: "Syncing…",
        syncDuration: "Duration",
        syncError: "Last Error",
        lastBlock: "Processed Block",
        indexed: "Indexed",
        demo: "Demo",
        demoHint: "You are viewing demo data. Fill in config and click Sync Now to load on-chain data.",
        indexedHint: "Connected to on-chain data. Data refreshes automatically."
      },
      stats: {
        tvs: "Total Value Secured",
        activeDisputes: "Active Disputes",
        resolved24h: "Resolved (24h)",
        avgResolution: "Avg Resolution Time",
        liveCap: "Live oracle market capitalization"
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
        listView: "List view"
      },
      leaderboard: {
        topAsserters: "Top Asserters",
        topAssertersDesc: "Most active contributors",
        topDisputers: "Top Disputers",
        topDisputersDesc: "Most active verifiers",
        bonded: "Bonded",
        noData: "No data available",
        assertions: "Assertions",
        disputes: "Disputes"
      }
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
      totalReturn: "Total Return"
    },
    disputes: {
      title: "Dispute Resolution",
      description: "Monitor active disputes, track voting progress, and analyze outcomes.",
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
      emptyDesc: "There are currently no active disputes in the system."
    },
    status: {
      voting: "Voting",
      pendingExecution: "Pending Execution",
      executed: "Executed"
    },
    errors: {
      unknownError: "Unknown error",
      walletNotConnected: "Wallet not connected",
      userRejected: "You rejected the wallet request.",
      requestPending: "A wallet request is already pending. Please check your wallet.",
      chainNotAdded: "This network is not added in your wallet. Please add it first.",
      wrongNetwork: "Wrong network. Please switch to the target chain.",
      insufficientFunds: "Insufficient funds to pay for gas or value.",
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
      syncFailed: "Sync failed"
    }
  },
  es: {
    app: {
      title: "Insight · Monitor de liquidación UMA",
      description: "Monitoreo visual de disputas y liquidaciones de UMA Optimistic Oracle.",
      subtitle: "Monitor de Oráculo"
    },
    nav: {
      oracle: "Monitor",
      disputes: "Disputas"
    },
    common: {
      language: "Idioma",
      loading: "Cargando…",
      comingSoon: "Próximamente",
      loadMore: "Cargar más",
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
      allLoaded: "Todo cargado"
    },
    sidebar: {
      userWallet: "Cartera de usuario",
      notConnected: "No conectado"
    },
    wallet: {
      connect: "Conectar cartera",
      connecting: "Conectando…",
      notFound: "Cartera no encontrada",
      install: "¡Por favor, instala una cartera como MetaMask o Rabby!",
      connected: "Cartera conectada",
      connectedMsg: "Conectado a",
      failed: "Conexión fallida"
    },
    chain: {
      local: "Local",
      polygon: "Polygon",
      arbitrum: "Arbitrum",
      optimism: "Optimism"
    },
    oracle: {
      title: "Monitor de Oráculo",
      description: "Seguimiento en tiempo real de afirmaciones y disputas de UMA Optimistic Oracle.",
      newAssertion: "Nueva afirmación",
      searchPlaceholder: "Buscar afirmaciones…",
      tabs: {
        overview: "Resumen",
        leaderboard: "Clasificación",
        tools: "Herramientas"
      },
      charts: {
        dailyAssertions: "Afirmaciones diarias",
        tvsCumulative: "Valor total asegurado (acumulado)",
        noData: "Sin datos de gráficos",
        activityDesc: "Actividad a lo largo del tiempo",
        tvsDesc: "Valor acumulado",
        waitingData: "Esperando más datos históricos para generar tendencias de actividad."
      },
      leaderboard: {
        topAsserters: "Mejores Afirmadores",
        topAssertersDesc: "Contribuyentes más activos",
        topDisputers: "Mejores Disputantes",
        topDisputersDesc: "Verificadores más activos",
        bonded: "En fianza",
        noData: "Sin datos disponibles",
        assertions: "Afirmaciones",
        disputes: "Disputas"
      },
      timeline: {
        asserted: "Afirmado",
        disputed: "Disputado",
        resolved: "Resuelto",
        votingEnds: "Fin de votación",
        livenessEnds: "Fin de vigencia",
        active: "Activo"
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
        settleDesc: "Esta afirmación ha pasado el período de desafío y puede ser liquidada.",
        settlementResult: "Resultado de liquidación",
        settlementTrue: "Válido / Verdadero",
        settlementFalse: "Inválido / Falso"
      },
      tx: {
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
        settlementSubmittedMsg: "La afirmación ha sido liquidada."
      },
      createAssertionModal: {
        protocolLabel: "Protocolo",
        protocolPlaceholder: "p. ej. Aave V3",
        marketLabel: "Mercado / ID",
        marketPlaceholder: "p. ej. ETH-USDC",
        assertionLabel: "Declaración de afirmación",
        assertionPlaceholder: "¿Cuál es la verdad que afirmas?",
        bondLabel: "Depósito (ETH)",
        submit: "Crear afirmación"
      },
      disputeModal: {
        desc: "Enviar una disputa requiere un depósito.",
        bondLabel: "Depósito (ETH)",
        submit: "Enviar disputa"
      },
      settleModal: {
        readyTitle: "Listo para liquidar",
        readyDesc: "El período de votación/vigencia ha terminado. Ahora puedes liquidar esta afirmación para resolver el resultado y distribuir depósitos/recompensas."
      },
      config: {
        title: "Conexión y sincronización",
        rpcUrl: "RPC URL",
        contractAddress: "Dirección del contrato",
        chain: "Cadena",
        startBlock: "Bloque inicial",
        maxBlockRange: "Rango máximo de bloques",
        votingPeriodHours: "Período de votación (horas)",
        adminToken: "Token de administrador",
        save: "Guardar",
        syncNow: "Sincronizar",
        syncStatus: "Sincronización",
        syncing: "Sincronizando…",
        syncDuration: "Duración",
        syncError: "Último error",
        lastBlock: "Bloque procesado",
        indexed: "Indexado",
        demo: "Demo",
        demoHint: "Estás viendo datos de demostración. Completa la configuración y pulsa Sincronizar.",
        indexedHint: "Conectado a datos on-chain. Los datos se actualizan automáticamente."
      },
      stats: {
        tvs: "Valor total asegurado",
        activeDisputes: "Disputas activas",
        resolved24h: "Resueltas (24h)",
        avgResolution: "Tiempo medio de resolución",
        liveCap: "Capitalización de mercado de oráculo en vivo"
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
        listView: "Vista de lista"
      }
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
      totalReturn: "Retorno Total"
    },
    disputes: {
      title: "Resolución de disputas",
      description: "Monitorea disputas activas, progreso de votación y resultados.",
      umaDvmActive: "UMA DVM Activo",
      viewOnUma: "Ver en UMA",
      reason: "Motivo de la disputa",
      disputer: "Disputante",
      disputedAt: "Disputada el",
      votingProgress: "Progreso de votación",
      endsAt: "Finaliza",
      support: "Apoyar afirmación",
      reject: "Rechazar afirmación",
      totalVotesCast: "Votos emitidos",
      emptyTitle: "No hay disputas activas",
      emptyDesc: "Actualmente no hay disputas activas en el sistema."
    },
    status: {
      voting: "Votación",
      pendingExecution: "Ejecución pendiente",
      executed: "Ejecutado"
    },
    errors: {
      unknownError: "Error desconocido",
      walletNotConnected: "Cartera no conectada",
      userRejected: "Has rechazado la solicitud de la cartera.",
      requestPending: "Ya hay una solicitud pendiente en la cartera. Revisa tu cartera.",
      chainNotAdded: "Esta red no está añadida en tu cartera. Añádela primero.",
      wrongNetwork: "Red incorrecta. Cambia a la cadena objetivo.",
      insufficientFunds: "Fondos insuficientes para pagar gas o el valor.",
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
      syncFailed: "Error de sincronización"
    }
  }
} as const;

export type TranslationKey =
  | "app.title"
  | "app.description"
  | "app.subtitle"
  | "nav.oracle"
  | "nav.disputes"
  | "common.language"
  | "common.loading"
  | "common.comingSoon"
  | "common.loadMore"
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
  | "common.allLoaded"
  | "sidebar.userWallet"
  | "sidebar.notConnected"
  | "wallet.connect"
  | "wallet.connecting"
  | "wallet.notFound"
  | "wallet.install"
  | "wallet.connected"
  | "wallet.connectedMsg"
  | "wallet.failed"
  | "chain.local"
  | "chain.polygon"
  | "chain.arbitrum"
  | "chain.optimism"
  | "oracle.title"
  | "oracle.description"
  | "oracle.newAssertion"
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
  | "oracle.charts.dailyAssertions"
  | "oracle.charts.tvsCumulative"
  | "oracle.charts.noData"
  | "oracle.charts.activityDesc"
  | "oracle.charts.tvsDesc"
  | "oracle.charts.waitingData"
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
  | "oracle.disputeModal.desc"
  | "oracle.disputeModal.bondLabel"
  | "oracle.disputeModal.submit"
  | "oracle.settleModal.readyTitle"
  | "oracle.settleModal.readyDesc"
  | "oracle.config.title"
  | "oracle.config.rpcUrl"
  | "oracle.config.contractAddress"
  | "oracle.config.chain"
  | "oracle.config.startBlock"
  | "oracle.config.maxBlockRange"
  | "oracle.config.votingPeriodHours"
  | "oracle.config.adminToken"
  | "oracle.config.save"
  | "oracle.config.syncNow"
  | "oracle.config.syncStatus"
  | "oracle.config.syncing"
  | "oracle.config.syncDuration"
  | "oracle.config.syncError"
  | "oracle.config.lastBlock"
  | "oracle.config.indexed"
  | "oracle.config.demo"
  | "oracle.config.demoHint"
  | "oracle.config.indexedHint"
  | "oracle.stats.tvs"
  | "oracle.stats.activeDisputes"
  | "oracle.stats.resolved24h"
  | "oracle.stats.avgResolution"
  | "oracle.stats.liveCap"
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
  | "errors.syncFailed";

export function getUiErrorMessage(errorCode: string, t: (key: TranslationKey) => string) {
  if (errorCode === "unknown_error") return t("errors.unknownError");
  if (errorCode.startsWith("http_")) return `${t("errors.httpError")} (${errorCode.slice(5)})`;
  if (errorCode === "invalid_json") return t("errors.invalidJson");
  if (errorCode === "api_error") return t("errors.apiError");
  if (errorCode === "invalid_api_response") return t("errors.invalidApiResponse");
  if (errorCode === "missing_config") return t("errors.missingConfig");
  if (errorCode === "invalid_rpc_url") return t("errors.invalidRpcUrl");
  if (errorCode === "invalid_contract_address") return t("errors.invalidContractAddress");
  if (errorCode === "invalid_chain") return t("errors.invalidChain");
  if (errorCode === "invalid_request_body") return t("errors.invalidRequestBody");
  if (errorCode === "forbidden") return t("errors.forbidden");
  if (errorCode === "rpc_unreachable") return t("errors.rpcUnreachable");
  if (errorCode === "contract_not_found") return t("errors.contractNotFound");
  if (errorCode === "sync_failed") return t("errors.syncFailed");
  if (errorCode === "wallet_not_connected") return t("errors.walletNotConnected");
  if (errorCode === "user_rejected") return t("errors.userRejected");
  if (errorCode === "request_pending") return t("errors.requestPending");
  if (errorCode === "chain_not_added") return t("errors.chainNotAdded");
  if (errorCode === "wrong_network") return t("errors.wrongNetwork");
  if (errorCode === "insufficient_funds") return t("errors.insufficientFunds");
  return errorCode;
}
