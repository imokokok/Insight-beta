import {
  createPublicClient,
  http,
  type Address,
  type Hash,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { logger } from '@/lib/logger';
import type { UMAOracleConfig, UMAPriceRequest, UMAAssertion } from './types';
import { UMA_OPTIMISTIC_ORACLE_V2_ABI, UMA_OPTIMISTIC_ORACLE_V3_ABI } from './abi';
import { formatIdentifier, formatAncillaryData } from './utils';

export class OptimisticOracleClient {
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
          formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          formatAncillaryData(ancillaryData),
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
      logger.error('Failed to get price request', {
        error: error instanceof Error ? error.message : String(error),
      });
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
          formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          formatAncillaryData(ancillaryData),
        ],
      });
    } catch (error) {
      logger.error('Failed to check price', {
        error: error instanceof Error ? error.message : String(error),
      });
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
          formatIdentifier(request.identifier) as `0x${string}`,
          request.timestamp,
          formatAncillaryData(request.ancillaryData),
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
        logger.error('Invalid simulation result', { simulationResult });
        return null;
      }

      return await this.walletClient.writeContract(simulationResult.request);
    } catch (error) {
      logger.error('Failed to propose price', {
        error: error instanceof Error ? error.message : String(error),
      });
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
          formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          formatAncillaryData(ancillaryData),
        ],
        account: disputer,
        value: BigInt(0),
      });

      if (!simulationResult || !simulationResult.request) {
        logger.error('Invalid simulation result', { simulationResult });
        return null;
      }

      return await this.walletClient.writeContract(simulationResult.request);
    } catch (error) {
      logger.error('Failed to dispute price', {
        error: error instanceof Error ? error.message : String(error),
      });
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
          formatIdentifier(identifier) as `0x${string}`,
          timestamp,
          formatAncillaryData(ancillaryData),
        ],
      });

      return {
        price: result.result[0],
        settledAt: result.result[1],
      };
    } catch (error) {
      logger.error('Failed to settle price', {
        error: error instanceof Error ? error.message : String(error),
      });
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
      logger.error('Failed to get assertion', {
        error: error instanceof Error ? error.message : String(error),
      });
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
        args: [claim, currency, bond, formatIdentifier(identifier) as `0x${string}`, false, '0x'],
        account: asserter,
      });

      if (!simulationResult || !simulationResult.request) {
        logger.error('Invalid simulation result', { simulationResult });
        return null;
      }

      return await this.walletClient.writeContract(simulationResult.request);
    } catch (error) {
      logger.error('Failed to assert truth', {
        error: error instanceof Error ? error.message : String(error),
      });
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
        logger.error('Invalid simulation result', { simulationResult });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to settle assertion', {
        error: error instanceof Error ? error.message : String(error),
      });
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
      logger.error('Failed to get assertion result', {
        error: error instanceof Error ? error.message : String(error),
      });
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
      logger.error('Failed to check if assertion is disputed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
