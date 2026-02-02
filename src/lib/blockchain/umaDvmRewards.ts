import { createPublicClient, http, type Address, type Hash, parseAbi, type Log } from 'viem';
import type { Chain } from 'viem/chains';
import { logger } from '@/lib/logger';

// Helper type for log args
type LogArgs = Record<string, unknown>;

// Helper function to safely get log args
function getLogArgs<T extends LogArgs>(log: Log<bigint, number, false>): T | undefined {
  return (log as unknown as { args?: T }).args;
}

export interface DVMRewardConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  dvmAddress: Address;
  votingTokenAddress: Address;
  governorAddress?: Address;
}

export interface VoterReward {
  voter: Address;
  assertionId: string;
  voteRound: bigint;
  rewardAmount: bigint;
  claimed: boolean;
  claimDeadline: bigint;
}

export interface SlashingEvent {
  voter: Address;
  assertionId: string;
  slashAmount: bigint;
  reason: string;
  timestamp: bigint;
  txHash: Hash;
}

export interface StakingPosition {
  voter: Address;
  stakedAmount: bigint;
  pendingRewards: bigint;
  lastUpdateTime: bigint;
  cooldownEnd?: bigint;
}

export interface RewardPool {
  totalStaked: bigint;
  totalRewards: bigint;
  rewardRate: bigint;
  lastUpdateTime: bigint;
}

// DVM 合约 ABI - 奖励相关
const DVM_REWARDS_ABI = parseAbi([
  // 奖励相关函数
  'function getReward(address voter, bytes32 assertionId) view returns (uint256)',
  'function claimReward(bytes32 assertionId) external returns (uint256)',
  'function batchClaimRewards(bytes32[] calldata assertionIds) external returns (uint256)',
  'function getPendingRewards(address voter) view returns (uint256)',

  // 质押相关函数
  'function stake(uint256 amount) external',
  'function withdraw(uint256 amount) external',
  'function getStake(address voter) view returns (uint256)',
  'function getCooldown(address voter) view returns (uint256)',

  // 惩罚相关函数 - 使用简单类型避免 parseAbi 限制
  'function getSlashingHistory(address voter) view returns (bytes32[] memory, uint256[] memory, uint256[] memory, string[] memory)',
  'function wasSlashed(address voter, bytes32 assertionId) view returns (bool)',

  // 事件
  'event RewardClaimed(address indexed voter, bytes32 indexed assertionId, uint256 amount)',
  'event Staked(address indexed voter, uint256 amount)',
  'event Withdrawn(address indexed voter, uint256 amount)',
  'event VoterSlashed(address indexed voter, bytes32 indexed assertionId, uint256 amount, string reason)',
  'event RewardRateUpdated(uint256 newRate)',
]);

// UMA 投票代币 ABI
const UMA_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

export class DVMRewardsClient {
  private publicClient: ReturnType<typeof createPublicClient>;
  private config: DVMRewardConfig;

  constructor(config: DVMRewardConfig) {
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
   * 获取投票者的奖励
   */
  async getVoterReward(voter: Address, assertionId: string): Promise<bigint> {
    try {
      const reward = await this.publicClient.readContract({
        address: this.config.dvmAddress,
        abi: DVM_REWARDS_ABI,
        functionName: 'getReward',
        args: [voter, assertionId as `0x${string}`],
      });
      return reward as bigint;
    } catch (error) {
      logger.error('Failed to get voter reward', { error, voter, assertionId });
      return 0n;
    }
  }

  /**
   * 获取投票者的待领取奖励
   */
  async getPendingRewards(voter: Address): Promise<bigint> {
    try {
      const rewards = await this.publicClient.readContract({
        address: this.config.dvmAddress,
        abi: DVM_REWARDS_ABI,
        functionName: 'getPendingRewards',
        args: [voter],
      });
      return rewards as bigint;
    } catch (error) {
      logger.error('Failed to get pending rewards', { error, voter });
      return 0n;
    }
  }

  /**
   * 获取投票者的质押金额
   */
  async getStakedAmount(voter: Address): Promise<bigint> {
    try {
      const stake = await this.publicClient.readContract({
        address: this.config.dvmAddress,
        abi: DVM_REWARDS_ABI,
        functionName: 'getStake',
        args: [voter],
      });
      return stake as bigint;
    } catch (error) {
      logger.error('Failed to get staked amount', { error, voter });
      return 0n;
    }
  }

  /**
   * 获取投票者的冷却期结束时间
   */
  async getCooldownEnd(voter: Address): Promise<bigint> {
    try {
      const cooldown = await this.publicClient.readContract({
        address: this.config.dvmAddress,
        abi: DVM_REWARDS_ABI,
        functionName: 'getCooldown',
        args: [voter],
      });
      return cooldown as bigint;
    } catch (error) {
      logger.error('Failed to get cooldown end', { error, voter });
      return 0n;
    }
  }

  /**
   * 获取投票者的惩罚历史
   */
  async getSlashingHistory(voter: Address): Promise<SlashingEvent[]> {
    try {
      const result = (await this.publicClient.readContract({
        address: this.config.dvmAddress,
        abi: DVM_REWARDS_ABI,
        functionName: 'getSlashingHistory',
        args: [voter],
      })) as readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly string[]];

      const [assertionIds, amounts, timestamps, reasons] = result;

      return assertionIds.map((assertionId, index) => ({
        voter,
        assertionId,
        slashAmount: amounts[index] ?? 0n,
        reason: reasons[index] ?? '',
        timestamp: timestamps[index] ?? 0n,
        txHash: '0x0' as Hash, // 需要从事件中获取
      }));
    } catch (error) {
      logger.error('Failed to get slashing history', { error, voter });
      return [];
    }
  }

  /**
   * 检查投票者是否被惩罚
   */
  async wasSlashed(voter: Address, assertionId: string): Promise<boolean> {
    try {
      const slashed = await this.publicClient.readContract({
        address: this.config.dvmAddress,
        abi: DVM_REWARDS_ABI,
        functionName: 'wasSlashed',
        args: [voter, assertionId as `0x${string}`],
      });
      return slashed as boolean;
    } catch (error) {
      logger.error('Failed to check if slashed', { error, voter, assertionId });
      return false;
    }
  }

  /**
   * 获取 UMA 代币余额
   */
  async getTokenBalance(address: Address): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.config.votingTokenAddress,
        abi: UMA_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      return balance as bigint;
    } catch (error) {
      logger.error('Failed to get token balance', { error, address });
      return 0n;
    }
  }

  /**
   * 获取奖励相关事件日志
   */
  async getRewardEvents(
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<{
    claimed: Array<{
      voter: Address;
      assertionId: string;
      amount: bigint;
      blockNumber: bigint;
      txHash: Hash;
    }>;
    staked: Array<{ voter: Address; amount: bigint; blockNumber: bigint; txHash: Hash }>;
    withdrawn: Array<{ voter: Address; amount: bigint; blockNumber: bigint; txHash: Hash }>;
    slashed: Array<{
      voter: Address;
      assertionId: string;
      amount: bigint;
      reason: string;
      blockNumber: bigint;
      txHash: Hash;
    }>;
  }> {
    try {
      const [claimedLogs, stakedLogs, withdrawnLogs, slashedLogs] = await Promise.all([
        this.publicClient.getLogs({
          address: this.config.dvmAddress,
          event: DVM_REWARDS_ABI.find(
            (item) => item.type === 'event' && item.name === 'RewardClaimed',
          ),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.dvmAddress,
          event: DVM_REWARDS_ABI.find((item) => item.type === 'event' && item.name === 'Staked'),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.dvmAddress,
          event: DVM_REWARDS_ABI.find((item) => item.type === 'event' && item.name === 'Withdrawn'),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.dvmAddress,
          event: DVM_REWARDS_ABI.find(
            (item) => item.type === 'event' && item.name === 'VoterSlashed',
          ),
          fromBlock,
          toBlock,
        }),
      ]);

      return {
        claimed: claimedLogs.map((log) => {
          const args = getLogArgs<{ voter: Address; assertionId: `0x${string}`; amount: bigint }>(
            log,
          );
          return {
            voter: args?.voter ?? '0x0',
            assertionId: args?.assertionId ?? '0x0',
            amount: args?.amount ?? 0n,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash as Hash,
          };
        }),
        staked: stakedLogs.map((log) => {
          const args = getLogArgs<{ voter: Address; amount: bigint }>(log);
          return {
            voter: args?.voter ?? '0x0',
            amount: args?.amount ?? 0n,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash as Hash,
          };
        }),
        withdrawn: withdrawnLogs.map((log) => {
          const args = getLogArgs<{ voter: Address; amount: bigint }>(log);
          return {
            voter: args?.voter ?? '0x0',
            amount: args?.amount ?? 0n,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash as Hash,
          };
        }),
        slashed: slashedLogs.map((log) => {
          const args = getLogArgs<{
            voter: Address;
            assertionId: `0x${string}`;
            amount: bigint;
            reason: string;
          }>(log);
          return {
            voter: args?.voter ?? '0x0',
            assertionId: args?.assertionId ?? '0x0',
            amount: args?.amount ?? 0n,
            reason: args?.reason ?? '',
            blockNumber: log.blockNumber,
            txHash: log.transactionHash as Hash,
          };
        }),
      };
    } catch (error) {
      logger.error('Failed to get reward events', { error, fromBlock, toBlock });
      return { claimed: [], staked: [], withdrawn: [], slashed: [] };
    }
  }
}

// DVM 合约地址配置
export const DVM_CONTRACT_ADDRESSES: Record<number, { dvm: Address; votingToken: Address }> = {
  1: {
    // Ethereum Mainnet
    dvm: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingToken: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828', // UMA Token
  },
  137: {
    // Polygon
    dvm: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingToken: '0x3066818837c5e6eD6601bd5a91B0762877A6B731', // UMA on Polygon
  },
  42161: {
    // Arbitrum
    dvm: '0xD2C6eB7528Eb6A04F33C4E52dE1F0D3fE32aEf55',
    votingToken: '0xd693Ec944A85eeca4247eC1c3b130DCa9B0C3b22', // UMA on Arbitrum
  },
};

export function createDVMRewardsClient(
  chainId: number,
  rpcUrl: string,
  customAddresses?: { dvm?: Address; votingToken?: Address },
): DVMRewardsClient {
  const addresses = DVM_CONTRACT_ADDRESSES[chainId];
  if (!addresses && !customAddresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const chainNames: Record<number, string> = {
    1: 'Ethereum Mainnet',
    137: 'Polygon',
    42161: 'Arbitrum One',
    10: 'Optimism',
    8453: 'Base',
    11155111: 'Sepolia',
    80002: 'Polygon Amoy',
  };

  const dvmAddress = customAddresses?.dvm ?? addresses?.dvm;
  const votingTokenAddress = customAddresses?.votingToken ?? addresses?.votingToken;

  if (!dvmAddress || !votingTokenAddress) {
    throw new Error(`Missing contract addresses for chain ID: ${chainId}`);
  }

  return new DVMRewardsClient({
    chainId,
    chainName: chainNames[chainId] || `Chain ${chainId}`,
    rpcUrl,
    dvmAddress,
    votingTokenAddress,
  });
}
