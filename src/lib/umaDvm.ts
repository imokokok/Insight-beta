import { createPublicClient, createWalletClient, http, type Address, type Hash } from "viem";
import type { Chain } from "viem/chains";
import {
  arbitrum,
  hardhat,
  mainnet,
  optimism,
  polygon,
  polygonAmoy,
} from "viem/chains";
import { logger } from "@/lib/logger";

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
    type: "function",
    name: "voteFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_assertionId", type: "bytes32" },
      { name: "_supportsPayout", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "hasVoted",
    stateMutability: "view",
    inputs: [
      { name: "_assertionId", type: "bytes32" },
      { name: "_voter", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getVoteTimes",
    stateMutability: "view",
    inputs: [{ name: "_assertionId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getVoteTimestamp",
    stateMutability: "view",
    inputs: [
      { name: "_assertionId", type: "bytes32" },
      { name: "_voter", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "VoteCommitted",
    inputs: [
      { name: "requester", type: "address", indexed: true },
      { name: "identifier", type: "bytes32", indexed: true },
      { name: "ancillaryData", type: "bytes", indexed: true },
      { name: "time", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "VoteRevealed",
    inputs: [
      { name: "requester", type: "address", indexed: true },
      { name: "identifier", type: "bytes32", indexed: true },
      { name: "ancillaryData", type: "bytes", indexed: true },
      { name: "vote", type: "int256", indexed: true },
      { name: "time", type: "uint256", indexed: true },
    ],
  },
];

export class UMAOracleClient {
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private chain: Chain | null = null;

  constructor(
    private chainId: number,
    private rpcUrl: string,
    private dvmAddress: Address,
  ) {
    this.chain = this.getChainById(chainId);
    if (this.chain) {
      this.publicClient = createPublicClient({
        chain: this.chain,
        transport: http(rpcUrl),
      });
    }
  }

  private getChainById(chainId: number): Chain | null {
    const chains = [arbitrum, hardhat, mainnet, optimism, polygon, polygonAmoy];
    return chains.find((c) => c.id === chainId) || null;
  }

  setWalletClient(walletClient: ReturnType<typeof createWalletClient>): void {
    this.walletClient = walletClient;
  }

  async voteFor(request: UMAVoteRequest): Promise<UMAVoteResult> {
    if (!this.walletClient) {
      return {
        success: false,
        error: "Wallet client not connected",
      };
    }

    try {
      const { request: callRequest } = await this.publicClient.simulateContract({
        address: this.dvmAddress,
        abi: UMA_DVM_ABI,
        functionName: "voteFor",
        args: [request.assertionId as `0x${string}`, request.support],
        account: request.voterAddress,
      });

      const hash = await this.walletClient.writeContract(callRequest);

      logger.info("UMA vote submitted", {
        assertionId: request.assertionId,
        support: request.support,
        voter: request.voterAddress,
        txHash: hash,
      });

      return {
        success: true,
        txHash: hash,
      };
    } catch (error) {
      logger.error("UMA vote failed", {
        error,
        assertionId: request.assertionId,
        voter: request.voterAddress,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getVoteStatus(
    assertionId: string,
    voterAddress: Address,
  ): Promise<UMAVoteStatus> {
    try {
      const hasVoted = await this.publicClient.readContract({
        address: this.dvmAddress,
        abi: UMA_DVM_ABI,
        functionName: "hasVoted",
        args: [assertionId as `0x${string}`, voterAddress],
      });

      return {
        hasVoted,
      };
    } catch (error) {
      logger.error("Failed to get UMA vote status", { error, assertionId, voterAddress });
      return {
        hasVoted: false,
      };
    }
  }

  async getVoteTimestamp(
    assertionId: string,
    voterAddress: Address,
  ): Promise<bigint | null> {
    try {
      const timestamp = await this.publicClient.readContract({
        address: this.dvmAddress,
        abi: UMA_DVM_ABI,
        functionName: "getVoteTimestamp",
        args: [assertionId as `0x${string}`, voterAddress],
      });

      return timestamp;
    } catch (error) {
      logger.error("Failed to get UMA vote timestamp", { error, assertionId, voterAddress });
      return null;
    }
  }

  async waitForTransaction(txHash: Hash): Promise<boolean> {
    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      return receipt.status === "success";
    } catch (error) {
      logger.error("Failed to wait for UMA transaction", { error, txHash });
      return false;
    }
  }
}

let umaClient: UMAOracleClient | null = null;

export function getUMAClient(
  chainId: number,
  rpcUrl: string,
  dvmAddress: Address,
): UMAOracleClient {
  if (!umaClient) {
    umaClient = new UMAOracleClient(chainId, rpcUrl, dvmAddress);
  }
  return umaClient;
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
  return client.getVoteStatus(assertionId, voterAddress);
}