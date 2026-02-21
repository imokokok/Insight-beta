export type ChainId =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'bsc'
  | 'avalanche'
  | 'fantom'
  | 'celo'
  | 'gnosis'
  | 'linea'
  | 'scroll'
  | 'mantle'
  | 'mode'
  | 'blast'
  | 'solana'
  | 'near'
  | 'aptos'
  | 'sui'
  | 'polygonAmoy'
  | 'sepolia'
  | 'goerli'
  | 'mumbai'
  | 'local';

export const CHAIN_DISPLAY_NAMES: Record<ChainId, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  bsc: 'BSC',
  avalanche: 'Avalanche',
  fantom: 'Fantom',
  celo: 'Celo',
  gnosis: 'Gnosis',
  linea: 'Linea',
  scroll: 'Scroll',
  mantle: 'Mantle',
  mode: 'Mode',
  blast: 'Blast',
  solana: 'Solana',
  near: 'Near',
  aptos: 'Aptos',
  sui: 'Sui',
  polygonAmoy: 'Polygon Amoy',
  sepolia: 'Sepolia',
  goerli: 'Goerli',
  mumbai: 'Mumbai',
  local: 'Local',
};

export const CHAIN_COLORS: Record<ChainId, string> = {
  ethereum: '#627eea',
  polygon: '#8247e5',
  arbitrum: '#28a0f0',
  optimism: '#ff0420',
  base: '#0052ff',
  bsc: '#f0b90b',
  avalanche: '#e84142',
  fantom: '#1969ff',
  celo: '#35d07f',
  gnosis: '#04795b',
  linea: '#000000',
  scroll: '#ffede0',
  mantle: '#000000',
  mode: '#dffe00',
  blast: '#fcfc03',
  solana: '#14f195',
  near: '#000000',
  aptos: '#4cd9a7',
  sui: '#6fbcf0',
  polygonAmoy: '#8247e5',
  sepolia: '#627eea',
  goerli: '#627eea',
  mumbai: '#8247e5',
  local: '#627eea',
};

export const CHAIN_COLORS_TAILWIND: Record<ChainId, { bg: string; border: string; text: string }> =
  {
    ethereum: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
    polygon: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' },
    bsc: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500' },
    avalanche: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
    arbitrum: { bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-600' },
    optimism: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
    base: { bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400' },
    solana: {
      bg: 'bg-gradient-to-r from-primary-500/10 to-amber-500/10',
      border: 'border-primary/30',
      text: 'text-primary/40',
    },
    fantom: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
    celo: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' },
    gnosis: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500' },
    linea: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-500' },
    scroll: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500' },
    mantle: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-500' },
    mode: { bg: 'bg-lime-500/10', border: 'border-lime-500/30', text: 'text-lime-500' },
    blast: { bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', text: 'text-yellow-400' },
    near: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-500' },
    aptos: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-500' },
    sui: { bg: 'bg-sky-400/10', border: 'border-sky-400/30', text: 'text-sky-400' },
    polygonAmoy: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' },
    sepolia: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
    goerli: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
    mumbai: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' },
    local: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  };

export const DEFAULT_AVAILABLE_CHAINS: ChainId[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
];

export const PYTH_SUPPORTED_CHAINS: ChainId[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
];

export const API3_SUPPORTED_CHAINS: ChainId[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
];

export const CHAINLINK_SUPPORTED_CHAINS: ChainId[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
];

export function getChainDisplayName(chain: ChainId): string {
  return CHAIN_DISPLAY_NAMES[chain] ?? chain;
}

export function getChainColor(chain: ChainId): string {
  return CHAIN_COLORS[chain] ?? CHAIN_COLORS.ethereum;
}

export function getChainColorTailwind(chain: ChainId): {
  bg: string;
  border: string;
  text: string;
} {
  return CHAIN_COLORS_TAILWIND[chain] ?? CHAIN_COLORS_TAILWIND.ethereum;
}

export function isSupportedChain(chain: string): chain is ChainId {
  return chain in CHAIN_DISPLAY_NAMES;
}
