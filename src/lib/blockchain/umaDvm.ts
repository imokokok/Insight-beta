import type { createWalletClient } from 'viem';
import { createPublicClient, http, type Address, type Hash } from 'viem';
import type { Chain } from 'viem/chains';
import { arbitrum, hardhat, mainnet, optimism, polygon, polygonAmoy } from 'viem/chains';
import { logger } from '@/lib/logger';

export interface UMAVoteRequest {
  assertionId: string;
  support: boolean;
  voterAddress: Address;
}

export interface UMAVoteResult {
  success: boolean;
  txHash?: Hash;
  error?: string;
}

export interface UMAVoteStatus {
  hasVoted: boolean;
  support?: boolean;
  weight?: bigint;
}

const UMA_DVM_ABI = [
  {
    type: 'function',
    name: 'voteFor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_assertionId', type: 'bytes32' },
      { name: '_supportsPayout', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'hasVoted',
    stateMutability: 'view',
    inputs: [
      { name: '_assertionId', type: 'bytes32' },
      { name: '_voter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getVoteTimes',
    stateMutability: 'view',
    inputs: [{ name: '_assertionId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getVoteTimestamp',
    stateMutability: 'view',
    inputs: [
      { name: '_assertionId', type: 'bytes32' },
      { name: '_voter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'VoteCommitted',
    inputs: [
      { name: 'requester', type: 'address', indexed: true },
      { name: 'identifier', type: 'bytes32', indexed: true },
      { name: 'ancillaryData', type: 'bytes', indexed: true },
      { name: 'time', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'VoteRevealed',
    inputs: [
      { name: 'requester', type: 'address', indexed: true },
      { name: 'identifier', type: 'bytes32', indexed: true },
      { name: 'ancillaryData', type: 'bytes', indexed: true },
      { name: 'vote', type: 'int256', indexed: true },
      { name: 'time', type: 'uint256', indexed: true },
    ],
  },
];

const SUPPORTED_CHAINS = [arbitrum, hardhat, mainnet, optimism, polygon, polygonAmoy] as const;

export class UMAOracleClient {
  private publicClient: ReturnType<typeof createPublicClient> | null = null;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private chain: Chain | null = null;
  private isConnected = false;

  constructor(
    private chainId: number,
    private rpcUrl: string,
    private dvmAddress: Address,
  ) {
    this.initialize();
  }

  private initialize(): void {
    if (!this.rpcUrl) {
      throw new Error('RPC URL is required');
    }

    if (!this.dvmAddress || this.dvmAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Valid DVM address is required');
    }

    this.chain = this.getChainById(this.chainId);
    if (!this.chain) {
      throw new Error(`Unsupported chain ID: ${this.chainId}`);
    }

    try {
      this.publicClient = createPublicClient({
        chain: this.chain,
        transport: http(this.rpcUrl, {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        }),
      });
      this.isConnected = true;
      logger.info('UMA Oracle client initialized', {
        chainId: this.chainId,
        chainName: this.chain.name,
        dvmAddress: this.dvmAddress,
      });
    } catch (error) {
      logger.error('Failed to initialize UMA Oracle client', {
        error,
        chainId: this.chainId,
        rpcUrl: this.rpcUrl,
      });
      throw error;
    }
  }

  private getChainById(chainId: number): Chain | null {
    return SUPPORTED_CHAINS.find((c) => c.id === chainId) || null;
  }

  private validateAssertionId(assertionId: string): boolean {
    const hexRegex = /^0x[0-9a-fA-F]{64}$/;
    return hexRegex.test(assertionId);
  }

  private validateAddress(address: Address): boolean {
    const hexRegex = /^0x[0-9a-fA-F]{40}$/;
    return hexRegex.test(address);
  }

  setWalletClient(walletClient: ReturnType<typeof createWalletClient>): void {
    this.walletClient = walletClient;
    logger.info('Wallet client set for UMA Oracle');
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.publicClient !== null;
  }

  async voteFor(request: UMAVoteRequest): Promise<UMAVoteResult> {
    if (!this.isConnected || !this.publicClient) {
      return {
        success: false,
        error: 'UMA Oracle client not connected',
      };
    }

    if (!this.walletClient) {
      return {
        success: false,
        error: 'Wallet client not connected',
      };
    }

    if (!this.validateAssertionId(request.assertionId)) {
      return {
        success: false,
        error: 'Invalid assertion ID format',
      };
    }

    if (!this.validateAddress(request.voterAddress)) {
      return {
        success: false,
        error: 'Invalid voter address format',
      };
    }

    try {
      const { request: callRequest } = await this.publicClient.simulateContract({
        address: this.dvmAddress,
        abi: UMA_DVM_ABI,
        functionName: 'voteFor',
        args: [request.assertionId as `0x${string}`, request.support],
        account: request.voterAddress,
      });

      const hash = await this.walletClient.writeContract(callRequest);

      logger.info('UMA vote submitted successfully', {
        assertionId: request.assertionId,
        support: request.support,
        voter: request.voterAddress,
        txHash: hash,
        chainId: this.chainId,
      });

      return {
        success: true,
        txHash: hash,
      };
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error('UMA vote failed', {
        error,
        assertionId: request.assertionId,
        voter: request.voterAddress,
        errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getVoteStatus(assertionId: string, voterAddress: Address): Promise<UMAVoteStatus> {
    if (!this.isConnected || !this.publicClient) {
      return {
        hasVoted: false,
      };
    }

    if (!this.validateAssertionId(assertionId)) {
      return {
        hasVoted: false,
      };
    }

    if (!this.validateAddress(voterAddress)) {
      return {
        hasVoted: false,
      };
    }

    try {
      const hasVoted = (await this.publicClient.readContract({
        address: this.dvmAddress,
        abi: UMA_DVM_ABI,
        functionName: 'hasVoted',
        args: [assertionId as `0x${string}`, voterAddress],
      })) as boolean;

      logger.debug('UMA vote status checked', {
        assertionId,
        voterAddress,
        hasVoted,
      });

      return {
        hasVoted,
      };
    } catch (error) {
      logger.error('Failed to get UMA vote status', {
        error,
        assertionId,
        voterAddress,
      });

      return {
        hasVoted: false,
      };
    }
  }

  async getVoteTimestamp(assertionId: string, voterAddress: Address): Promise<bigint | null> {
    if (!this.isConnected || !this.publicClient) {
      return null;
    }

    if (!this.validateAssertionId(assertionId)) {
      return null;
    }

    if (!this.validateAddress(voterAddress)) {
      return null;
    }

    try {
      const timestamp = (await this.publicClient.readContract({
        address: this.dvmAddress,
        abi: UMA_DVM_ABI,
        functionName: 'getVoteTimestamp',
        args: [assertionId as `0x${string}`, voterAddress],
      })) as bigint;

      return timestamp;
    } catch (error) {
      logger.error('Failed to get UMA vote timestamp', {
        error,
        assertionId,
        voterAddress,
      });
      return null;
    }
  }

  async waitForTransaction(txHash: Hash, timeout: number = 60000): Promise<boolean> {
    if (!this.isConnected || !this.publicClient) {
      return false;
    }

    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout,
      });

      const success = receipt.status === 'success';
      logger.info('UMA transaction confirmed', {
        txHash,
        success,
        blockNumber: receipt.blockNumber,
      });

      return success;
    } catch (error) {
      logger.error('Failed to wait for UMA transaction', {
        error,
        txHash,
        timeout,
      });
      return false;
    }
  }

  private parseError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('user rejected')) {
        return 'Transaction rejected by user';
      }
      if (message.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
      }
      if (message.includes('gas')) {
        return 'Gas estimation failed';
      }
      if (message.includes('nonce')) {
        return 'Invalid transaction nonce';
      }
      if (message.includes('network')) {
        return 'Network error occurred';
      }

      return error.message;
    }

    return 'Unknown error occurred';
  }
}

const clientCache = new Map<string, UMAOracleClient>();

export function getUMAClient(
  chainId: number,
  rpcUrl: string,
  dvmAddress: Address,
): UMAOracleClient {
  const cacheKey = `${chainId}-${rpcUrl}-${dvmAddress}`;

  if (!clientCache.has(cacheKey)) {
    const client = new UMAOracleClient(chainId, rpcUrl, dvmAddress);
    clientCache.set(cacheKey, client);
  }

  const cachedClient = clientCache.get(cacheKey);
  if (!cachedClient) {
    throw new Error('Failed to get UMA client from cache');
  }
  return cachedClient;
}

export async function castUMAVote(
  assertionId: string,
  support: boolean,
  voterAddress: Address,
  chainId: number,
  rpcUrl: string,
  dvmAddress: Address,
): Promise<UMAVoteResult> {
  const client = getUMAClient(chainId, rpcUrl, dvmAddress);
  return client.voteFor({
    assertionId,
    support,
    voterAddress,
  });
}

export async function checkUMAVoteStatus(
  assertionId: string,
  voterAddress: Address,
  chainId: number,
  rpcUrl: string,
  dvmAddress: Address,
): Promise<UMAVoteStatus> {
  const client = getUMAClient(chainId, rpcUrl, dvmAddress);
  if (!client) {
    throw new Error('Failed to initialize UMA client');
  }
  return client.getVoteStatus(assertionId, voterAddress);
}
