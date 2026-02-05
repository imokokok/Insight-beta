import { getAddress } from 'viem';
import type { UMAChain, UMAAssertion, UMADispute, UMAVote } from '@/lib/types/oracleTypes';
import { decodeIdentifier } from '@/lib/blockchain/uma';
import { toIsoFromSeconds } from '@/lib/utils';
import { upsertUMAAssertion, upsertUMADispute, upsertUMAVote } from '../../umaState';

interface LogArgs {
  [key: string]: unknown;
}

interface LogEntry {
  args: LogArgs;
  transactionHash: unknown;
  blockNumber: unknown;
  logIndex: unknown;
}

export async function processOOv2ProposedLogs(
  logs: LogEntry[],
  chain: UMAChain,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;
    const identifier = decodeIdentifier(args.identifier as string);
    const ancillaryData = args.ancillaryData ? decodeIdentifier(args.ancillaryData as string) : '';
    const requestKey = `${identifier}-${args.timestamp}`;

    const assertion: UMAAssertion = {
      id: requestKey,
      chain: chain as UMAChain,
      identifier,
      ancillaryData,
      proposer: getAddress(args.proposer as string),
      proposedValue: args.price as bigint,
      reward: args.reward as bigint,
      proposedAt: toIsoFromSeconds(args.timestamp as bigint),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: undefined,
      settlementValue: undefined,
      status: 'Proposed',
      bond: args.reward as bigint,
      disputeBond: 0n,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v2',
    };

    dbOps.push(upsertUMAAssertion(assertion, instanceId));
  }

  return dbOps;
}

export async function processOOv2DisputedLogs(
  logs: LogEntry[],
  chain: UMAChain,
  votingPeriodMs: number,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;
    const identifier = decodeIdentifier(args.identifier as string);
    const ancillaryData = args.ancillaryData ? decodeIdentifier(args.ancillaryData as string) : '';
    const requestKey = `${identifier}-${args.timestamp}`;

    const dispute: UMADispute = {
      id: `D:${requestKey}`,
      chain: chain as UMAChain,
      assertionId: requestKey,
      identifier,
      ancillaryData,
      disputer: getAddress(args.disputer as string),
      disputeBond: args.disputeBond as bigint,
      disputedAt: new Date().toISOString(),
      votingEndsAt: new Date(Date.now() + votingPeriodMs).toISOString(),
      status: 'Voting',
      currentVotesFor: 0,
      currentVotesAgainst: 0,
      totalVotes: 0,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v2',
    };

    dbOps.push(upsertUMADispute(dispute, instanceId));
  }

  return dbOps;
}

export async function processOOv2SettledLogs(
  logs: LogEntry[],
  chain: UMAChain,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;
    const identifier = decodeIdentifier(args.identifier as string);
    const ancillaryData = args.ancillaryData ? decodeIdentifier(args.ancillaryData as string) : '';
    const requestKey = `${identifier}-${args.timestamp}`;

    const assertion: UMAAssertion = {
      id: requestKey,
      chain: chain as UMAChain,
      identifier,
      ancillaryData,
      proposer: '0x0000000000000000000000000000000000000000',
      proposedValue: args.price as bigint,
      reward: 0n,
      proposedAt: toIsoFromSeconds(args.timestamp as bigint),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: new Date().toISOString(),
      settlementValue: args.price as bigint,
      status: 'Settled',
      bond: 0n,
      disputeBond: args.payout as bigint,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v2',
    };

    dbOps.push(upsertUMAAssertion(assertion, instanceId));
  }

  return dbOps;
}

export async function processOOv3MadeLogs(
  logs: LogEntry[],
  chain: UMAChain,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;
    const assertionId = args.assertionId as string;
    const identifier = decodeIdentifier(args.identifier as string);
    const claimHash = args.claim as string;

    const assertion: UMAAssertion = {
      id: assertionId,
      chain: chain as UMAChain,
      identifier,
      ancillaryData: `0x${claimHash.replace(/^0x/, '').slice(0, 64)}`,
      proposer: getAddress(args.asserter as string),
      proposedValue: undefined,
      reward: args.bond as bigint,
      proposedAt: new Date().toISOString(),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: undefined,
      settlementValue: undefined,
      status: 'Proposed',
      bond: args.bond as bigint,
      disputeBond: 0n,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v3',
    };

    dbOps.push(upsertUMAAssertion(assertion, instanceId));
  }

  return dbOps;
}

export async function processOOv3DisputedLogs(
  logs: LogEntry[],
  chain: UMAChain,
  votingPeriodMs: number,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;
    const assertionId = args.assertionId as string;

    const dispute: UMADispute = {
      id: `D:${assertionId}`,
      chain: chain as UMAChain,
      assertionId,
      identifier: '',
      ancillaryData: '',
      disputer: getAddress(args.disputer as string),
      disputeBond: 0n,
      disputedAt: new Date().toISOString(),
      votingEndsAt: new Date(Date.now() + votingPeriodMs).toISOString(),
      status: 'Voting',
      currentVotesFor: 0,
      currentVotesAgainst: 0,
      totalVotes: 0,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v3',
    };

    dbOps.push(upsertUMADispute(dispute, instanceId));
  }

  return dbOps;
}

export async function processOOv3SettledLogs(
  logs: LogEntry[],
  chain: UMAChain,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;
    const assertionId = args.assertionId as string;

    const assertion: UMAAssertion = {
      id: assertionId,
      chain: chain as UMAChain,
      identifier: '',
      ancillaryData: '',
      proposer: '0x0000000000000000000000000000000000000000',
      proposedValue: undefined,
      reward: 0n,
      proposedAt: new Date().toISOString(),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: new Date().toISOString(),
      settlementValue: (args.settledTruth as boolean) ? 1n : 0n,
      status: 'Settled',
      bond: 0n,
      disputeBond: args.payout as bigint,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v3',
    };

    dbOps.push(upsertUMAAssertion(assertion, instanceId));
  }

  return dbOps;
}

export async function processOOv3VoteLogs(
  logs: LogEntry[],
  chain: UMAChain,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;
    const assertionId = args.assertionId as string;

    const vote: UMAVote = {
      chain: chain as UMAChain,
      assertionId,
      voter: getAddress(args.voter as string),
      support: args.support as boolean,
      weight: args.weight as bigint,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
    };

    dbOps.push(upsertUMAVote(vote, instanceId));
  }

  return dbOps;
}
