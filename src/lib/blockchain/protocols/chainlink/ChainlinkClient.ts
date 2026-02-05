/**
 * Chainlink Client - 基于 BaseOracleClient 的实现
 *
 * 使用新的抽象基类，大幅减少重复代码
 */

import { parseAbi, type Address } from 'viem';
import { BaseOracleClient } from '../../base/BaseOracleClient';
import type { SupportedChain, ChainlinkProtocolConfig } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Chainlink ABI
// ============================================================================

const AGGREGATOR_ABI = parseAbi([
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
]);

// ============================================================================
// Chainlink Client 实现
// ============================================================================

export class ChainlinkClient extends BaseOracleClient {
  private chainlinkConfig: ChainlinkProtocolConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: ChainlinkProtocolConfig = {}) {
    super(chain, rpcUrl, {
      timeout: config.timeout,
      stalenessThreshold: config.heartbeat ?? 3600,
    });
    this.chainlinkConfig = config;
  }

  protected getContractAddress(): Address | undefined {
    // 如果配置中指定了地址，使用配置的地址
    if (this.chainlinkConfig.dataFeedAddress) {
      return this.chainlinkConfig.dataFeedAddress as Address;
    }
    // 否则使用默认地址
    return CHAINLINK_CONTRACT_ADDRESSES[this.chain];
  }

  protected getFeedId(symbol: string): string | undefined {
    return CHAINLINK_FEED_IDS[symbol];
  }

  protected async fetchRawPrice(feedId: string): Promise<{
    price: bigint;
    timestamp: number;
    decimals: number;
    confidence?: number;
  } | null> {
    const contractAddress = this.getContractAddress();
    if (!contractAddress) return null;

    // 对于 Chainlink，feedId 就是合约地址
    const feedAddress = feedId as Address;

    try {
      const [roundData, decimals] = await Promise.all([
        this.publicClient.readContract({
          address: feedAddress,
          abi: AGGREGATOR_ABI,
          functionName: 'latestRoundData',
        }),
        this.publicClient.readContract({
          address: feedAddress,
          abi: AGGREGATOR_ABI,
          functionName: 'decimals',
        }),
      ]);

      return {
        price: roundData[1], // answer
        timestamp: Number(roundData[3]), // updatedAt
        decimals: Number(decimals),
        confidence: 1, // Chainlink 不提供 confidence
      };
    } catch {
      return null;
    }
  }

  public getProtocolName(): string {
    return 'Chainlink';
  }

  public getSupportedSymbols(): string[] {
    return Object.keys(CHAINLINK_FEED_IDS);
  }
}

// ============================================================================
// 配置和常量
// ============================================================================

export const CHAINLINK_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH/USD
  polygon: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  arbitrum: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
  optimism: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
  base: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
  avalanche: '0x0A77230d17318075983913bC2145DB16C7366156',
  bsc: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
  fantom: '0xf4766552D15AE4d256Ad41B6cf2933482B0680dc',
  // 其他链暂不支持
  celo: undefined,
  gnosis: undefined,
  linea: undefined,
  scroll: undefined,
  mantle: undefined,
  mode: undefined,
  blast: undefined,
  solana: undefined,
  near: undefined,
  aptos: undefined,
  sui: undefined,
  polygonAmoy: undefined,
  sepolia: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

export const CHAINLINK_FEED_IDS: Record<string, Address> = {
  'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
  'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
  'DAI/USD': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
  'USDC/USD': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
  'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
  'AAVE/USD': '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
  'UNI/USD': '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',
  'SNX/USD': '0xDC3EA94CD0AC27d9A86C180091e7f78C683d3699',
  'CRV/USD': '0xCd627aA160A6fA45Eb793D19Ef84f82ea9C28b5D',
  'MKR/USD': '0xec1D1B3b0443256cc3860e24a46F108e699484Aa',
  'COMP/USD': '0x1B39Ee86Ec5979ba5C322b826B3ECb8C79991699',
  'YFI/USD': '0xA027702dbb89f9cD2FB99E24dD33F7a9B70D5d88',
  'SUSHI/USD': '0xCc70F09A6CC17553b2E38154B7fFF9a5ebc2bF53',
  '1INCH/USD': '0xc929ad75B72593967DE83E7F25Cec9EeE77E6bE2',
};

// ============================================================================
// 工厂函数
// ============================================================================

export function createChainlinkClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: ChainlinkProtocolConfig,
): ChainlinkClient {
  return new ChainlinkClient(chain, rpcUrl, config);
}

export function isChainSupportedByChainlink(chain: SupportedChain): boolean {
  return CHAINLINK_CONTRACT_ADDRESSES[chain] !== undefined;
}

export function getSupportedChainlinkSymbols(): string[] {
  return Object.keys(CHAINLINK_FEED_IDS);
}
