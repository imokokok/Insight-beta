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
      viewTx: "查看交易",
      allLoaded: "已加载全部"
    },
    sidebar: {
      userWallet: "用户钱包",
      notConnected: "未连接"
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
        noData: "暂无图表数据"
      },
      timeline: {
        asserted: "已断言",
        disputed: "已争议",
        resolved: "已结算",
        votingEnds: "投票截止",
        livenessEnds: "挑战期结束"
      },
      detail: {
        back: "返回监控台",
        title: "断言详情",
        marketQuestion: "市场问题",
        assertedOutcome: "断言结果",
        asserter: "断言发起方",
        transaction: "交易",
        bondAmount: "保证金",
        confirming: "确认中…",
        disputeAssertion: "发起争议",
        disputeRequiresBond: "发起争议需要保证金",
        disputeActive: "争议进行中",
        reason: "原因",
        support: "支持",
        against: "反对",
        voteOnDispute: "参与投票",
        errorTitle: "加载断言失败",
        errorNotFound: "未找到该断言",
        goBack: "返回",
        walletNotFound: "未检测到钱包",
        installWallet: "请安装 MetaMask 等钱包后再试",
        txSent: "交易已发送",
        txFailed: "交易失败",
        hash: "哈希",
        votes: "票",
        reasonForDispute: "争议原因",
        reasonPlaceholder: "请详细描述为何该断言不正确...",
        validationError: "验证错误",
        reasonRequired: "请输入争议原因",
        cancel: "取消",
        confirmDispute: "确认争议"
      },
      config: {
        title: "连接与同步",
        rpcUrl: "RPC URL",
        contractAddress: "合约地址",
        chain: "链",
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
        avgResolution: "平均结算耗时"
      },
      card: {
        marketQuestion: "市场问题",
        assertion: "断言",
        asserter: "断言发起方",
        disputer: "争议发起方",
        tx: "交易",
        bond: "保证金",
        livenessEnds: "挑战期结束"
      }
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
      viewTx: "View TX",
      allLoaded: "All loaded"
    },
    sidebar: {
      userWallet: "User Wallet",
      notConnected: "Not connected"
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
        noData: "No chart data"
      },
      timeline: {
        asserted: "Asserted",
        disputed: "Disputed",
        resolved: "Resolved",
        votingEnds: "Voting Ends",
        livenessEnds: "Liveness Ends"
      },
      detail: {
        back: "Back to Monitor",
        title: "Assertion Details",
        marketQuestion: "Market Question",
        assertedOutcome: "Asserted Outcome",
        asserter: "Asserter",
        transaction: "Transaction",
        bondAmount: "Bond Amount",
        confirming: "Confirming…",
        disputeAssertion: "Dispute Assertion",
        disputeRequiresBond: "Disputing requires a bond of",
        disputeActive: "Dispute Active",
        reason: "Reason",
        support: "Support",
        against: "Against",
        voteOnDispute: "Vote on Dispute",
        errorTitle: "Error Loading Assertion",
        errorNotFound: "Assertion not found",
        goBack: "Go Back",
        walletNotFound: "Wallet not found",
        installWallet: "Please install a wallet like MetaMask!",
        txSent: "Transaction sent",
        txFailed: "Transaction failed",
        hash: "Hash",
        votes: "votes"
      },
      config: {
        title: "Connection & Sync",
        rpcUrl: "RPC URL",
        contractAddress: "Contract Address",
        chain: "Chain",
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
        avgResolution: "Avg Resolution Time"
      },
      card: {
        marketQuestion: "Market Question",
        assertion: "Assertion",
        asserter: "Asserter",
        disputer: "Disputer",
        tx: "Transaction",
        bond: "Bond",
        livenessEnds: "Liveness Ends"
      }
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
      viewTx: "Ver TX",
      allLoaded: "Todo cargado"
    },
    sidebar: {
      userWallet: "Cartera de usuario",
      notConnected: "No conectado"
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
        noData: "Sin datos de gráficos"
      },
      timeline: {
        asserted: "Afirmado",
        disputed: "Disputado",
        resolved: "Resuelto",
        votingEnds: "Fin de votación",
        livenessEnds: "Fin de vigencia"
      },
      detail: {
        back: "Volver al monitor",
        title: "Detalles de la afirmación",
        marketQuestion: "Pregunta del mercado",
        assertedOutcome: "Resultado afirmado",
        asserter: "Afirmador",
        transaction: "Transacción",
        bondAmount: "Depósito",
        confirming: "Confirmando…",
        disputeAssertion: "Disputar afirmación",
        disputeRequiresBond: "Disputar requiere un depósito de",
        disputeActive: "Disputa activa",
        reason: "Motivo",
        support: "A favor",
        against: "En contra",
        voteOnDispute: "Votar en la disputa",
        errorTitle: "Error al cargar la afirmación",
        errorNotFound: "Afirmación no encontrada",
        goBack: "Volver",
        walletNotFound: "Cartera no encontrada",
        installWallet: "Instala una cartera como MetaMask",
        txSent: "Transacción enviada",
        txFailed: "Transacción fallida",
        hash: "Hash",
        votes: "votos"
      },
      config: {
        title: "Conexión y sincronización",
        rpcUrl: "RPC URL",
        contractAddress: "Dirección del contrato",
        chain: "Cadena",
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
        avgResolution: "Tiempo medio de resolución"
      },
      card: {
        marketQuestion: "Pregunta del mercado",
        assertion: "Afirmación",
        asserter: "Afirmador",
        disputer: "Disputante",
        tx: "Transacción",
        bond: "Depósito",
        livenessEnds: "Fin de vigencia"
      }
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
  | "common.viewTx"
  | "common.allLoaded"
  | "sidebar.userWallet"
  | "sidebar.notConnected"
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
  | "oracle.charts.dailyAssertions"
  | "oracle.charts.tvsCumulative"
  | "oracle.charts.noData"
  | "oracle.timeline.asserted"
  | "oracle.timeline.disputed"
  | "oracle.timeline.resolved"
  | "oracle.timeline.votingEnds"
  | "oracle.timeline.livenessEnds"
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
  | "oracle.detail.cancel"
  | "oracle.detail.confirmDispute"
  | "oracle.config.title"
  | "oracle.config.rpcUrl"
  | "oracle.config.contractAddress"
  | "oracle.config.chain"
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
  | "oracle.card.marketQuestion"
  | "oracle.card.assertion"
  | "oracle.card.asserter"
  | "oracle.card.disputer"
  | "oracle.card.tx"
  | "oracle.card.bond"
  | "oracle.card.livenessEnds"
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
  return errorCode;
}
