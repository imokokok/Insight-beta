export interface ProtocolHighlight {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'beta' | 'coming_soon';
  features: string[];
  category: 'price_feed' | 'optimistic' | 'hybrid';
}

export const PROTOCOLS: ProtocolHighlight[] = [
  {
    id: 'chainlink',
    name: 'Chainlink',
    description: 'Industry-standard decentralized oracle network with comprehensive data feeds',
    icon: '🔗',
    status: 'active',
    features: ['Price Feeds', 'VRF', 'Automation', 'CCIP'],
    category: 'price_feed',
  },
  {
    id: 'pyth',
    name: 'Pyth Network',
    description: 'Low-latency financial data from institutional sources',
    icon: '🐍',
    status: 'active',
    features: ['Low Latency', 'High Frequency', 'Confidence Scores'],
    category: 'price_feed',
  },
  {
    id: 'band',
    name: 'Band Protocol',
    description: 'Cross-chain data oracle platform with decentralized consensus',
    icon: '🎸',
    status: 'active',
    features: ['Cross-chain', 'Decentralized', 'Custom Data'],
    category: 'price_feed',
  },
  {
    id: 'api3',
    name: 'API3',
    description: 'First-party oracle with DAO-governed dAPIs',
    icon: '📡',
    status: 'beta',
    features: ['First-party', 'dAPIs', 'DAO Governed'],
    category: 'price_feed',
  },
  {
    id: 'redstone',
    name: 'RedStone',
    description: 'Modular oracle optimized for L2s and rollups',
    icon: '💎',
    status: 'beta',
    features: ['Modular', 'L2 Optimized', 'Cost Efficient'],
    category: 'price_feed',
  },
  {
    id: 'flux',
    name: 'Flux',
    description: 'Decentralized oracle aggregator with on-chain data verification',
    icon: '⚡',
    status: 'active',
    features: ['Aggregator', 'On-chain Verification', 'Multi-source'],
    category: 'price_feed',
  },
  {
    id: 'uma',
    name: 'UMA',
    description: 'Optimistic oracle for custom data verification and dispute resolution',
    icon: '⚖️',
    status: 'active',
    features: ['Optimistic Oracle', 'Assertions', 'Disputes'],
    category: 'optimistic',
  },
  {
    id: 'switchboard',
    name: 'Switchboard',
    description: 'Permissionless oracle network for Solana and EVM chains',
    icon: '🎛️',
    status: 'beta',
    features: ['Permissionless', 'Solana', 'EVM Compatible'],
    category: 'price_feed',
  },
];
