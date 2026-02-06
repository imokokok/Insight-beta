import { getAddress } from 'viem';

import { decodeIdentifier } from '@/lib/blockchain/uma';
import { logger } from '@/lib/logger';
import type { UMAChain, UMAAssertion, UMADispute, UMAVote } from '@/lib/types/oracleTypes';
import { toIsoFromSeconds } from '@/lib/utils';
import { upsertUMAAssertion, upsertUMADispute, upsertUMAVote } from '@/server/oracle/umaState';

interface LogArgs {
  [key: string]: unknown;
}

interface LogEntry {
  args: LogArgs;
  transactionHash: unknown;
  blockNumber: unknown;
  logIndex: unknown;
}

/**
 * 安全地获取字符串值
 */
function safeString(value: unknown, fieldName: string): string | null {
  if (typeof value === 'string') return value;
  logger.warn(`Expected string for ${fieldName}, got ${typeof value}`);
  return null;
}

/**
 * 安全地获取 bigint 值
 */
function safeBigInt(value: unknown, fieldName: string): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string' || typeof value === 'number') {
    try {
      return BigInt(value);
    } catch {
      logger.warn(`Failed to convert ${fieldName} to bigint`);
      return null;
    }
  }
  logger.warn(`Expected bigint for ${fieldName}, got ${typeof value}`);
  return null;
}

/**
 * 安全地获取布尔值
 */
function safeBoolean(value: unknown, fieldName: string): boolean | null {
  if (typeof value === 'boolean') return value;
  logger.warn(`Expected boolean for ${fieldName}, got ${typeof value}`);
  return null;
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

    // 运行时类型检查
    const identifierStr = safeString(args.identifier, 'identifier');
    const ancillaryDataStr = safeString(args.ancillaryData, 'ancillaryData');
    const timestamp = safeBigInt(args.timestamp, 'timestamp');
    const proposer = safeString(args.proposer, 'proposer');
    const price = safeBigInt(args.price, 'price');
    const reward = safeBigInt(args.reward, 'reward');

    if (!identifierStr || !timestamp || !proposer || price === null || reward === null) {
      logger.warn('Skipping OOV2 Proposed log due to missing/invalid fields', {
        hasIdentifier: !!identifierStr,
        hasTimestamp: !!timestamp,
        hasProposer: !!proposer,
        hasPrice: price !== null,
        hasReward: reward !== null,
      });
      continue;
    }

    const identifier = decodeIdentifier(identifierStr);
    const ancillaryData = ancillaryDataStr ? decodeIdentifier(ancillaryDataStr) : '';
    const requestKey = `${identifier}-${timestamp}`;

    const assertion: UMAAssertion = {
      id: requestKey,
      chain: chain as UMAChain,
      identifier,
      ancillaryData,
      proposer: getAddress(proposer),
      proposedValue: price,
      reward,
      proposedAt: toIsoFromSeconds(timestamp),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: undefined,
      settlementValue: undefined,
      status: 'Proposed',
      bond: reward,
      disputeBond: 0n,
      txHash: safeString(log.transactionHash, 'transactionHash') ?? '0x0',
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

    // 运行时类型检查
    const identifierStr = safeString(args.identifier, 'identifier');
    const ancillaryDataStr = safeString(args.ancillaryData, 'ancillaryData');
    const timestamp = safeBigInt(args.timestamp, 'timestamp');
    const disputer = safeString(args.disputer, 'disputer');
    const disputeBond = safeBigInt(args.disputeBond, 'disputeBond');

    if (!identifierStr || !timestamp || !disputer || disputeBond === null) {
      logger.warn('Skipping OOV2 Disputed log due to missing/invalid fields');
      continue;
    }

    const identifier = decodeIdentifier(identifierStr);
    const ancillaryData = ancillaryDataStr ? decodeIdentifier(ancillaryDataStr) : '';
    const requestKey = `${identifier}-${timestamp}`;

    const dispute: UMADispute = {
      id: `D:${requestKey}`,
      chain: chain as UMAChain,
      assertionId: requestKey,
      identifier,
      ancillaryData,
      disputer: getAddress(disputer),
      disputeBond,
      disputedAt: new Date().toISOString(),
      votingEndsAt: new Date(Date.now() + votingPeriodMs).toISOString(),
      status: 'Voting',
      currentVotesFor: 0,
      currentVotesAgainst: 0,
      totalVotes: 0,
      txHash: safeString(log.transactionHash, 'transactionHash') ?? '0x0',
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

    // 运行时类型检查
    const identifierStr = safeString(args.identifier, 'identifier');
    const ancillaryDataStr = safeString(args.ancillaryData, 'ancillaryData');
    const timestamp = safeBigInt(args.timestamp, 'timestamp');
    const price = safeBigInt(args.price, 'price');
    const payout = safeBigInt(args.payout, 'payout');

    if (!identifierStr || !timestamp || price === null || payout === null) {
      logger.warn('Skipping OOV2 Settled log due to missing/invalid fields');
      continue;
    }

    const identifier = decodeIdentifier(identifierStr);
    const ancillaryData = ancillaryDataStr ? decodeIdentifier(ancillaryDataStr) : '';
    const requestKey = `${identifier}-${timestamp}`;

    const assertion: UMAAssertion = {
      id: requestKey,
      chain: chain as UMAChain,
      identifier,
      ancillaryData,
      proposer: '0x0000000000000000000000000000000000000000',
      proposedValue: price,
      reward: 0n,
      proposedAt: toIsoFromSeconds(timestamp),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: new Date().toISOString(),
      settlementValue: price,
      status: 'Settled',
      bond: 0n,
      disputeBond: payout,
      txHash: safeString(log.transactionHash, 'transactionHash') ?? '0x0',
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

    // 运行时类型检查
    const assertionId = safeString(args.assertionId, 'assertionId');
    const identifierStr = safeString(args.identifier, 'identifier');
    const claim = safeString(args.claim, 'claim');
    const asserter = safeString(args.asserter, 'asserter');
    const bond = safeBigInt(args.bond, 'bond');

    if (!assertionId || !identifierStr || !claim || !asserter || bond === null) {
      logger.warn('Skipping OOV3 Made log due to missing/invalid fields');
      continue;
    }

    const identifier = decodeIdentifier(identifierStr);
    const claimHash = claim;

    const assertion: UMAAssertion = {
      id: assertionId,
      chain: chain as UMAChain,
      identifier,
      ancillaryData: `0x${claimHash.replace(/^0x/, '').slice(0, 64)}`,
      proposer: getAddress(asserter),
      proposedValue: undefined,
      reward: bond,
      proposedAt: new Date().toISOString(),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: undefined,
      settlementValue: undefined,
      status: 'Proposed',
      bond,
      disputeBond: 0n,
      txHash: safeString(log.transactionHash, 'transactionHash') ?? '0x0',
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

    // 运行时类型检查
    const assertionId = safeString(args.assertionId, 'assertionId');
    const disputer = safeString(args.disputer, 'disputer');

    if (!assertionId || !disputer) {
      logger.warn('Skipping OOV3 Disputed log due to missing/invalid fields');
      continue;
    }

    const dispute: UMADispute = {
      id: `D:${assertionId}`,
      chain: chain as UMAChain,
      assertionId,
      identifier: '',
      ancillaryData: '',
      disputer: getAddress(disputer),
      disputeBond: 0n,
      disputedAt: new Date().toISOString(),
      votingEndsAt: new Date(Date.now() + votingPeriodMs).toISOString(),
      status: 'Voting',
      currentVotesFor: 0,
      currentVotesAgainst: 0,
      totalVotes: 0,
      txHash: safeString(log.transactionHash, 'transactionHash') ?? '0x0',
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

    // 运行时类型检查
    const assertionId = safeString(args.assertionId, 'assertionId');
    const settledTruth = safeBoolean(args.settledTruth, 'settledTruth');
    const payout = safeBigInt(args.payout, 'payout');

    if (!assertionId || settledTruth === null || payout === null) {
      logger.warn('Skipping OOV3 Settled log due to missing/invalid fields');
      continue;
    }

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
      settlementValue: settledTruth ? 1n : 0n,
      status: 'Settled',
      bond: 0n,
      disputeBond: payout,
      txHash: safeString(log.transactionHash, 'transactionHash') ?? '0x0',
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

    // 运行时类型检查
    const assertionId = safeString(args.assertionId, 'assertionId');
    const voter = safeString(args.voter, 'voter');
    const support = safeBoolean(args.support, 'support');
    const weight = safeBigInt(args.weight, 'weight');

    if (!assertionId || !voter || support === null || weight === null) {
      logger.warn('Skipping OOV3 Vote log due to missing/invalid fields');
      continue;
    }

    const vote: UMAVote = {
      chain: chain as UMAChain,
      assertionId,
      voter: getAddress(voter),
      support,
      weight,
      txHash: safeString(log.transactionHash, 'transactionHash') ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
    };

    dbOps.push(upsertUMAVote(vote, instanceId));
  }

  return dbOps;
}
