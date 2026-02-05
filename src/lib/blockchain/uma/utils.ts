import type { Address } from 'viem';

export function decodeIdentifier(hex: string): string {
  if (!hex.startsWith('0x')) {
    return hex;
  }
  const matches = hex.slice(2).match(/.{1,2}/g);
  if (!matches) {
    return hex;
  }
  const bytes = Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
  return new TextDecoder().decode(bytes).replace(/\0+$/g, '');
}

export function formatIdentifier(identifier: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hex = Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return '0x' + hex.padEnd(64, '0');
}

export function formatAncillaryData(data: string): `0x${string}` {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
}

export function getRpcUrl(chainKey: string): string {
  const envKey = `UMA_${chainKey}_RPC_URL`;
  const envUrl = process.env[envKey];
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  const fallbackKey = `INSIGHT_${chainKey}_RPC_URL`;
  const fallbackUrl = process.env[fallbackKey];
  if (fallbackUrl && fallbackUrl.trim()) {
    return fallbackUrl.trim();
  }
  const defaultRpcUrls: Record<string, string> = {
    ETHEREUM: 'https://mainnet.infura.io/v3/your-infura-key',
    POLYGON: 'https://polygon-rpc.com',
    ARBITRUM: 'https://arb1.arbitrum.io/rpc',
    OPTIMISM: 'https://mainnet.optimism.io',
    POLYGON_AMOY: 'https://rpc-amoy.polygon.technology',
  };
  return defaultRpcUrls[chainKey] || 'https://ethereum.publicnode.com';
}

export function getFinderAddress(chainKey: string): Address {
  const envKey = `UMA_${chainKey}_FINDER_ADDRESS`;
  const envAddress = process.env[envKey];
  if (envAddress && /^0x[a-fA-F0-9]{40}$/.test(envAddress)) {
    return envAddress as Address;
  }
  return '0x0000000000000000000000000000000000000000' as Address;
}

export function getOOAddress(chainKey: string, version: 'v2' | 'v3'): Address | undefined {
  const envKey = `UMA_${chainKey}_OPTIMISTIC_ORACLE_${version.toUpperCase()}_ADDRESS`;
  const envAddress = process.env[envKey];
  if (envAddress && /^0x[a-fA-F0-9]{40}$/.test(envAddress)) {
    return envAddress as Address;
  }
  return undefined;
}

export const CHAIN_CONFIGS: Record<
  number,
  { name: string; key: string; ooV3?: Address; ooV2?: Address }
> = {
  1: {
    name: 'Ethereum Mainnet',
    key: 'ETHEREUM',
    ooV3: '0xA5B9d8a0B0Fa04B710D7ee40D90d2551E58d0F65',
  },
  137: {
    name: 'Polygon Mainnet',
    key: 'POLYGON',
    ooV3: '0xDd46919fE564dE5bC5Cfc966aF2B79dc5A60A73d',
  },
  42161: {
    name: 'Arbitrum One',
    key: 'ARBITRUM',
    ooV3: '0x2d0D2cB02b5eBA6e82b8277BDeF58612f650B401',
  },
  10: { name: 'Optimism', key: 'OPTIMISM', ooV3: '0x0335B4C63c688d560C24c80295a6Ca09C5eC93d4' },
  80002: { name: 'Polygon Amoy', key: 'POLYGON_AMOY' },
};
