/**
 * RPC Configuration - RPC 配置管理
 *
 * 优化点：
 * 1. 所有 RPC URL 从环境变量读取
 * 2. 支持多 RPC 故障转移
 * 3. 支持 Alchemy/Infura/QuickNode 等主流服务商
 * 4. 运行时配置验证
 */

import { logger } from '@/shared/logger';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

// ============================================================================
// 环境变量读取
// ============================================================================

const env = {
  // Alchemy
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
  ALCHEMY_ETHEREUM_URL: process.env.ALCHEMY_ETHEREUM_URL,
  ALCHEMY_POLYGON_URL: process.env.ALCHEMY_POLYGON_URL,
  ALCHEMY_ARBITRUM_URL: process.env.ALCHEMY_ARBITRUM_URL,
  ALCHEMY_OPTIMISM_URL: process.env.ALCHEMY_OPTIMISM_URL,
  ALCHEMY_BASE_URL: process.env.ALCHEMY_BASE_URL,
  ALCHEMY_AVALANCHE_URL: process.env.ALCHEMY_AVALANCHE_URL,

  // Infura
  INFURA_API_KEY: process.env.INFURA_API_KEY,
  INFURA_ETHEREUM_URL: process.env.INFURA_ETHEREUM_URL,
  INFURA_POLYGON_URL: process.env.INFURA_POLYGON_URL,
  INFURA_ARBITRUM_URL: process.env.INFURA_ARBITRUM_URL,
  INFURA_OPTIMISM_URL: process.env.INFURA_OPTIMISM_URL,
  INFURA_AVALANCHE_URL: process.env.INFURA_AVALANCHE_URL,

  // QuickNode
  QUICKNODE_ETHEREUM_URL: process.env.QUICKNODE_ETHEREUM_URL,
  QUICKNODE_POLYGON_URL: process.env.QUICKNODE_POLYGON_URL,
  QUICKNODE_ARBITRUM_URL: process.env.QUICKNODE_ARBITRUM_URL,
  QUICKNODE_OPTIMISM_URL: process.env.QUICKNODE_OPTIMISM_URL,
  QUICKNODE_BASE_URL: process.env.QUICKNODE_BASE_URL,
  QUICKNODE_SOLANA_URL: process.env.QUICKNODE_SOLANA_URL,

  // 自定义 RPC
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL,
  POLYGON_RPC_URL: process.env.POLYGON_RPC_URL,
  ARBITRUM_RPC_URL: process.env.ARBITRUM_RPC_URL,
  OPTIMISM_RPC_URL: process.env.OPTIMISM_RPC_URL,
  BASE_RPC_URL: process.env.BASE_RPC_URL,
  AVALANCHE_RPC_URL: process.env.AVALANCHE_RPC_URL,
  BSC_RPC_URL: process.env.BSC_RPC_URL,
  FANTOM_RPC_URL: process.env.FANTOM_RPC_URL,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,

  // 测试网
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
  GOERLI_RPC_URL: process.env.GOERLI_RPC_URL,
  MUMBAI_RPC_URL: process.env.MUMBAI_RPC_URL,
  POLYGON_AMOY_RPC_URL: process.env.POLYGON_AMOY_RPC_URL,
};

// ============================================================================
// RPC URL 构建函数
// ============================================================================

function buildAlchemyUrl(chain: string, apiKey: string | undefined): string | undefined {
  if (!apiKey) return undefined;
  const endpoints: Record<string, string> = {
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`,
    base: `https://base-mainnet.g.alchemy.com/v2/${apiKey}`,
    avalanche: `https://avax-mainnet.g.alchemy.com/v2/${apiKey}`,
  };
  return endpoints[chain];
}

function buildInfuraUrl(chain: string, apiKey: string | undefined): string | undefined {
  if (!apiKey) return undefined;
  const endpoints: Record<string, string> = {
    ethereum: `https://mainnet.infura.io/v3/${apiKey}`,
    polygon: `https://polygon-mainnet.infura.io/v3/${apiKey}`,
    arbitrum: `https://arbitrum-mainnet.infura.io/v3/${apiKey}`,
    optimism: `https://optimism-mainnet.infura.io/v3/${apiKey}`,
    avalanche: `https://avalanche-mainnet.infura.io/v3/${apiKey}`,
  };
  return endpoints[chain];
}

// ============================================================================
// 链配置
// ============================================================================

export interface ChainRpcConfig {
  primary: string;
  fallbacks: string[];
  chainId: number;
  name: string;
  nativeCurrency: string;
  explorerUrl: string;
  isTestnet: boolean;
  supportedProtocols: string[];
}

const CHAIN_CONFIG: Record<SupportedChain, Omit<ChainRpcConfig, 'primary' | 'fallbacks'>> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    isTestnet: false,
    supportedProtocols: ['chainlink', 'pyth', 'uma', 'api3', 'band'],
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    isTestnet: false,
    supportedProtocols: ['chainlink', 'pyth', 'api3'],
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    isTestnet: false,
    supportedProtocols: ['chainlink', 'pyth', 'uma', 'api3'],
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false,
    supportedProtocols: ['chainlink', 'pyth', 'uma', 'api3'],
  },
  base: {
    chainId: 8453,
    name: 'Base',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
    supportedProtocols: ['chainlink', 'pyth'],
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://snowtrace.io',
    isTestnet: false,
    supportedProtocols: ['chainlink', 'pyth'],
  },
  bsc: {
    chainId: 56,
    name: 'BSC',
    nativeCurrency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    isTestnet: false,
    supportedProtocols: ['chainlink'],
  },
  fantom: {
    chainId: 250,
    name: 'Fantom',
    nativeCurrency: 'FTM',
    explorerUrl: 'https://ftmscan.com',
    isTestnet: false,
    supportedProtocols: ['chainlink'],
  },
  celo: {
    chainId: 42220,
    name: 'Celo',
    nativeCurrency: 'CELO',
    explorerUrl: 'https://celoscan.io',
    isTestnet: false,
    supportedProtocols: [],
  },
  gnosis: {
    chainId: 100,
    name: 'Gnosis',
    nativeCurrency: 'XDAI',
    explorerUrl: 'https://gnosisscan.io',
    isTestnet: false,
    supportedProtocols: [],
  },
  linea: {
    chainId: 59144,
    name: 'Linea',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://lineascan.build',
    isTestnet: false,
    supportedProtocols: [],
  },
  scroll: {
    chainId: 534352,
    name: 'Scroll',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://scrollscan.com',
    isTestnet: false,
    supportedProtocols: [],
  },
  mantle: {
    chainId: 5000,
    name: 'Mantle',
    nativeCurrency: 'MNT',
    explorerUrl: 'https://mantlescan.xyz',
    isTestnet: false,
    supportedProtocols: [],
  },
  mode: {
    chainId: 34443,
    name: 'Mode',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://explorer.mode.network',
    isTestnet: false,
    supportedProtocols: [],
  },
  blast: {
    chainId: 81457,
    name: 'Blast',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://blastscan.io',
    isTestnet: false,
    supportedProtocols: [],
  },
  solana: {
    chainId: 101,
    name: 'Solana',
    nativeCurrency: 'SOL',
    explorerUrl: 'https://solscan.io',
    isTestnet: false,
    supportedProtocols: ['pyth', 'switchboard'],
  },
  near: {
    chainId: 397,
    name: 'NEAR',
    nativeCurrency: 'NEAR',
    explorerUrl: 'https://explorer.near.org',
    isTestnet: false,
    supportedProtocols: [],
  },
  aptos: {
    chainId: 1,
    name: 'Aptos',
    nativeCurrency: 'APT',
    explorerUrl: 'https://explorer.aptoslabs.com',
    isTestnet: false,
    supportedProtocols: [],
  },
  sui: {
    chainId: 1,
    name: 'Sui',
    nativeCurrency: 'SUI',
    explorerUrl: 'https://suiscan.xyz',
    isTestnet: false,
    supportedProtocols: [],
  },
  polygonAmoy: {
    chainId: 80002,
    name: 'Polygon Amoy',
    nativeCurrency: 'MATIC',
    explorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true,
    supportedProtocols: [],
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
    supportedProtocols: ['chainlink'],
  },
  goerli: {
    chainId: 5,
    name: 'Goerli',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://goerli.etherscan.io',
    isTestnet: true,
    supportedProtocols: [],
  },
  mumbai: {
    chainId: 80001,
    name: 'Mumbai',
    nativeCurrency: 'MATIC',
    explorerUrl: 'https://mumbai.polygonscan.com',
    isTestnet: true,
    supportedProtocols: [],
  },
  local: {
    chainId: 31337,
    name: 'Local',
    nativeCurrency: 'ETH',
    explorerUrl: '',
    isTestnet: true,
    supportedProtocols: ['chainlink', 'uma'],
  },
};

// ============================================================================
// RPC 配置构建
// ============================================================================

function buildRpcUrls(chain: SupportedChain): { primary: string; fallbacks: string[] } {
  const urls: string[] = [];

  // 优先级 1: 自定义 RPC URL
  const customUrls: Record<SupportedChain, string | undefined> = {
    ethereum: env.ETHEREUM_RPC_URL,
    polygon: env.POLYGON_RPC_URL,
    arbitrum: env.ARBITRUM_RPC_URL,
    optimism: env.OPTIMISM_RPC_URL,
    base: env.BASE_RPC_URL,
    avalanche: env.AVALANCHE_RPC_URL,
    bsc: env.BSC_RPC_URL,
    fantom: env.FANTOM_RPC_URL,
    solana: env.SOLANA_RPC_URL,
    sepolia: env.SEPOLIA_RPC_URL,
    goerli: env.GOERLI_RPC_URL,
    mumbai: env.MUMBAI_RPC_URL,
    polygonAmoy: env.POLYGON_AMOY_RPC_URL,
    celo: undefined,
    gnosis: undefined,
    linea: undefined,
    scroll: undefined,
    mantle: undefined,
    mode: undefined,
    blast: undefined,
    near: undefined,
    aptos: undefined,
    sui: undefined,
    local: 'http://localhost:8545',
  };

  const customUrl = customUrls[chain];
  if (customUrl) {
    urls.push(customUrl);
  }

  // 优先级 2: 特定服务商 URL
  const specificUrls: Record<string, Record<string, string | undefined>> = {
    alchemy: {
      ethereum: env.ALCHEMY_ETHEREUM_URL,
      polygon: env.ALCHEMY_POLYGON_URL,
      arbitrum: env.ALCHEMY_ARBITRUM_URL,
      optimism: env.ALCHEMY_OPTIMISM_URL,
      base: env.ALCHEMY_BASE_URL,
      avalanche: env.ALCHEMY_AVALANCHE_URL,
    },
    infura: {
      ethereum: env.INFURA_ETHEREUM_URL,
      polygon: env.INFURA_POLYGON_URL,
      arbitrum: env.INFURA_ARBITRUM_URL,
      optimism: env.INFURA_OPTIMISM_URL,
      avalanche: env.INFURA_AVALANCHE_URL,
    },
    quicknode: {
      ethereum: env.QUICKNODE_ETHEREUM_URL,
      polygon: env.QUICKNODE_POLYGON_URL,
      arbitrum: env.QUICKNODE_ARBITRUM_URL,
      optimism: env.QUICKNODE_OPTIMISM_URL,
      base: env.QUICKNODE_BASE_URL,
      solana: env.QUICKNODE_SOLANA_URL,
    },
  };

  for (const provider of Object.values(specificUrls)) {
    const url = provider[chain];
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  // 优先级 3: 使用 API Key 构建 URL
  if (env.ALCHEMY_API_KEY) {
    const alchemyUrl = buildAlchemyUrl(chain, env.ALCHEMY_API_KEY);
    if (alchemyUrl && !urls.includes(alchemyUrl)) {
      urls.push(alchemyUrl);
    }
  }

  if (env.INFURA_API_KEY) {
    const infuraUrl = buildInfuraUrl(chain, env.INFURA_API_KEY);
    if (infuraUrl && !urls.includes(infuraUrl)) {
      urls.push(infuraUrl);
    }
  }

  // 返回主 URL 和备用 URL
  return {
    primary: urls[0] || '',
    fallbacks: urls.slice(1),
  };
}

// ============================================================================
// 配置导出
// ============================================================================

export function getChainRpcConfig(chain: SupportedChain): ChainRpcConfig {
  const { primary, fallbacks } = buildRpcUrls(chain);
  const baseConfig = CHAIN_CONFIG[chain];

  return {
    ...baseConfig,
    primary,
    fallbacks,
  };
}

export function getSupportedChains(): SupportedChain[] {
  return Object.keys(CHAIN_CONFIG).filter((chain) => {
    const config = getChainRpcConfig(chain as SupportedChain);
    return config.primary !== '';
  }) as SupportedChain[];
}

export function validateRpcConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const chain of Object.keys(CHAIN_CONFIG) as SupportedChain[]) {
    const config = getChainRpcConfig(chain);

    // 只检查主网链的 RPC 配置
    if (!config.isTestnet && config.primary === '') {
      errors.push(`Missing RPC URL for ${chain}`);
    }
  }

  if (errors.length > 0) {
    logger.warn('RPC configuration validation failed', { errors });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// 运行时验证
// ============================================================================

if (typeof window === 'undefined') {
  // 服务端运行时验证
  const validation = validateRpcConfig();

  if (!validation.valid) {
    logger.warn('Some RPC URLs are not configured. The following chains may not work:', {
      chains: validation.errors,
    });
  } else {
    logger.info('RPC configuration validated successfully');
  }
}
