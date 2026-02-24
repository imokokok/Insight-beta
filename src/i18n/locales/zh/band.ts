export const band = {
  tabs: {
    overview: '概览',
    bridges: '数据桥',
    sources: '数据源',
    analysis: '数据分析',
  },
  pageDescription: '跨链预言机 - Cosmos 生态与数据桥监控',
  overview: {
    title: 'Band 协议概览',
    description: '跨链预言机网络状态摘要',
    introduction:
      'Band Protocol 是基于 Cosmos 的跨链预言机协议，通过数据桥为多链提供可靠的外部数据，支持 EVM 和 Cosmos 生态系统。',
  },
  features: {
    title: '核心特性',
    crossChain: {
      label: '跨链数据桥',
      value: '多链数据传输',
    },
    ibc: {
      label: 'IBC 协议',
      value: 'Cosmos 互操作',
    },
    validation: {
      label: '数据验证',
      value: '多源聚合验证',
    },
  },
  supportedChains: {
    title: '支持的链',
    description: 'Band Protocol 支持的区块链网络',
  },
  bridgeStatus: {
    title: '数据桥状态概览',
    total: '总数据桥',
    active: '活跃数据桥',
    inactive: '非活跃数据桥',
  },
  sourceDistribution: {
    title: '数据源分布',
    evm: 'EVM 链数据源',
    cosmos: 'Cosmos 链数据源',
  },
  bridgeList: {
    title: '数据桥列表',
    empty: '暂无数据桥信息',
    description: '显示 {{count}} 个数据桥',
  },
  cosmosSelector: {
    title: 'Cosmos 链选择器',
    description: '选择 Cosmos 生态链查看详细数据',
  },
  blockInfo: {
    title: 'Band Chain 区块信息',
    description: '最新区块状态',
    height: '区块高度',
    hash: '区块哈希',
    timestamp: '时间戳',
  },
  ibcStatus: {
    title: 'IBC 状态',
    description: '当前选中链的 IBC 连接状态',
    chainId: '选中链 ID',
    connections: 'IBC 连接数',
    activeChannels: '活跃通道',
  },
  oracleScripts: {
    error: '错误',
    empty: '暂无 Oracle 脚本',
    table: {
      name: '名称',
      description: '描述',
      status: '状态',
      avgResponse: '平均响应',
      successRate: '成功率',
      lastRequest: '最后请求',
    },
    detail: {
      scriptId: '脚本 ID',
      owner: '所有者',
      codeHash: '代码哈希',
      schema: '模式',
    },
  },
  oracleScriptTypes: {
    priceFeed: {
      name: '价格源',
      description: '获取加密货币价格数据',
    },
    weather: {
      name: '天气数据',
      description: '获取全球天气数据',
    },
    sports: {
      name: '体育结果',
      description: '获取体育比赛结果',
    },
    stocks: {
      name: '股票价格',
      description: '获取股票价格数据',
    },
  },
  dataFreshness: {
    threshold5min: '5分钟阈值',
    threshold10min: '10分钟阈值',
  },
  validatorHealth: {
    threshold85: '85%阈值',
    threshold95: '95%阈值',
  },
};
