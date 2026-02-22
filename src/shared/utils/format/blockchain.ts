/**
 * Blockchain Formatting Utilities
 *
 * 区块链相关格式化工具函数
 */

export interface FormatGasOptions {
  placeholder?: string;
  showUnit?: boolean;
}

export function formatGas(gwei: number | null | undefined, options: FormatGasOptions = {}): string {
  const { placeholder = '—', showUnit = true } = options;

  if (gwei === null || gwei === undefined || !Number.isFinite(gwei)) {
    return placeholder;
  }

  const unit = showUnit ? ' Gwei' : '';

  if (gwei >= 1_000_000_000) {
    return `${(gwei / 1_000_000_000).toFixed(2)}B${unit}`;
  }

  if (gwei >= 1_000_000) {
    return `${(gwei / 1_000_000).toFixed(2)}M${unit}`;
  }

  if (gwei >= 1_000) {
    return `${(gwei / 1_000).toFixed(0)}K${unit}`;
  }

  return `${gwei.toFixed(2)}${unit}`;
}

export interface FormatEthOptions {
  placeholder?: string;
  showUnit?: boolean;
}

export function formatEth(eth: number | null | undefined, options: FormatEthOptions = {}): string {
  const { placeholder = '—', showUnit = true } = options;

  if (eth === null || eth === undefined || !Number.isFinite(eth)) {
    return placeholder;
  }

  const unit = showUnit ? ' ETH' : '';

  if (eth >= 1) {
    return `${eth.toFixed(4)}${unit}`;
  }

  if (eth >= 0.001) {
    return `${(eth * 1000).toFixed(2)} mETH`;
  }

  return `${(eth * 1_000_000_000).toFixed(0)} Gwei`;
}

export interface FormatAddressOptions {
  start?: number;
  end?: number;
  placeholder?: string;
}

export function formatAddress(
  address: string | null | undefined,
  options: FormatAddressOptions = {},
): string {
  const { start = 6, end = 4, placeholder = '' } = options;

  if (!address) {
    return placeholder;
  }

  if (address.length < start + end) {
    return address;
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export interface FormatHashOptions {
  start?: number;
  end?: number;
  placeholder?: string;
}

export function formatHash(
  hash: string | null | undefined,
  options: FormatHashOptions = {},
): string {
  const { start = 8, end = 6, placeholder = '' } = options;

  if (!hash) {
    return placeholder;
  }

  if (hash.length < start + end) {
    return hash;
  }

  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function formatBlockNumber(blockNumber: number | null | undefined): string {
  if (blockNumber === null || blockNumber === undefined || !Number.isFinite(blockNumber)) {
    return '—';
  }

  return blockNumber.toLocaleString('en-US');
}

export function getGasStatus(gwei: number): 'low' | 'normal' | 'high' | 'very_high' {
  if (gwei < 20) return 'low';
  if (gwei < 50) return 'normal';
  if (gwei < 100) return 'high';
  return 'very_high';
}

export function getGasColor(gwei: number): string {
  if (gwei < 20) return 'text-green-500';
  if (gwei < 50) return 'text-yellow-500';
  if (gwei < 100) return 'text-orange-500';
  return 'text-red-500';
}
