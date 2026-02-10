/**
 * Blockchain Utilities
 *
 * 区块链相关工具函数
 */

/**
 * 获取区块链浏览器的 URL
 *
 * 支持多链：Ethereum、Polygon、Arbitrum、Optimism、Base 及其测试网
 *
 * @param chain - 链名称或链 ID
 * @param value - 交易哈希、地址或区块号
 * @param type - URL 类型：'tx' | 'address' | 'block'，默认为 'tx'
 * @returns 完整的浏览器 URL，如果链不支持返回 null
 *
 * @example
 * ```typescript
 * getExplorerUrl('ethereum', '0x123...', 'address');
 * // Returns: 'https://etherscan.io/address/0x123...'
 *
 * getExplorerUrl('137', '0xabc...', 'tx');
 * // Returns: 'https://polygonscan.com/tx/0xabc...'
 * ```
 */
export function getExplorerUrl(
  chain: string | undefined | null,
  value: string,
  type: 'tx' | 'address' | 'block' = 'tx',
): string | null {
  if (!value) return null;
  const c = chain?.toLowerCase() || '';

  let baseUrl = '';
  if (c.includes('amoy') || c === '80002') baseUrl = 'https://amoy.polygonscan.com';
  else if (c.includes('polygon') || c === '137') baseUrl = 'https://polygonscan.com';
  else if (c.includes('arbitrum') || c === '42161') baseUrl = 'https://arbiscan.io';
  else if (c.includes('optimism') || c === '10') baseUrl = 'https://optimistic.etherscan.io';
  else if (c.includes('mainnet') || c === '1') baseUrl = 'https://etherscan.io';
  else if (c.includes('base') || c === '8453') baseUrl = 'https://basescan.org';
  else return null;

  return `${baseUrl}/${type}/${value}`;
}

/**
 * 解析 RPC URL 字符串，提取有效的 HTTP/HTTPS/WebSocket URL
 *
 * @param value - 包含 RPC URL 的字符串，可以用逗号、空格或换行分隔
 * @returns 有效的 URL 数组，去重并按发现顺序排列
 *
 * @example
 * ```typescript
 * const urls = parseRpcUrls('https://rpc1.com, https://rpc2.com ws://localhost:8545');
 * // Returns: ['https://rpc1.com', 'https://rpc2.com', 'ws://localhost:8545']
 * ```
 */
export function parseRpcUrls(value: string): string[] {
  const parts = value
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    try {
      const u = new URL(p);
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol)) continue;
      if (!out.includes(p)) out.push(p);
    } catch {
      continue;
    }
  }
  return out;
}
