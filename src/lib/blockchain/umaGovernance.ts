import { createPublicClient, http, type Address, type Hash, parseAbi } from 'viem';
import type { Chain } from 'viem/chains';
import { logger } from '@/lib/logger';

export interface GovernanceConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  governorAddress: Address;
  votingTokenAddress: Address;
  timelockAddress?: Address;
}

export interface Proposal {
  id: string;
  proposer: Address;
  targets: Address[];
  values: bigint[];
  signatures: string[];
  calldatas: string[];
  startBlock: bigint;
  endBlock: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  canceled: boolean;
  executed: boolean;
  state: ProposalState;
  description: string;
  createdAt: bigint;
}

export type ProposalState =
  | 'Pending'
  | 'Active'
  | 'Canceled'
  | 'Defeated'
  | 'Succeeded'
  | 'Queued'
  | 'Expired'
  | 'Executed';

export interface Vote {
  proposalId: string;
  voter: Address;
  support: number; // 0 = Against, 1 = For, 2 = Abstain
  votes: bigint;
  reason?: string;
  timestamp: bigint;
  txHash: Hash;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  executedProposals: number;
  totalVotes: number;
  uniqueVoters: number;
  averageParticipation: number;
}

// UMA Governor ABI (simplified)
const GOVERNOR_ABI = parseAbi([
  'function proposalCount() view returns (uint256)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposals(uint256 proposalId) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)',
  'function getActions(uint256 proposalId) view returns (address[] targets, uint256[] values, string[] signatures, bytes[] calldatas)',
  'function proposalThreshold() view returns (uint256)',
  'function quorumVotes() view returns (uint256)',
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',

  'event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 votes, string reason)',
  'event ProposalCanceled(uint256 id)',
  'event ProposalQueued(uint256 id, uint256 eta)',
  'event ProposalExecuted(uint256 id)',
]);

// UMA Voting Token ABI
const VOTING_TOKEN_ABI = parseAbi([
  'function getPastVotes(address account, uint256 blockNumber) view returns (uint256)',
  'function getPastTotalSupply(uint256 blockNumber) view returns (uint256)',
  'function delegates(address account) view returns (address)',
]);

export class UMAGovernanceMonitor {
  private publicClient: ReturnType<typeof createPublicClient>;
  private config: GovernanceConfig;

  constructor(config: GovernanceConfig) {
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
   * 获取提案总数
   */
  async getProposalCount(): Promise<bigint> {
    try {
      const count = await this.publicClient.readContract({
        address: this.config.governorAddress,
        abi: GOVERNOR_ABI,
        functionName: 'proposalCount',
      });
      return count as bigint;
    } catch (error) {
      logger.error('Failed to get proposal count', { error });
      return 0n;
    }
  }

  /**
   * 获取提案状态
   */
  async getProposalState(proposalId: bigint): Promise<ProposalState> {
    try {
      const state = (await this.publicClient.readContract({
        address: this.config.governorAddress,
        abi: GOVERNOR_ABI,
        functionName: 'state',
        args: [proposalId],
      })) as number;

      const states: ProposalState[] = [
        'Pending',
        'Active',
        'Canceled',
        'Defeated',
        'Succeeded',
        'Queued',
        'Expired',
        'Executed',
      ];

      return states[state] || 'Pending';
    } catch (error) {
      logger.error('Failed to get proposal state', { error, proposalId });
      return 'Pending';
    }
  }

  /**
   * 获取提案详情
   */
  async getProposal(proposalId: bigint): Promise<Partial<Proposal> | null> {
    try {
      const [proposalData, actions, state] = await Promise.all([
        this.publicClient.readContract({
          address: this.config.governorAddress,
          abi: GOVERNOR_ABI,
          functionName: 'proposals',
          args: [proposalId],
        }) as Promise<
          [bigint, Address, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean]
        >,
        this.publicClient.readContract({
          address: this.config.governorAddress,
          abi: GOVERNOR_ABI,
          functionName: 'getActions',
          args: [proposalId],
        }) as Promise<[Address[], bigint[], string[], string[]]>,
        this.getProposalState(proposalId),
      ]);

      return {
        id: proposalId.toString(),
        proposer: proposalData[1],
        startBlock: proposalData[3],
        endBlock: proposalData[4],
        forVotes: proposalData[5],
        againstVotes: proposalData[6],
        abstainVotes: proposalData[7],
        canceled: proposalData[8],
        executed: proposalData[9],
        state,
        targets: actions[0],
        values: actions[1],
        signatures: actions[2],
        calldatas: actions[3],
      };
    } catch (error) {
      logger.error('Failed to get proposal', { error, proposalId });
      return null;
    }
  }

  /**
   * 获取治理参数
   */
  async getGovernanceParams(): Promise<{
    proposalThreshold: bigint;
    quorumVotes: bigint;
    votingDelay: bigint;
    votingPeriod: bigint;
  }> {
    try {
      const [proposalThreshold, quorumVotes, votingDelay, votingPeriod] = await Promise.all([
        this.publicClient.readContract({
          address: this.config.governorAddress,
          abi: GOVERNOR_ABI,
          functionName: 'proposalThreshold',
        }) as Promise<bigint>,
        this.publicClient.readContract({
          address: this.config.governorAddress,
          abi: GOVERNOR_ABI,
          functionName: 'quorumVotes',
        }) as Promise<bigint>,
        this.publicClient.readContract({
          address: this.config.governorAddress,
          abi: GOVERNOR_ABI,
          functionName: 'votingDelay',
        }) as Promise<bigint>,
        this.publicClient.readContract({
          address: this.config.governorAddress,
          abi: GOVERNOR_ABI,
          functionName: 'votingPeriod',
        }) as Promise<bigint>,
      ]);

      return {
        proposalThreshold,
        quorumVotes,
        votingDelay,
        votingPeriod,
      };
    } catch (error) {
      logger.error('Failed to get governance params', { error });
      return {
        proposalThreshold: 0n,
        quorumVotes: 0n,
        votingDelay: 0n,
        votingPeriod: 0n,
      };
    }
  }

  /**
   * 获取提案事件
   */
  async getProposalEvents(
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<{
    created: Array<{
      proposalId: bigint;
      proposer: Address;
      startBlock: bigint;
      endBlock: bigint;
      description: string;
      blockNumber: bigint;
      txHash: Hash;
    }>;
    votes: Array<{
      voter: Address;
      proposalId: bigint;
      support: number;
      votes: bigint;
      reason: string;
      blockNumber: bigint;
      txHash: Hash;
    }>;
    canceled: Array<{ proposalId: bigint; blockNumber: bigint; txHash: Hash }>;
    queued: Array<{ proposalId: bigint; eta: bigint; blockNumber: bigint; txHash: Hash }>;
    executed: Array<{ proposalId: bigint; blockNumber: bigint; txHash: Hash }>;
  }> {
    try {
      const [createdLogs, voteLogs, canceledLogs, queuedLogs, executedLogs] = await Promise.all([
        this.publicClient.getLogs({
          address: this.config.governorAddress,
          event: GOVERNOR_ABI.find(
            (item) => item.type === 'event' && item.name === 'ProposalCreated',
          ),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.governorAddress,
          event: GOVERNOR_ABI.find((item) => item.type === 'event' && item.name === 'VoteCast'),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.governorAddress,
          event: GOVERNOR_ABI.find(
            (item) => item.type === 'event' && item.name === 'ProposalCanceled',
          ),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.governorAddress,
          event: GOVERNOR_ABI.find(
            (item) => item.type === 'event' && item.name === 'ProposalQueued',
          ),
          fromBlock,
          toBlock,
        }),
        this.publicClient.getLogs({
          address: this.config.governorAddress,
          event: GOVERNOR_ABI.find(
            (item) => item.type === 'event' && item.name === 'ProposalExecuted',
          ),
          fromBlock,
          toBlock,
        }),
      ]);

      return {
        created: createdLogs.map((log) => ({
          proposalId: (log.args as { id: bigint }).id,
          proposer: (log.args as { proposer: Address }).proposer,
          startBlock: (log.args as { startBlock: bigint }).startBlock,
          endBlock: (log.args as { endBlock: bigint }).endBlock,
          description: (log.args as { description: string }).description,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
        votes: voteLogs.map((log) => ({
          voter: (log.args as { voter: Address }).voter,
          proposalId: (log.args as { proposalId: bigint }).proposalId,
          support: Number((log.args as { support: number }).support),
          votes: (log.args as { votes: bigint }).votes,
          reason: (log.args as { reason: string }).reason || '',
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
        canceled: canceledLogs.map((log) => ({
          proposalId: (log.args as { id: bigint }).id,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
        queued: queuedLogs.map((log) => ({
          proposalId: (log.args as { id: bigint }).id,
          eta: (log.args as { eta: bigint }).eta,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
        executed: executedLogs.map((log) => ({
          proposalId: (log.args as { id: bigint }).id,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash as Hash,
        })),
      };
    } catch (error) {
      logger.error('Failed to get proposal events', { error, fromBlock, toBlock });
      return { created: [], votes: [], canceled: [], queued: [], executed: [] };
    }
  }

  /**
   * 获取用户的投票权
   */
  async getVotingPower(address: Address, blockNumber: bigint): Promise<bigint> {
    try {
      const votes = await this.publicClient.readContract({
        address: this.config.votingTokenAddress,
        abi: VOTING_TOKEN_ABI,
        functionName: 'getPastVotes',
        args: [address, blockNumber],
      });
      return votes as bigint;
    } catch (error) {
      logger.error('Failed to get voting power', { error, address, blockNumber });
      return 0n;
    }
  }
}

// UMA 治理合约配置
export const GOVERNANCE_CONFIGS: Record<number, Partial<GovernanceConfig>> = {
  1: {
    // Ethereum Mainnet
    chainName: 'Ethereum Mainnet',
    governorAddress: '0x8189F38eA6260B0B2427C11dE3D3b96c1Ee7A5e0',
    votingTokenAddress: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
  },
};

export function createGovernanceMonitor(
  chainId: number,
  rpcUrl: string,
  customConfig?: Partial<GovernanceConfig>,
): UMAGovernanceMonitor {
  const config = GOVERNANCE_CONFIGS[chainId];
  if (!config && !customConfig) {
    throw new Error(`Unsupported chain ID for governance monitoring: ${chainId}`);
  }

  return new UMAGovernanceMonitor({
    chainId,
    chainName: config?.chainName || `Chain ${chainId}`,
    rpcUrl,
    governorAddress: customConfig?.governorAddress || config?.governorAddress || '0x0',
    votingTokenAddress: customConfig?.votingTokenAddress || config?.votingTokenAddress || '0x0',
    timelockAddress: customConfig?.timelockAddress || config?.timelockAddress,
  });
}
