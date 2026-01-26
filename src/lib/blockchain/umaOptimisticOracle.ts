import { createPublicClient, http, type Address, type Hash } from 'viem';
import type { Chain, PublicClient, WalletClient } from 'viem';

export interface UMAOracleConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  optimisticOracleV2Address?: Address;
  optimisticOracleV3Address?: Address;
  ooV3KpiAddress?: Address;
  finderAddress: Address;
  defaultCurrency?: Address;
  defaultIdentifier: string;
}

export interface UMAMarket {
  identifier: string;
  AncillaryData?: string;
  requestTimestamp: bigint;
  proposePrice: bigint;
  proposeBond: bigint;
  liveness: bigint;
  state: UMAOracleState;
}

export type UMAOracleState =
  | 'Invalid'
  | 'Requested'
  | 'Proposed'
  | 'Expired'
  | 'Disputed'
  | 'Resolved'
  | 'Settled';

export interface UMAPriceRequest {
  identifier: string;
  timestamp: bigint;
  ancillaryData: string;
  currency: Address;
  reward: bigint;
  finalFee: bigint;
  bond: bigint;
  customLiveness: bigint;
}

export interface UMAAssertion {
  assertionId: Hash;
  claim: string;
  asserter: Address;
  callbackContract: Address;
  escalateManually: boolean;
  expirationTime: bigint;
  currency: Address;
  disputeSolver: Address;
  noDataPresent: boolean;
}

export interface UMADispute {
  assertionId: Hash;
  disputer: Address;
  requestTimestamp: bigint;
  identifier: string;
  ancillaryData: string;
  proposedValue: bigint;
  disputeTimestamp: bigint;
  settlementResolution: boolean;
}

export interface UMASlashingLibrary {
  maximumTranche: () => Promise<bigint>;
  tranches: (index: bigint) => Promise<{
    startTime: bigint;
    observedSlash: bigint;
    correctSlash: bigint;
  }>;
  recordEpochSlashForWallet: (wallet: Address, epoch: bigint, amount: bigint) => Promise<Hash>;
}

export const UMA_OPTIMISTIC_ORACLE_V2_ABI = [
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
      { name: 'currency', type: 'address' },
      { name: 'reward', type: 'uint256' },
      { name: 'finalFee', type: 'uint256' },
      { name: 'bond', type: 'uint256' },
      { name: 'customLiveness', type: 'uint256' },
      { name: 'proposer', type: 'address' },
      { name: 'callbackContract', type: 'address' },
      { name: 'escalateManually', type: 'bool' },
      { name: 'extraData', type: 'bytes' },
    ],
    name: 'proposePrice',
    outputs: [{ name: 'totalBond', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'disputePrice',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'settle',
    outputs: [
      { name: 'price', type: 'int256' },
      { name: 'settledAt', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'getRequest',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'requestState', type: 'uint8' },
          { name: 'currency', type: 'address' },
          { name: 'reward', type: 'uint256' },
          { name: 'finalFee', type: 'uint256' },
          { name: 'proposer', type: 'address' },
          { name: 'disputer', type: 'address' },
          { name: 'proposedPrice', type: 'int256' },
          { name: 'settledPrice', type: 'int256' },
          { name: 'proposalExpirationTimestamp', type: 'uint256' },
          { name: 'disputeTimestamp', type: 'uint256' },
          { name: 'settlementTimestamp', type: 'uint256' },
          { name: 'bond', type: 'uint256' },
          { name: 'customLiveness', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'identifier', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ancillaryData', type: 'bytes' },
    ],
    name: 'hasPrice',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'identifierWhitelist',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const UMA_OPTIMISTIC_ORACLE_V3_ABI = [
  {
    inputs: [
      { name: 'claim', type: 'string' },
      { name: 'currency', type: 'address' },
      { name: 'bond', type: 'uint256' },
      { name: 'identifier', type: 'bytes32' },
      { name: 'escalateManually', type: 'bool' },
      { name: 'extraData', type: 'bytes' },
    ],
    name: 'assertTruth',
    outputs: [{ name: 'assertionId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'settleAssertion',
    outputs: [
      { name: 'resolved', type: 'bool' },
      { name: 'settledValue', type: 'bool' },
      { name: 'anchorValue', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'getAssertion',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'asserter', type: 'address' },
          { name: 'callbackContract', type: 'address' },
          { name: 'escalateManually', type: 'bool' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'currency', type: 'address' },
          { name: 'disputeSolver', type: 'address' },
          { name: 'noDataPresent', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'getAssertionResult',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'assertionDisputed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'claim', type: 'string' },
      { indexed: true, name: 'asserter', type: 'address' },
    ],
    name: 'AssertionMade',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'settledValue', type: 'bool' },
    ],
    name: 'AssertionSettled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: true, name: 'disputer', type: 'address' },
    ],
    name: 'AssertionDisputed',
    type: 'event',
  },
] as const;

export const UMA_FINDER_ABI = [
  {
    inputs: [{ name: 'interfaceName', type: 'bytes32' }],
    name: 'getImplementationAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'interfaceName', type: 'bytes32' },
      { name: 'implementationAddress', type: 'address' },
    ],
    name: 'changeImplementationAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'interfacesImplemented',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const UMA_WHITELIST_ABI = [
  {
    inputs: [{ name: 'newElement', type: 'address' }],
    name: 'addToWhitelist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'elementToRemove', type: 'address' }],
    name: 'removeFromWhitelist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'element', type: 'address' }],
    name: 'isOnWhitelist',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export class UMAOracleClient {
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private config: UMAOracleConfig;

  constructor(config: UMAOracleConfig, walletClient?: WalletClient) {
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
      blockExplorers: {
        default: {
          name: 'Etherscan',
          url: 'https://etherscan.io',
        },
      },
    };

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl, { timeout: 30_000 }),
    });

    if (walletClient) {
      this.walletClient = walletClient;
    }

    this.config = config;
  }

  setWalletClient(walletClient: WalletClient): void {
    this.walletClient = walletClient;
  }

  private getOOAddress(): Address | null {
    return this.config.optimisticOracleV3Address || this.config.optimisticOracleV2Address || null;
  }

  async getPriceRequest(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
  ): Promise<UMAPriceRequest | null> {
    const ooAddress = this.getOOAddress();
    if (!ooAddress) {
      throw new Error('Optimistic Oracle address not configured');
    }

    try {
      const request = await this.publicClient.readContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V2_ABI,
        functionName: 'getRequest',
        args: [
          this.formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          this.formatAncillaryData(ancillaryData),
        ],
      });

      return {
        identifier,
        timestamp,
        ancillaryData,
        currency: request.currency,
        reward: request.reward,
        finalFee: request.finalFee,
        bond: request.bond,
        customLiveness: request.customLiveness,
      };
    } catch (error) {
      console.error('Failed to get price request:', error);
      return null;
    }
  }

  async hasPrice(identifier: string, timestamp: bigint, ancillaryData: string): Promise<boolean> {
    const ooAddress = this.getOOAddress();
    if (!ooAddress) {
      throw new Error('Optimistic Oracle address not configured');
    }

    try {
      return await this.publicClient.readContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V2_ABI,
        functionName: 'hasPrice',
        args: [
          this.formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          this.formatAncillaryData(ancillaryData),
        ],
      });
    } catch (error) {
      console.error('Failed to check price:', error);
      return false;
    }
  }

  async proposePrice(
    request: UMAPriceRequest,
    _proposedPrice: bigint,
    proposer: Address,
  ): Promise<Hash | null> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }

    const ooAddress = this.getOOAddress();
    if (!ooAddress) {
      throw new Error('Optimistic Oracle address not configured');
    }

    try {
      const simulationResult = await this.publicClient.simulateContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V2_ABI,
        functionName: 'proposePrice',
        args: [
          this.formatIdentifier(request.identifier) as `0x${string}`,
          request.timestamp,
          this.formatAncillaryData(request.ancillaryData),
          request.currency,
          request.reward,
          request.finalFee,
          request.bond,
          request.customLiveness,
          proposer,
          '0x0000000000000000000000000000000000000000',
          false,
          '0x',
        ],
        account: proposer,
      });

      if (!simulationResult || !simulationResult.request) {
        console.error('Invalid simulation result:', simulationResult);
        return null;
      }

      return await this.walletClient.writeContract(simulationResult.request);
    } catch (error) {
      console.error('Failed to propose price:', error);
      return null;
    }
  }

  async disputePrice(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
    disputer: Address,
  ): Promise<Hash | null> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }

    const ooAddress = this.getOOAddress();
    if (!ooAddress) {
      throw new Error('Optimistic Oracle address not configured');
    }

    try {
      const simulationResult = await this.publicClient.simulateContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V2_ABI,
        functionName: 'disputePrice',
        args: [
          this.formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          this.formatAncillaryData(ancillaryData),
        ],
        account: disputer,
        value: BigInt(0),
      });

      if (!simulationResult || !simulationResult.request) {
        console.error('Invalid simulation result:', simulationResult);
        return null;
      }

      return await this.walletClient.writeContract(simulationResult.request);
    } catch (error) {
      console.error('Failed to dispute price:', error);
      return null;
    }
  }

  async settlePrice(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
  ): Promise<{ price: bigint; settledAt: bigint } | null> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }

    const ooAddress = this.getOOAddress();
    if (!ooAddress) {
      throw new Error('Optimistic Oracle address not configured');
    }

    try {
      const result = await this.publicClient.simulateContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V2_ABI,
        functionName: 'settle',
        args: [
          this.formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          this.formatAncillaryData(ancillaryData),
        ],
      });

      return {
        price: result.result[0],
        settledAt: result.result[1],
      };
    } catch (error) {
      console.error('Failed to settle price:', error);
      return null;
    }
  }

  async getAssertion(assertionId: string): Promise<UMAAssertion | null> {
    const ooAddress = this.config.optimisticOracleV3Address;
    if (!ooAddress) {
      throw new Error('OOv3 address not configured');
    }

    try {
      const assertion = await this.publicClient.readContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'getAssertion',
        args: [assertionId as `0x${string}`],
      });

      return {
        assertionId: assertionId as Hash,
        claim: '',
        asserter: assertion.asserter,
        callbackContract: assertion.callbackContract,
        escalateManually: assertion.escalateManually,
        expirationTime: assertion.expirationTime,
        currency: assertion.currency,
        disputeSolver: assertion.disputeSolver,
        noDataPresent: assertion.noDataPresent,
      };
    } catch (error) {
      console.error('Failed to get assertion:', error);
      return null;
    }
  }

  async assertTruth(
    claim: string,
    currency: Address,
    bond: bigint,
    identifier: string,
    asserter: Address,
  ): Promise<Hash | null> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }

    const ooAddress = this.config.optimisticOracleV3Address;
    if (!ooAddress) {
      throw new Error('OOv3 address not configured');
    }

    try {
      const simulationResult = await this.publicClient.simulateContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'assertTruth',
        args: [
          claim,
          currency,
          bond,
          this.formatIdentifier(identifier) as `0x${string}`,
          false,
          '0x',
        ],
        account: asserter,
      });

      if (!simulationResult || !simulationResult.request) {
        console.error('Invalid simulation result:', simulationResult);
        return null;
      }

      return await this.walletClient.writeContract(simulationResult.request);
    } catch (error) {
      console.error('Failed to assert truth:', error);
      return null;
    }
  }

  async settleAssertion(assertionId: string, settler: Address): Promise<boolean> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set');
    }

    const ooAddress = this.config.optimisticOracleV3Address;
    if (!ooAddress) {
      throw new Error('OOv3 address not configured');
    }

    try {
      const simulationResult = await this.publicClient.simulateContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'settleAssertion',
        args: [assertionId as `0x${string}`],
        account: settler,
      });

      if (!simulationResult) {
        console.error('Invalid simulation result:', simulationResult);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to settle assertion:', error);
      return false;
    }
  }

  async getAssertionResult(assertionId: string): Promise<boolean | null> {
    const ooAddress = this.config.optimisticOracleV3Address;
    if (!ooAddress) {
      throw new Error('OOv3 address not configured');
    }

    try {
      return await this.publicClient.readContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'getAssertionResult',
        args: [assertionId as `0x${string}`],
      });
    } catch (error) {
      console.error('Failed to get assertion result:', error);
      return null;
    }
  }

  async isAssertionDisputed(assertionId: string): Promise<boolean | null> {
    const ooAddress = this.config.optimisticOracleV3Address;
    if (!ooAddress) {
      throw new Error('OOv3 address not configured');
    }

    try {
      return await this.publicClient.readContract({
        address: ooAddress,
        abi: UMA_OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'assertionDisputed',
        args: [assertionId as `0x${string}`],
      });
    } catch (error) {
      console.error('Failed to check if assertion is disputed:', error);
      return null;
    }
  }

  private formatIdentifier(identifier: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(identifier);
    const hex = Array.from(data)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return '0x' + hex.padEnd(64, '0');
  }

  private formatAncillaryData(data: string): `0x${string}` {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `0x${hex}`;
  }
}

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

export function createUMAOracleConfig(
  chainId: number,
  overrides?: Partial<UMAOracleConfig>,
): UMAOracleConfig {
  const getRpcUrl = (chainKey: string): string => {
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
    // 提供默认 RPC URL 以避免空字符串
    const defaultRpcUrls: Record<string, string> = {
      ETHEREUM: 'https://mainnet.infura.io/v3/your-infura-key',
      POLYGON: 'https://polygon-rpc.com',
      ARBITRUM: 'https://arb1.arbitrum.io/rpc',
      OPTIMISM: 'https://mainnet.optimism.io',
      POLYGON_AMOY: 'https://rpc-amoy.polygon.technology',
    };
    return defaultRpcUrls[chainKey] || 'https://ethereum.publicnode.com';
  };

  const getFinderAddress = (chainKey: string): Address => {
    const envKey = `UMA_${chainKey}_FINDER_ADDRESS`;
    const envAddress = process.env[envKey];
    if (envAddress && /^0x[a-fA-F0-9]{40}$/.test(envAddress)) {
      return envAddress as Address;
    }
    return '0x0000000000000000000000000000000000000000' as Address;
  };

  const getOOAddress = (chainKey: string, version: 'v2' | 'v3'): Address | undefined => {
    const envKey = `UMA_${chainKey}_OPTIMISTIC_ORACLE_${version.toUpperCase()}_ADDRESS`;
    const envAddress = process.env[envKey];
    if (envAddress && /^0x[a-fA-F0-9]{40}$/.test(envAddress)) {
      return envAddress as Address;
    }
    return undefined;
  };

  const chainConfigs: Record<
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

  const chainConfig = chainConfigs[chainId];
  if (!chainConfig) {
    return {
      chainId,
      chainName: `Chain ${chainId}`,
      rpcUrl: getRpcUrl('UNKNOWN'),
      finderAddress: getFinderAddress('UNKNOWN'),
      defaultIdentifier: 'UMIP-128',
    } as UMAOracleConfig;
  }

  const config: UMAOracleConfig = {
    chainId,
    chainName: chainConfig.name,
    rpcUrl: getRpcUrl(chainConfig.key),
    finderAddress: getFinderAddress(chainConfig.key),
    optimisticOracleV3Address: getOOAddress(chainConfig.key, 'v3') || chainConfig.ooV3,
    optimisticOracleV2Address: getOOAddress(chainConfig.key, 'v2') || chainConfig.ooV2,
    defaultIdentifier: 'UMIP-128',
  };

  return {
    ...config,
    ...overrides,
  } as UMAOracleConfig;
}
