import {
  arbitrum,
  hardhat,
  mainnet,
  optimism,
  polygon,
  polygonAmoy,
} from "viem/chains";

export const CHAIN_CONFIG = {
  [polygon.id]: {
    name: "Polygon",
    symbol: polygon.nativeCurrency.symbol,
    explorer: "https://polygonscan.com",
  },
  [polygonAmoy.id]: {
    name: "Polygon Amoy",
    symbol: polygonAmoy.nativeCurrency.symbol,
    explorer: "https://www.oklink.com/amoy",
  },
  [arbitrum.id]: {
    name: "Arbitrum",
    symbol: arbitrum.nativeCurrency.symbol,
    explorer: "https://arbiscan.io",
  },
  [optimism.id]: {
    name: "Optimism",
    symbol: optimism.nativeCurrency.symbol,
    explorer: "https://optimistic.etherscan.io",
  },
  [hardhat.id]: {
    name: "Hardhat",
    symbol: hardhat.nativeCurrency.symbol,
    explorer: "",
  },
  [mainnet.id]: {
    name: "Ethereum",
    symbol: mainnet.nativeCurrency.symbol,
    explorer: "https://etherscan.io",
  },
} as const;

export type ChainId = keyof typeof CHAIN_CONFIG;

export function getChainConfig(chainId: number) {
  return CHAIN_CONFIG[chainId as ChainId] || CHAIN_CONFIG[mainnet.id];
}

export function getChainSymbol(chainId: number): string {
  return getChainConfig(chainId).symbol;
}

export function getChainName(chainId: number): string {
  return getChainConfig(chainId).name;
}

export function getChainExplorer(chainId: number): string {
  return getChainConfig(chainId).explorer;
}

export function isSupportedChain(chainId: number): boolean {
  return chainId in CHAIN_CONFIG;
}
