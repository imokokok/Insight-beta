export const band = {
  tabs: {
    overview: 'Overview',
    bridges: 'Data Bridges',
    sources: 'Data Sources',
    analysis: 'Data Analysis',
  },
  pageDescription: 'Cross-chain Oracle - Cosmos Ecosystem & Data Bridge Monitoring',
  overview: {
    title: 'Band Protocol Overview',
    description: 'Cross-chain oracle network status summary',
    introduction:
      'Band Protocol is a cross-chain oracle protocol based on Cosmos, providing reliable external data to multiple chains through data bridges, supporting both EVM and Cosmos ecosystems.',
  },
  features: {
    title: 'Core Features',
    crossChain: {
      label: 'Cross-chain Data Bridge',
      value: 'Multi-chain Data Transmission',
    },
    ibc: {
      label: 'IBC Protocol',
      value: 'Cosmos Interoperability',
    },
    validation: {
      label: 'Data Validation',
      value: 'Multi-source Aggregation Verification',
    },
  },
  supportedChains: {
    title: 'Supported Chains',
    description: 'Blockchain networks supported by Band Protocol',
  },
  bridgeStatus: {
    title: 'Data Bridge Status Overview',
    total: 'Total Bridges',
    active: 'Active Bridges',
    inactive: 'Inactive Bridges',
  },
  sourceDistribution: {
    title: 'Data Source Distribution',
    evm: 'EVM Chain Sources',
    cosmos: 'Cosmos Chain Sources',
  },
  bridgeList: {
    title: 'Data Bridge List',
    empty: 'No bridge information available',
    description: 'Showing {{count}} data bridges',
  },
  cosmosSelector: {
    title: 'Cosmos Chain Selector',
    description: 'Select a Cosmos ecosystem chain to view detailed data',
  },
  blockInfo: {
    title: 'Band Chain Block Info',
    description: 'Latest block status',
    height: 'Block Height',
    hash: 'Block Hash',
    timestamp: 'Timestamp',
  },
  ibcStatus: {
    title: 'IBC Status',
    description: 'IBC connection status for selected chain',
    chainId: 'Selected Chain ID',
    connections: 'IBC Connections',
    activeChannels: 'Active Channels',
  },
  oracleScripts: {
    error: 'Error',
    empty: 'No Oracle Scripts found',
    table: {
      name: 'Name',
      description: 'Description',
      status: 'Status',
      avgResponse: 'Avg Response',
      successRate: 'Success Rate',
      lastRequest: 'Last Request',
    },
    detail: {
      scriptId: 'Script ID',
      owner: 'Owner',
      codeHash: 'Code Hash',
      schema: 'Schema',
    },
  },
  oracleScriptTypes: {
    priceFeed: {
      name: 'Price Feed',
      description: 'Get cryptocurrency price data',
    },
    weather: {
      name: 'Weather Data',
      description: 'Get global weather data',
    },
    sports: {
      name: 'Sports Results',
      description: 'Get sports match results',
    },
    stocks: {
      name: 'Stock Prices',
      description: 'Get stock price data',
    },
  },
  dataFreshness: {
    threshold5min: '5-minute threshold',
    threshold10min: '10-minute threshold',
  },
  validatorHealth: {
    threshold85: '85% threshold',
    threshold95: '95% threshold',
  },
};
