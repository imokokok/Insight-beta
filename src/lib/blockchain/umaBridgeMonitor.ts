import { createPublicClient, http, type Address, type Hash, parseAbi } from 'viem';
import type { Chain } from 'viem/chains';
import { logger } from '@/lib/logger';

export interface BridgeConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  bridgeAddress: Address;
  supportedChains: number[];
}

export interface BridgeMessage {
  messageId: string;
  sender: Address;
  target: Address;
  targetChainId: number;
  payload: string;
  value: bigint;
  status: 'pending' | 'delivered' | 'failed';
  timestamp: number;
  blockNumber: bigint;
  txHash: Hash;
}

export interface BridgeStats {
  chainId: number;
  totalMessages: number;
  pendingMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  totalValue: bigint;
  averageDeliveryTime: number;
}

// 简化的跨链桥 ABI
const BRIDGE_ABI = parseAbi([
  'function sendMessage(uint256 targetChainId, address target, bytes calldata payload) external payable returns (bytes32)',
  'function getMessageStatus(bytes32 messageId) view returns (uint8)',
  'function getMessageDetails(bytes32 messageId) view returns (address sender, address target, uint256 targetChainId, bytes memory payload, uint256 value, uint8 status)',

  'event MessageSent(bytes32 indexed messageId, address indexed sender, uint256 indexed targetChainId, address target, bytes payload, uint256 value)',
  'event MessageDelivered(bytes32 indexed messageId, address indexed sender, uint256 indexed targetChainId, bool success)',
  'event MessageFailed(bytes32 indexed messageId, address indexed sender, uint256 indexed targetChainId, string reason)',
]);

export class UMABridgeMonitor {
  private publicClient: ReturnType<typeof createPublicClient>;
  private config: BridgeConfig;

  constructor(config: BridgeConfig) {
    this.config = config;

    const chain: Chain = {
      id: config.chainId,
      name: config.chainName,
      rpcUrls: {
        default: { http: [config.rpcUrl] },
      },
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    };

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl, { timeout: 30_000 }),
    });
  }

  /**
   * 获取跨链消息事件
   */
  async getBridgeEvents(
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<{
    sent: BridgeMessage[];
    delivered: Array<{ messageId: string; success: boolean; blockNumber: bigint; txHash: Hash }>;
    failed: Array<{ messageId: string; reason: string; blockNumber: bigint; txHash: Hash }>;
  }> {
    try {
      const [sentLogs, deliveredLogs, failedLogs] = await Promise.all([
        this.publicClient.getLogs({
          address: this.config.bridgeAddress,
          event: BRIDGE_ABI.find((item) => item.type === 'event' && item.name === 'MessageSent'),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.bridgeAddress,
          event: BRIDGE_ABI.find(
            (item) => item.type === 'event' && item.name === 'MessageDelivered',
          ),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.bridgeAddress,
          event: BRIDGE_ABI.find((item) => item.type === 'event' && item.name === 'MessageFailed'),
          fromBlock,
          toBlock,
        }),
      ]);

      return {
        sent: sentLogs.map((log) => ({
          messageId: (log.args as { messageId: `0x${string}` }).messageId,
          sender: (log.args as { sender: Address }).sender,
          target: (log.args as { target: Address }).target,
          targetChainId: Number((log.args as { targetChainId: bigint }).targetChainId),
          payload: (log.args as { payload: string }).payload,
          value: (log.args as { value: bigint }).value,
          status: 'pending' as const,
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
        delivered: deliveredLogs.map((log) => ({
          messageId: (log.args as { messageId: `0x${string}` }).messageId,
          success: (log.args as { success: boolean }).success,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
        failed: failedLogs.map((log) => ({
          messageId: (log.args as { messageId: `0x${string}` }).messageId,
          reason: (log.args as { reason: string }).reason,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
      };
    } catch (error) {
      logger.error('Failed to get bridge events', { error, fromBlock, toBlock });
      return { sent: [], delivered: [], failed: [] };
    }
  }

  /**
   * 获取消息状态
   */
  async getMessageStatus(messageId: string): Promise<number> {
    try {
      const status = await this.publicClient.readContract({
        address: this.config.bridgeAddress,
        abi: BRIDGE_ABI,
        functionName: 'getMessageStatus',
        args: [messageId as `0x${string}`],
      });
      return Number(status);
    } catch (error) {
      logger.error('Failed to get message status', { error, messageId });
      return -1;
    }
  }

  /**
   * 获取消息详情
   */
  async getMessageDetails(messageId: string): Promise<Partial<BridgeMessage> | null> {
    try {
      const details = (await this.publicClient.readContract({
        address: this.config.bridgeAddress,
        abi: BRIDGE_ABI,
        functionName: 'getMessageDetails',
        args: [messageId as `0x${string}`],
      })) as [Address, Address, bigint, string, bigint, number];

      return {
        messageId,
        sender: details[0],
        target: details[1],
        targetChainId: Number(details[2]),
        payload: details[3],
        value: details[4],
      };
    } catch (error) {
      logger.error('Failed to get message details', { error, messageId });
      return null;
    }
  }
}

// 跨链桥配置（示例地址，需要替换为实际地址）
export const BRIDGE_CONFIGS: Record<number, Partial<BridgeConfig>> = {
  1: {
    chainName: 'Ethereum Mainnet',
    bridgeAddress: '0x0000000000000000000000000000000000000000', // Replace with actual address
    supportedChains: [137, 42161, 10],
  },
  137: {
    chainName: 'Polygon',
    bridgeAddress: '0x0000000000000000000000000000000000000000',
    supportedChains: [1, 42161],
  },
  42161: {
    chainName: 'Arbitrum One',
    bridgeAddress: '0x0000000000000000000000000000000000000000',
    supportedChains: [1, 137],
  },
};

export function createBridgeMonitor(
  chainId: number,
  rpcUrl: string,
  customConfig?: Partial<BridgeConfig>,
): UMABridgeMonitor {
  const config = BRIDGE_CONFIGS[chainId];
  if (!config && !customConfig) {
    throw new Error(`Unsupported chain ID for bridge monitoring: ${chainId}`);
  }

  return new UMABridgeMonitor({
    chainId,
    chainName: config?.chainName || `Chain ${chainId}`,
    rpcUrl,
    bridgeAddress: customConfig?.bridgeAddress || config?.bridgeAddress || '0x0',
    supportedChains: customConfig?.supportedChains || config?.supportedChains || [],
  });
}
