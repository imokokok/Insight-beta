import { createPublicClient, http, type Address, type Hash, parseAbi, type Log } from 'viem';

import { logger } from '@/lib/logger';

import type { Chain } from 'viem/chains';

// Helper type for log args
type LogArgs = Record<string, unknown>;

// Helper function to safely get log args
function getLogArgs<T extends LogArgs>(log: Log<bigint, number, false>): T | undefined {
  return (log as unknown as { args?: T }).args;
}

export interface PolymarketConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  conditionalTokensAddress: Address;
  fpmmFactoryAddress: Address;
  oracleAddress: Address;
}

export interface Market {
  id: string;
  question: string;
  conditionId: string;
  creator: Address;
  collateralToken: Address;
  fee: bigint;
  createdAt: bigint;
  resolved: boolean;
  resolutionTime?: bigint;
  outcome?: number;
  volume: bigint;
  liquidity: bigint;
}

export interface MarketResolution {
  conditionId: string;
  resolved: boolean;
  outcome: number;
  resolutionTime: bigint;
  resolver: Address;
  txHash: Hash;
}

export interface MarketPosition {
  user: Address;
  conditionId: string;
  outcomeIndex: number;
  balance: bigint;
  value: bigint;
}

// Conditional Tokens (Gnosis) ABI
const CONDITIONAL_TOKENS_ABI = parseAbi([
  'function getConditionId(address oracle, bytes32 questionId, uint256 outcomeSlotCount) view returns (bytes32)',
  'function getOutcomeSlotCount(bytes32 conditionId) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 slot) view returns (uint256)',
  'function balanceOf(address owner, uint256 tokenId) view returns (uint256)',

  'event ConditionPreparation(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount)',
  'event ConditionResolution(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount, uint256[] payoutNumerators)',
  'event PositionSplit(address indexed stakeholder, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount)',
  'event PositionsMerge(address indexed stakeholder, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount)',
]);

// FPMM Factory ABI
const FPMM_FACTORY_ABI = parseAbi([
  'function createFixedProductMarketMaker(bytes32 conditionId, uint256 fee) external returns (address)',
  'function fixedProductMarketMakers(bytes32 conditionId) view returns (address)',

  'event FixedProductMarketMakerCreation(address indexed creator, address fixedProductMarketMaker, bytes32 indexed conditionId, address indexed collateralToken, uint256 fee)',
]);

// FPMM ABI
const FPMM_ABI = parseAbi([
  'function conditionId() view returns (bytes32)',
  'function collateralToken() view returns (address)',
  'function fee() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function poolBalances(uint256 slot) view returns (uint256)',
  'function getPoolBalances() view returns (uint256[])',
  'function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex) view returns (uint256)',
  'function calcSellAmount(uint256 returnAmount, uint256 outcomeIndex) view returns (uint256)',

  'event FPMMFundingAdded(address indexed funder, uint256[] amountsAdded, uint256 sharesMinted)',
  'event FPMMFundingRemoved(address indexed funder, uint256[] amountsRemoved, uint256 sharesBurnt)',
  'event FPMMBuy(address indexed buyer, uint256 investmentAmount, uint256 feeAmount, uint256 indexed outcomeIndex, uint256 outcomeTokensBought)',
  'event FPMMSell(address indexed seller, uint256 returnAmount, uint256 feeAmount, uint256 indexed outcomeIndex, uint256 outcomeTokensSold)',
]);

export class PolymarketMonitor {
  private publicClient: ReturnType<typeof createPublicClient>;
  private config: PolymarketConfig;

  constructor(config: PolymarketConfig) {
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
   * 获取市场创建事件
   */
  async getMarketCreationEvents(fromBlock: bigint, toBlock: bigint): Promise<Market[]> {
    try {
      const logs = await this.publicClient.getLogs({
        address: this.config.fpmmFactoryAddress,
        event: FPMM_FACTORY_ABI.find(
          (item) => item.type === 'event' && item.name === 'FixedProductMarketMakerCreation',
        ),
        fromBlock,
        toBlock,
      });

      const markets: Market[] = [];

      for (const log of logs) {
        const args = getLogArgs<{
          conditionId: `0x${string}`;
          creator: Address;
          collateralToken: Address;
          fee: bigint;
        }>(log);
        const conditionId = args?.conditionId;
        const creator = args?.creator;
        const collateralToken = args?.collateralToken;
        const fee = args?.fee;

        if (!conditionId || !creator || !collateralToken || fee === undefined) continue;

        // Get market details from FPMM
        const fpmmAddress = await this.getFPMMAddress(conditionId);
        if (fpmmAddress) {
          const volume = await this.getMarketVolume(fpmmAddress);
          const liquidity = await this.getMarketLiquidity(fpmmAddress);

          markets.push({
            id: conditionId,
            question: '', // Would need to fetch from metadata
            conditionId,
            creator,
            collateralToken,
            fee,
            createdAt: BigInt(log.blockNumber),
            resolved: false,
            volume,
            liquidity,
          });
        }
      }

      return markets;
    } catch (error) {
      logger.error('Failed to get market creation events', { error, fromBlock, toBlock });
      return [];
    }
  }

  /**
   * 获取市场解析事件
   */
  async getMarketResolutionEvents(fromBlock: bigint, toBlock: bigint): Promise<MarketResolution[]> {
    try {
      const logs = await this.publicClient.getLogs({
        address: this.config.conditionalTokensAddress,
        event: CONDITIONAL_TOKENS_ABI.find(
          (item) => item.type === 'event' && item.name === 'ConditionResolution',
        ),
        fromBlock,
        toBlock,
      });

      return logs.map((log) => {
        const args = getLogArgs<{ conditionId: `0x${string}`; payoutNumerators: bigint[] }>(log);

        // Determine outcome from payout numerators
        let outcome = 0;
        if (args?.payoutNumerators && args.payoutNumerators.length > 0) {
          // Find the index with non-zero payout
          outcome = args.payoutNumerators.findIndex((n) => n > 0n);
          if (outcome === -1) outcome = 0;
        }

        return {
          conditionId: args?.conditionId ?? '0x0',
          resolved: true,
          outcome,
          resolutionTime: BigInt(log.blockNumber),
          resolver: log.address,
          txHash: log.transactionHash as Hash,
        };
      });
    } catch (error) {
      logger.error('Failed to get market resolution events', { error, fromBlock, toBlock });
      return [];
    }
  }

  /**
   * 获取 FPMM 地址
   */
  async getFPMMAddress(conditionId: string): Promise<Address | null> {
    try {
      const address = await this.publicClient.readContract({
        address: this.config.fpmmFactoryAddress,
        abi: FPMM_FACTORY_ABI,
        functionName: 'fixedProductMarketMakers',
        args: [conditionId as `0x${string}`],
      });
      return address === '0x0000000000000000000000000000000000000000' ? null : (address as Address);
    } catch (error) {
      logger.error('Failed to get FPMM address', { error, conditionId });
      return null;
    }
  }

  /**
   * 获取市场交易量
   */
  async getMarketVolume(fpmmAddress: Address): Promise<bigint> {
    try {
      // This is a simplified version - actual implementation would need to
      // aggregate all buy/sell events
      return 0n;
    } catch (error) {
      logger.error('Failed to get market volume', { error, fpmmAddress });
      return 0n;
    }
  }

  /**
   * 获取市场流动性
   */
  async getMarketLiquidity(fpmmAddress: Address): Promise<bigint> {
    try {
      const balances = (await this.publicClient.readContract({
        address: fpmmAddress,
        abi: FPMM_ABI,
        functionName: 'getPoolBalances',
        args: [],
      })) as bigint[];

      return balances.reduce((sum, b) => sum + b, 0n);
    } catch (error) {
      logger.error('Failed to get market liquidity', { error, fpmmAddress });
      return 0n;
    }
  }

  /**
   * 获取用户持仓
   */
  async getUserPositions(user: Address, conditionId: string): Promise<MarketPosition[]> {
    try {
      // Get outcome slot count
      const slotCount = (await this.publicClient.readContract({
        address: this.config.conditionalTokensAddress,
        abi: CONDITIONAL_TOKENS_ABI,
        functionName: 'getOutcomeSlotCount',
        args: [conditionId as `0x${string}`],
      })) as bigint;

      const positions: MarketPosition[] = [];

      for (let i = 0; i < Number(slotCount); i++) {
        // Calculate position ID (simplified - actual implementation is more complex)
        const positionId = BigInt(conditionId) + BigInt(i);

        const balance = (await this.publicClient.readContract({
          address: this.config.conditionalTokensAddress,
          abi: CONDITIONAL_TOKENS_ABI,
          functionName: 'balanceOf',
          args: [user, positionId],
        })) as bigint;

        if (balance > 0n) {
          positions.push({
            user,
            conditionId,
            outcomeIndex: i,
            balance,
            value: balance, // Would need to calculate actual value
          });
        }
      }

      return positions;
    } catch (error) {
      logger.error('Failed to get user positions', { error, user, conditionId });
      return [];
    }
  }

  /**
   * 检查市场是否已解析
   */
  async isMarketResolved(conditionId: string): Promise<boolean> {
    try {
      const payoutDenominator = (await this.publicClient.readContract({
        address: this.config.conditionalTokensAddress,
        abi: CONDITIONAL_TOKENS_ABI,
        functionName: 'payoutDenominator',
        args: [conditionId as `0x${string}`],
      })) as bigint;

      return payoutDenominator > 0n;
    } catch (error) {
      logger.error('Failed to check market resolution', { error, conditionId });
      return false;
    }
  }

  /**
   * 获取市场结果
   */
  async getMarketOutcome(conditionId: string): Promise<number | null> {
    try {
      const isResolved = await this.isMarketResolved(conditionId);
      if (!isResolved) return null;

      const slotCount = (await this.publicClient.readContract({
        address: this.config.conditionalTokensAddress,
        abi: CONDITIONAL_TOKENS_ABI,
        functionName: 'getOutcomeSlotCount',
        args: [conditionId as `0x${string}`],
      })) as bigint;

      for (let i = 0; i < Number(slotCount); i++) {
        const numerator = (await this.publicClient.readContract({
          address: this.config.conditionalTokensAddress,
          abi: CONDITIONAL_TOKENS_ABI,
          functionName: 'payoutNumerators',
          args: [conditionId as `0x${string}`, BigInt(i)],
        })) as bigint;

        if (numerator > 0n) {
          return i;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get market outcome', { error, conditionId });
      return null;
    }
  }
}

// Polymarket 合约配置
export const POLYMARKET_CONFIGS: Record<number, Partial<PolymarketConfig>> = {
  137: {
    // Polygon Mainnet
    chainName: 'Polygon',
    conditionalTokensAddress: '0x4D97DCd97eC945f40cF65F87097CCe5AbD869DE8',
    fpmmFactoryAddress: '0x9083A2B699C0a4AD06F63580BDE2635d26a3eeF0',
    oracleAddress: '0x40A5b6D8434D4f27D30DB98f6D1CD66bD3B5e2b8', // UMA Optimistic Oracle
  },
};

export function createPolymarketMonitor(
  chainId: number,
  rpcUrl: string,
  customConfig?: Partial<PolymarketConfig>,
): PolymarketMonitor {
  const config = POLYMARKET_CONFIGS[chainId];
  if (!config && !customConfig) {
    throw new Error(`Unsupported chain ID for Polymarket monitoring: ${chainId}`);
  }

  return new PolymarketMonitor({
    chainId,
    chainName: config?.chainName || `Chain ${chainId}`,
    rpcUrl,
    conditionalTokensAddress:
      customConfig?.conditionalTokensAddress || config?.conditionalTokensAddress || '0x0',
    fpmmFactoryAddress: customConfig?.fpmmFactoryAddress || config?.fpmmFactoryAddress || '0x0',
    oracleAddress: customConfig?.oracleAddress || config?.oracleAddress || '0x0',
  });
}
