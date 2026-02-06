/**
 * Background sync worker for Oracle Monitor
 * Handles periodic sync of oracle data and alert rule processing
 * Uses PostgreSQL advisory locks for distributed coordination
 */

import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { getClient, hasDatabase, query } from '@/server/db';
import { getMemoryStore } from '@/server/memoryBackend';
import { createOrTouchAlert, pruneStaleAlerts, readAlertRules } from '@/server/observability';
import { getSyncState, listOracleInstances, readOracleState } from '@/server/oracle';
import type { SyncState } from '@/server/oracleState/types';
import { fetchCurrentPrice } from '@/server/oracle/priceFetcher';
import { ensureOracleSynced, getOracleEnv, isOracleSyncing } from '@/server/oracleIndexer';
import { ensureUMASynced, isUMASyncing } from '@/server/oracle/uma/sync';
import { listUMAConfigs } from '@/server/oracle/umaConfig';
import { startRewardsSyncTask, startTvlSyncTask } from '@/server/oracle/umaSyncTasks';
import { writeJsonFile } from '@/server/kvStore';
import { createPublicClient, http, formatEther, parseAbi } from 'viem';

const pausableAbi = parseAbi(['function paused() view returns (bool)']);

// ============================================================================
// Worker State (stored in global scope for persistence across hot reloads)
// ============================================================================

declare global {
  var oracleMonitorWorkerStarted: boolean | undefined;
  var oracleMonitorWorkerLockClient: PoolClient | undefined;
  var oracleMonitorWorkerLockKey: string | undefined;
  var oracleMonitorWorkerInterval: ReturnType<typeof setInterval> | undefined;
  var oracleMonitorWorkerTickInProgress: boolean | undefined;
  var oracleMonitorWorkerLastTickAt: string | undefined;
  var oracleMonitorWorkerLastTickDurationMs: number | undefined;
  var oracleMonitorWorkerLastError: string | null | undefined;
  var oracleMonitorWorkerLastMaintenanceAt: number | undefined;
}

// ============================================================================
// Configuration
// ============================================================================

const SYNC_INTERVAL = 15000; // 15 seconds
// MIN_SYNC_INTERVAL and MAX_SYNC_INTERVAL reserved for future adaptive interval implementation
// const MIN_SYNC_INTERVAL = 5000; // 5 seconds
// const MAX_SYNC_INTERVAL = 60000; // 60 seconds
const ADAPTIVE_WINDOW_SIZE = 10;
const COOLDOWN_MAX_AGE_MS = 24 * 60 * 60_000; // 24 hours
const MAINTENANCE_INTERVAL_MS = 6 * 60 * 60_000; // 6 hours

// ============================================================================
// Alert Rule Processing
// ============================================================================

const workerAlertCooldown = new Map<string, number>();
const workerRecoveryCooldown = new Map<string, number>();

function getCooldownKey(event: string, fingerprint: string): string {
  return `${event}:${fingerprint}`;
}

function shouldEmitAlert(event: string, fingerprint: string, cooldownMs: number): boolean {
  const key = getCooldownKey(event, fingerprint);
  const lastAt = workerAlertCooldown.get(key) ?? 0;
  const now = Date.now();
  if (now - lastAt < cooldownMs) return false;
  workerAlertCooldown.set(key, now);
  return true;
}

function shouldAttemptRecovery(event: string, fingerprint: string, cooldownMs: number): boolean {
  const key = getCooldownKey(event, fingerprint);
  const lastAt = workerRecoveryCooldown.get(key) ?? 0;
  const now = Date.now();
  if (now - lastAt < cooldownMs) return false;
  workerRecoveryCooldown.set(key, now);
  return true;
}

function cleanupStaleCooldowns(): void {
  const now = Date.now();
  for (const [key, timestamp] of workerAlertCooldown.entries()) {
    if (now - timestamp > COOLDOWN_MAX_AGE_MS) {
      workerAlertCooldown.delete(key);
    }
  }
  for (const [key, timestamp] of workerRecoveryCooldown.entries()) {
    if (now - timestamp > COOLDOWN_MAX_AGE_MS) {
      workerRecoveryCooldown.delete(key);
    }
  }
}

// ============================================================================
// Performance Tracking
// ============================================================================

interface SyncPerformanceMetrics {
  duration: number;
  updated: boolean;
  lagBlocks: bigint | null;
}

const syncPerformanceHistory: SyncPerformanceMetrics[] = [];

// ============================================================================
// Lock Management
// ============================================================================

async function tryAcquireWorkerLock(): Promise<boolean> {
  if (!hasDatabase()) return true;

  const lockClient = global.oracleMonitorWorkerLockClient;
  if (lockClient) return true;

  const workerId = env.INSIGHT_WORKER_ID || 'embedded';
  const name = `oracle_monitor_worker:${workerId}`;
  const digest = crypto.createHash('sha256').update(name).digest();
  const buffer: Buffer = digest.subarray(0, 8);
  const hexString: string = buffer.toString('hex');
  const raw = BigInt('0x' + hexString);
  const key = raw % 9223372036854775807n;

  let client: PoolClient | undefined;
  try {
    client = await getClient();
    const res = await client.query<{ ok: boolean }>(
      'SELECT pg_try_advisory_lock($1::bigint) as ok',
      [key.toString(10)],
    );

    const ok = Boolean(res.rows[0]?.ok);
    if (!ok) {
      client.release();
      return false;
    }

    global.oracleMonitorWorkerLockClient = client;
    global.oracleMonitorWorkerLockKey = key.toString(10);
    logger.info('Acquired worker lock', { workerId, lockKey: key.toString(10) });
    return true;
  } catch (error) {
    logger.error('Failed to acquire worker lock', { error, workerId });
    if (client) client.release();
    return false;
  }
}

async function releaseWorkerLock(): Promise<void> {
  const lockClient = global.oracleMonitorWorkerLockClient;
  const lockKey = global.oracleMonitorWorkerLockKey;

  if (!lockClient || !lockKey) return;

  try {
    await lockClient.query('SELECT pg_advisory_unlock($1::bigint)', [lockKey]);
    lockClient.release();
    logger.info('Released worker lock', { lockKey });
  } catch (error) {
    logger.error('Error releasing worker lock', { error, lockKey });
    try {
      lockClient.release();
    } catch (releaseError) {
      logger.error('Failed to release lock client', { error: releaseError });
    }
  } finally {
    global.oracleMonitorWorkerLockClient = undefined;
    global.oracleMonitorWorkerLockKey = undefined;
  }
}

async function isLockHealthy(): Promise<boolean> {
  const lockClient = global.oracleMonitorWorkerLockClient;
  if (!lockClient) return false;

  try {
    await lockClient.query('SELECT 1 as ok');
    return true;
  } catch (error) {
    logger.error('Worker lock client unhealthy', { error });
    return false;
  }
}

async function handleUnhealthyLock(): Promise<void> {
  const lockClient = global.oracleMonitorWorkerLockClient;
  if (lockClient) {
    try {
      lockClient.release();
    } catch (error) {
      logger.error('Failed to release unhealthy lock client', { error });
    }
  }

  global.oracleMonitorWorkerLockClient = undefined;
  global.oracleMonitorWorkerLockKey = undefined;
  global.oracleMonitorWorkerStarted = false;
  global.oracleMonitorWorkerInterval = undefined;
}

// ============================================================================
// Alert Rule Processing
// ============================================================================

interface AlertRule {
  id: string;
  enabled: boolean;
  event: string;
  severity: 'info' | 'warning' | 'critical';
  silencedUntil?: string | null;
  params?: Record<string, unknown>;
  channels?: Array<'webhook' | 'email' | 'telegram'>;
  recipient?: string | null;
}

interface WorkerSyncState {
  latestBlock: bigint | null;
  lastProcessedBlock: bigint | null;
  consecutiveFailures: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  rpcActiveUrl: string | null;
  contractAddress: string | null;
  chain: string | null;
  owner: string | null;
}

function adaptSyncState(state: SyncState): WorkerSyncState {
  return {
    latestBlock: state.latestBlock,
    lastProcessedBlock: state.lastProcessedBlock,
    consecutiveFailures: state.consecutiveFailures,
    lastAttemptAt: state.sync.lastAttemptAt,
    lastSuccessAt: state.sync.lastSuccessAt,
    lastError: state.sync.lastError,
    rpcActiveUrl: state.rpcActiveUrl,
    contractAddress: state.contractAddress,
    chain: state.chain,
    owner: state.owner,
  };
}

interface OracleState {
  assertions: Record<
    string,
    {
      id: string;
      status: string;
      assertedAt: string;
      livenessEndsAt: string;
      chain: string;
      market?: string;
    }
  >;
  disputes: Record<
    string,
    {
      id: string;
      assertionId: string;
      status: string;
      disputedAt: string;
      votingEndsAt: string;
      chain: string;
      market?: string;
      currentVotesFor: string | number;
      currentVotesAgainst: string | number;
      totalVotes: string | number;
    }
  >;
}

function getNotificationConfig(
  rule: AlertRule,
  nowMs: number,
): {
  channels: Array<'webhook' | 'email' | 'telegram'>;
  recipient?: string;
} {
  const silencedUntilRaw = (rule.silencedUntil ?? '').trim();
  const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
  const silenced = Number.isFinite(silencedUntilMs) && silencedUntilMs > nowMs;

  return silenced
    ? { channels: [] }
    : {
        channels: rule.channels ?? [],
        recipient: rule.recipient ?? undefined,
      };
}

function getRuleCooldownMs(rule: AlertRule): number {
  const raw = Number(rule.params?.cooldownMs ?? 5 * 60_000);
  if (!Number.isFinite(raw) || raw <= 0) return 5 * 60_000;
  return Math.min(24 * 60 * 60_000, Math.max(30_000, Math.round(raw)));
}

function getRuleRecoveryCooldownMs(rule: AlertRule): number {
  const raw = Number(rule.params?.recoveryCooldownMs ?? 60_000);
  if (!Number.isFinite(raw) || raw <= 0) return 60_000;
  return Math.min(24 * 60 * 60_000, Math.max(30_000, Math.round(raw)));
}

function getRuleEscalateAfterMs(rule: AlertRule): number | null {
  const raw = Number(rule.params?.escalateAfterMs ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.min(30 * 24 * 60 * 60_000, Math.max(60_000, Math.round(raw)));
}

async function processSyncErrorRules(
  rules: AlertRule[],
  instanceId: string,
  syncState: WorkerSyncState,
  nowMs: number,
): Promise<void> {
  const syncErrorRules = rules.filter((r) => r.enabled && r.event === 'sync_error');

  for (const rule of syncErrorRules) {
    const fingerprint = `${rule.id}:${instanceId}:${syncState.chain}:${syncState.contractAddress ?? 'unknown'}`;

    if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

    await createOrTouchAlert({
      fingerprint,
      type: rule.event,
      severity: rule.severity,
      title: 'Oracle sync error',
      message: syncState.lastError || 'unknown_error',
      entityType: 'oracle',
      entityId: syncState.contractAddress,
      notify: getNotificationConfig(rule, nowMs),
    });
  }
}

async function processStaleSyncRules(
  rules: AlertRule[],
  instanceId: string,
  syncState: WorkerSyncState,
  missingConfig: boolean,
  shouldAttemptSync: boolean,
  nowMs: number,
): Promise<void> {
  const staleRules = rules.filter((r) => r.enabled && r.event === 'stale_sync');

  if (staleRules.length === 0 || !syncState.lastSuccessAt) return;

  const ageMs = nowMs - new Date(syncState.lastSuccessAt).getTime();
  let staleRecoveryAttempted = false;

  for (const rule of staleRules) {
    const maxAgeMs = Number((rule.params as { maxAgeMs?: unknown })?.maxAgeMs ?? 5 * 60 * 1000);
    if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) continue;
    if (ageMs <= maxAgeMs) continue;

    const fingerprint = `${rule.id}:${instanceId}:${syncState.chain}:${syncState.contractAddress ?? 'unknown'}`;

    if (!missingConfig && !shouldAttemptSync && !staleRecoveryAttempted) {
      const recoveryCooldownMs = getRuleRecoveryCooldownMs(rule);
      if (shouldAttemptRecovery('stale_sync_recovery', fingerprint, recoveryCooldownMs)) {
        staleRecoveryAttempted = true;
        try {
          await ensureOracleSynced(instanceId);
        } catch (e) {
          logger.warn('Stale sync recovery failed', { error: e, instanceId });
        }
      }
    }

    if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

    await createOrTouchAlert({
      fingerprint,
      type: rule.event,
      severity: rule.severity,
      title: 'Oracle sync stale',
      message: `Last success ${Math.round(ageMs / 1000)}s ago`,
      entityType: 'oracle',
      entityId: syncState.contractAddress,
      notify: getNotificationConfig(rule, nowMs),
    });
  }
}

async function processContractPausedRules(
  rules: AlertRule[],
  instanceId: string,
  syncState: WorkerSyncState,
  nowMs: number,
): Promise<void> {
  const pausedRules = rules.filter((r) => r.enabled && r.event === 'contract_paused');

  if (pausedRules.length === 0 || !syncState.contractAddress || !syncState.rpcActiveUrl) {
    return;
  }

  try {
    const client = createPublicClient({
      transport: http(syncState.rpcActiveUrl),
    });

    const paused = await client.readContract({
      address: syncState.contractAddress as `0x${string}`,
      abi: pausableAbi,
      functionName: 'paused',
    });

    if (!paused) return;

    for (const rule of pausedRules) {
      const fingerprint = `${rule.id}:${instanceId}:${syncState.chain}:${syncState.contractAddress ?? 'unknown'}`;

      if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

      await createOrTouchAlert({
        fingerprint,
        type: rule.event,
        severity: rule.severity,
        title: 'Contract paused',
        message: 'paused() returned true',
        entityType: 'oracle',
        entityId: syncState.contractAddress,
        notify: getNotificationConfig(rule, nowMs),
      });
    }
  } catch (error) {
    logger.debug('Failed to check contract paused status', { error, instanceId });
  }
}

async function processBacklogRules(
  rules: AlertRule[],
  instanceId: string,
  syncState: WorkerSyncState,
  oracleState: OracleState,
  nowMs: number,
): Promise<void> {
  const backlogRules = rules.filter(
    (r) =>
      r.enabled &&
      (r.event === 'sync_backlog' ||
        r.event === 'backlog_assertions' ||
        r.event === 'backlog_disputes' ||
        r.event === 'market_stale'),
  );

  if (backlogRules.length === 0) return;

  const lagBlocks =
    syncState.latestBlock !== null && syncState.lastProcessedBlock !== null
      ? syncState.latestBlock - syncState.lastProcessedBlock
      : null;

  const assertions = Object.values(oracleState.assertions);
  const disputes = Object.values(oracleState.disputes);

  const openAssertions = assertions.filter((a) => a.status !== 'Resolved').length;
  const openDisputes = disputes.filter((d) => d.status !== 'Executed').length;

  const newestAssertedAtMs = assertions.reduce((acc, a) => {
    const ms = Date.parse(a.assertedAt);
    if (!Number.isFinite(ms)) return acc;
    return Math.max(acc, ms);
  }, 0);

  for (const rule of backlogRules) {
    const fingerprint = `${rule.id}:${instanceId}:${syncState.chain}:${syncState.contractAddress ?? 'unknown'}`;

    switch (rule.event) {
      case 'sync_backlog': {
        const maxLagBlocks = Number(
          (rule.params as { maxLagBlocks?: unknown })?.maxLagBlocks ?? 200,
        );
        if (!Number.isFinite(maxLagBlocks) || maxLagBlocks <= 0) continue;
        if (lagBlocks === null || lagBlocks <= BigInt(Math.floor(maxLagBlocks))) continue;

        if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

        await createOrTouchAlert({
          fingerprint,
          type: rule.event,
          severity: rule.severity,
          title: 'Sync backlog high',
          message: `lagBlocks ${lagBlocks.toString(10)} > ${Math.floor(maxLagBlocks)}`,
          entityType: 'oracle',
          entityId: syncState.contractAddress,
          notify: getNotificationConfig(rule, nowMs),
        });
        break;
      }

      case 'backlog_assertions': {
        const maxOpenAssertions = Number(
          (rule.params as { maxOpenAssertions?: unknown })?.maxOpenAssertions ?? 50,
        );
        if (!Number.isFinite(maxOpenAssertions) || maxOpenAssertions <= 0) continue;
        if (openAssertions <= maxOpenAssertions) continue;

        if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

        await createOrTouchAlert({
          fingerprint,
          type: rule.event,
          severity: rule.severity,
          title: 'Assertion backlog high',
          message: `${openAssertions} open assertions > ${Math.floor(maxOpenAssertions)}`,
          entityType: 'oracle',
          entityId: syncState.contractAddress,
          notify: getNotificationConfig(rule, nowMs),
        });
        break;
      }

      case 'backlog_disputes': {
        const maxOpenDisputes = Number(
          (rule.params as { maxOpenDisputes?: unknown })?.maxOpenDisputes ?? 20,
        );
        if (!Number.isFinite(maxOpenDisputes) || maxOpenDisputes <= 0) continue;
        if (openDisputes <= maxOpenDisputes) continue;

        if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

        await createOrTouchAlert({
          fingerprint,
          type: rule.event,
          severity: rule.severity,
          title: 'Dispute backlog high',
          message: `${openDisputes} open disputes > ${Math.floor(maxOpenDisputes)}`,
          entityType: 'oracle',
          entityId: syncState.contractAddress,
          notify: getNotificationConfig(rule, nowMs),
        });
        break;
      }

      case 'market_stale': {
        const maxAgeMs = Number(
          (rule.params as { maxAgeMs?: unknown })?.maxAgeMs ?? 6 * 60 * 60_000,
        );
        if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) continue;
        if (newestAssertedAtMs <= 0) continue;

        const ageMs = nowMs - newestAssertedAtMs;
        if (ageMs <= maxAgeMs) continue;

        if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

        await createOrTouchAlert({
          fingerprint,
          type: rule.event,
          severity: rule.severity,
          title: 'Market data stale',
          message: `last assertion ${Math.round(ageMs / 60_000)}m ago`,
          entityType: 'oracle',
          entityId: syncState.contractAddress,
          notify: getNotificationConfig(rule, nowMs),
        });
        break;
      }
    }
  }
}

async function processLivenessRules(
  rules: AlertRule[],
  instanceId: string,
  oracleState: OracleState,
  nowMs: number,
): Promise<void> {
  const livenessRules = rules.filter((r) => r.enabled && r.event === 'liveness_expiring');

  if (livenessRules.length === 0) return;

  const assertions = Object.values(oracleState.assertions);

  for (const assertion of assertions) {
    if (assertion.status === 'Resolved') continue;

    const livenessEndsAtMs = Date.parse(assertion.livenessEndsAt);
    if (!Number.isFinite(livenessEndsAtMs)) continue;

    const remainingMs = livenessEndsAtMs - nowMs;
    if (remainingMs <= 0) continue;

    for (const rule of livenessRules) {
      const withinMinutes = Number(
        (rule.params as { withinMinutes?: unknown })?.withinMinutes ?? 60,
      );
      if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) continue;
      if (remainingMs > withinMinutes * 60_000) continue;

      const fingerprint = `${rule.id}:${instanceId}:${assertion.chain}:${assertion.id}`;
      if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

      await createOrTouchAlert({
        fingerprint,
        type: rule.event,
        severity: rule.severity,
        title: 'Liveness expiring',
        message: `${assertion.market} • ${Math.max(0, Math.ceil(remainingMs / 60_000))}m remaining`,
        entityType: 'assertion',
        entityId: assertion.id,
        notify: getNotificationConfig(rule, nowMs),
      });
    }
  }
}

async function processDisputeRules(
  rules: AlertRule[],
  instanceId: string,
  oracleState: OracleState,
  effectiveVoteTrackingEnabled: boolean,
  nowMs: number,
): Promise<void> {
  if (!effectiveVoteTrackingEnabled) return;

  const disputeRules = rules.filter(
    (r) =>
      r.enabled &&
      (r.event === 'execution_delayed' ||
        r.event === 'low_participation' ||
        r.event === 'high_vote_divergence'),
  );

  if (disputeRules.length === 0) return;

  const disputes = Object.values(oracleState.disputes);

  for (const dispute of disputes) {
    if (dispute.status !== 'Voting') continue;

    const disputedAtMs = Date.parse(dispute.disputedAt);
    const votingEndsAtMs = Date.parse(dispute.votingEndsAt);
    if (!Number.isFinite(disputedAtMs) || !Number.isFinite(votingEndsAtMs)) continue;

    const totalVotes = Number(dispute.totalVotes);
    const votesFor = Number(dispute.currentVotesFor);
    const votesAgainst = Number(dispute.currentVotesAgainst);
    const marginPercent =
      totalVotes > 0 ? (Math.abs(votesFor - votesAgainst) / totalVotes) * 100 : 100;

    for (const rule of disputeRules) {
      const fingerprint = `${rule.id}:${instanceId}:${dispute.chain}:${dispute.assertionId}`;

      switch (rule.event) {
        case 'execution_delayed': {
          const maxDelayMinutes = Number(
            (rule.params as { maxDelayMinutes?: unknown })?.maxDelayMinutes ?? 30,
          );
          if (!Number.isFinite(maxDelayMinutes) || maxDelayMinutes <= 0) continue;

          const thresholdMs = votingEndsAtMs + maxDelayMinutes * 60_000;
          if (nowMs <= thresholdMs) continue;

          if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

          const delayMinutes = Math.max(0, Math.round((nowMs - votingEndsAtMs) / 60_000));
          await createOrTouchAlert({
            fingerprint,
            type: rule.event,
            severity: rule.severity,
            title: 'Dispute execution delayed',
            message: `${dispute.market} • ${delayMinutes}m past voting end • votes ${totalVotes}`,
            entityType: 'assertion',
            entityId: dispute.assertionId,
            notify: getNotificationConfig(rule, nowMs),
          });
          break;
        }

        case 'low_participation': {
          const withinMinutes = Number(
            (rule.params as { withinMinutes?: unknown })?.withinMinutes ?? 60,
          );
          const minTotalVotes = Number(
            (rule.params as { minTotalVotes?: unknown })?.minTotalVotes ?? 0,
          );

          if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) continue;
          if (!Number.isFinite(minTotalVotes) || minTotalVotes < 0) continue;
          if (nowMs - disputedAtMs < withinMinutes * 60_000) continue;
          if (totalVotes > minTotalVotes) continue;

          if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

          await createOrTouchAlert({
            fingerprint,
            type: rule.event,
            severity: rule.severity,
            title: 'Low dispute participation',
            message: `${dispute.market} • votes ${totalVotes} after ${Math.round(withinMinutes)}m`,
            entityType: 'assertion',
            entityId: dispute.assertionId,
            notify: getNotificationConfig(rule, nowMs),
          });
          break;
        }

        case 'high_vote_divergence': {
          const withinMinutes = Number(
            (rule.params as { withinMinutes?: unknown })?.withinMinutes ?? 15,
          );
          const minTotalVotes = Number(
            (rule.params as { minTotalVotes?: unknown })?.minTotalVotes ?? 1,
          );
          const maxMarginPercent = Number(
            (rule.params as { maxMarginPercent?: unknown })?.maxMarginPercent ?? 10,
          );

          if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) continue;
          if (!Number.isFinite(minTotalVotes) || minTotalVotes <= 0) continue;
          if (!Number.isFinite(maxMarginPercent) || maxMarginPercent <= 0 || maxMarginPercent > 100)
            continue;

          if (totalVotes < minTotalVotes) continue;
          if (marginPercent > maxMarginPercent) continue;

          const minsToEnd = (votingEndsAtMs - nowMs) / 60_000;
          if (minsToEnd < 0 || minsToEnd > withinMinutes) continue;

          if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

          await createOrTouchAlert({
            fingerprint,
            type: rule.event,
            severity: rule.severity,
            title: 'Vote divergence risk',
            message: `${dispute.market} • margin ${marginPercent.toFixed(1)}% • votes ${totalVotes} • ${Math.max(0, Math.round(minsToEnd))}m to end`,
            entityType: 'assertion',
            entityId: dispute.assertionId,
            notify: getNotificationConfig(rule, nowMs),
          });
          break;
        }
      }
    }
  }
}

async function processPriceDeviationRules(
  rules: AlertRule[],
  instanceId: string,
  syncState: WorkerSyncState,
  nowMs: number,
): Promise<void> {
  const deviationRules = rules.filter((r) => r.enabled && r.event === 'price_deviation');

  if (deviationRules.length === 0) return;

  const symbol = env.INSIGHT_PRICE_SYMBOL || 'ETH';

  try {
    const { referencePrice, oraclePrice } = await fetchCurrentPrice(symbol, {
      rpcUrl: syncState.rpcActiveUrl ?? null,
    });

    const deviation =
      referencePrice > 0 ? Math.abs(oraclePrice - referencePrice) / referencePrice : 0;
    const deviationPercent = deviation * 100;

    for (const rule of deviationRules) {
      const threshold = Number(
        (rule.params as { thresholdPercent?: unknown })?.thresholdPercent ?? 2,
      );

      if (deviationPercent <= threshold) continue;

      const fingerprint = `price_deviation:${instanceId}:${symbol}:${syncState.contractAddress ?? 'unknown'}`;
      if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

      await createOrTouchAlert({
        fingerprint,
        type: rule.event,
        severity: rule.severity,
        title: 'Price Deviation Detected',
        message: `Oracle: $${oraclePrice}, Ref: $${referencePrice}, Deviation: ${deviationPercent.toFixed(2)}% > ${threshold}%`,
        entityType: 'oracle',
        entityId: syncState.contractAddress,
        notify: getNotificationConfig(rule, nowMs),
      });
    }
  } catch (error) {
    logger.error('Failed to check price deviation', { error, instanceId });
  }
}

async function processLowGasRules(
  rules: AlertRule[],
  instanceId: string,
  syncState: WorkerSyncState,
  nowMs: number,
): Promise<void> {
  const lowGasRules = rules.filter((r) => r.enabled && r.event === 'low_gas');

  if (lowGasRules.length === 0 || !syncState.owner || !syncState.rpcActiveUrl) {
    return;
  }

  try {
    const client = createPublicClient({
      transport: http(syncState.rpcActiveUrl),
    });

    const balanceWei = await client.getBalance({
      address: syncState.owner as `0x${string}`,
    });
    const balanceEth = Number(formatEther(balanceWei));

    for (const rule of lowGasRules) {
      const minBalance = Number((rule.params as { minBalanceEth?: unknown })?.minBalanceEth ?? 0.1);

      if (balanceEth >= minBalance) continue;

      const fingerprint = `low_gas:${instanceId}:${syncState.owner}`;
      if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

      await createOrTouchAlert({
        fingerprint,
        type: rule.event,
        severity: rule.severity,
        title: 'Low Gas Balance',
        message: `Owner ${syncState.owner.slice(0, 6)}... has ${balanceEth.toFixed(4)} ETH < ${minBalance} ETH`,
        entityType: 'account',
        entityId: syncState.owner,
        notify: getNotificationConfig(rule, nowMs),
      });
    }
  } catch (error) {
    logger.error('Failed to check gas balance', { error, instanceId });
  }
}

async function processDisputeRateRules(
  rules: AlertRule[],
  instanceId: string,
  syncState: WorkerSyncState,
  oracleState: OracleState,
  nowMs: number,
): Promise<void> {
  const disputeRateRules = rules.filter((r) => r.enabled && r.event === 'high_dispute_rate');

  if (disputeRateRules.length === 0) return;

  const contract = syncState.contractAddress ?? 'unknown';

  for (const rule of disputeRateRules) {
    const windowDays = Number((rule.params as { windowDays?: unknown })?.windowDays ?? 7);
    const minAssertions = Number((rule.params as { minAssertions?: unknown })?.minAssertions ?? 20);
    const thresholdPercent = Number(
      (rule.params as { thresholdPercent?: unknown })?.thresholdPercent ?? 10,
    );

    if (!Number.isFinite(windowDays) || windowDays <= 0) continue;
    if (!Number.isFinite(minAssertions) || minAssertions <= 0) continue;
    if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100)
      continue;

    let totalAssertions = 0;
    let disputedAssertions = 0;

    if (hasDatabase()) {
      const totalRes = await query<{ total: string | number }>(
        `SELECT COUNT(*) as total FROM assertions WHERE asserted_at > NOW() - INTERVAL '1 day' * $1 AND instance_id = $2`,
        [windowDays, instanceId],
      );
      totalAssertions = Number(totalRes.rows[0]?.total ?? 0);

      const disputedRes = await query<{ total: string | number }>(
        `SELECT COUNT(DISTINCT assertion_id) as total FROM disputes WHERE disputed_at > NOW() - INTERVAL '1 day' * $1 AND instance_id = $2`,
        [windowDays, instanceId],
      );
      disputedAssertions = Number(disputedRes.rows[0]?.total ?? 0);
    } else {
      const cutoff = nowMs - windowDays * 24 * 60 * 60_000;
      const assertions = Object.values(oracleState.assertions);
      const disputes = Object.values(oracleState.disputes);

      totalAssertions = assertions.filter((a) => Date.parse(a.assertedAt) >= cutoff).length;
      const disputedSet = new Set(
        disputes.filter((d) => Date.parse(d.disputedAt) >= cutoff).map((d) => d.assertionId),
      );
      disputedAssertions = disputedSet.size;
    }

    if (totalAssertions < minAssertions || totalAssertions <= 0) continue;

    const rate = (disputedAssertions / totalAssertions) * 100;
    if (rate < thresholdPercent) continue;

    const fingerprint = `${rule.id}:${instanceId}:${syncState.chain}:${contract}`;
    if (!shouldEmitAlert(rule.event, fingerprint, getRuleCooldownMs(rule))) continue;

    await createOrTouchAlert({
      fingerprint,
      type: rule.event,
      severity: rule.severity,
      title: 'High dispute rate',
      message: `${rate.toFixed(1)}% disputed (${disputedAssertions}/${totalAssertions}) over ${Math.round(windowDays)}d`,
      entityType: 'oracle',
      entityId: syncState.contractAddress,
      notify: getNotificationConfig(rule, nowMs),
    });
  }
}

async function processEscalationRules(rules: AlertRule[], nowMs: number): Promise<void> {
  const escalationRules = rules
    .filter((r) => r.enabled)
    .map((r) => ({ rule: r, afterMs: getRuleEscalateAfterMs(r) }))
    .filter((x): x is { rule: AlertRule; afterMs: number } => typeof x.afterMs === 'number');

  if (escalationRules.length === 0) return;

  const escalateSeverity = (s: 'info' | 'warning' | 'critical') =>
    s === 'info' ? 'warning' : 'critical';

  if (hasDatabase()) {
    for (const { rule, afterMs } of escalationRules) {
      const cutoffSeconds = Math.floor((nowMs - afterMs) / 1000);
      const prefix = `${rule.id}:escalation:`;

      const res = await query<{
        fingerprint: string;
        title: string;
        message: string;
        entity_type: string | null;
        entity_id: string | null;
        first_seen_at: Date;
      }>(
        `SELECT fingerprint, title, message, entity_type, entity_id, first_seen_at
         FROM alerts a
         WHERE a.status = 'Open'
           AND a.type = $1
           AND a.first_seen_at <= to_timestamp($2)
           AND NOT EXISTS (
             SELECT 1 FROM alerts e WHERE e.fingerprint = CONCAT($3, a.fingerprint)
           )
         ORDER BY a.first_seen_at ASC
         LIMIT 200`,
        [rule.event, cutoffSeconds, prefix],
      );

      for (const a of res.rows) {
        const firstSeenMs = a.first_seen_at.getTime();
        const ageMs = nowMs - firstSeenMs;
        const escalationFingerprint = `${prefix}${a.fingerprint}`;

        if (
          !shouldEmitAlert(
            `${rule.event}_escalation`,
            escalationFingerprint,
            getRuleCooldownMs(rule),
          )
        ) {
          continue;
        }

        await createOrTouchAlert({
          fingerprint: escalationFingerprint,
          type: `${rule.event}_escalation`,
          severity: escalateSeverity(rule.severity),
          title: `Escalation: ${a.title}`,
          message: `${Math.round(ageMs / 60_000)}m open • ${a.message} • source ${a.fingerprint}`,
          entityType: a.entity_type,
          entityId: a.entity_id,
          notify: getNotificationConfig(rule, nowMs),
        });
      }
    }
  } else {
    const mem = getMemoryStore();
    const items = Array.from(mem.alerts.values());
    const existingFingerprints = new Set(items.map((a) => a.fingerprint));

    for (const { rule, afterMs } of escalationRules) {
      const prefix = `${rule.id}:escalation:`;

      for (const a of items) {
        if (a.status !== 'Open') continue;
        if (a.type !== rule.event) continue;

        const firstSeenMs = Date.parse(a.firstSeenAt);
        if (!Number.isFinite(firstSeenMs)) continue;

        const ageMs = nowMs - firstSeenMs;
        if (ageMs < afterMs) continue;

        const escalationFingerprint = `${prefix}${a.fingerprint}`;
        if (existingFingerprints.has(escalationFingerprint)) continue;

        if (
          !shouldEmitAlert(
            `${rule.event}_escalation`,
            escalationFingerprint,
            getRuleCooldownMs(rule),
          )
        ) {
          continue;
        }

        await createOrTouchAlert({
          fingerprint: escalationFingerprint,
          type: `${rule.event}_escalation`,
          severity: escalateSeverity(rule.severity),
          title: `Escalation: ${a.title}`,
          message: `${Math.round(ageMs / 60_000)}m open • ${a.message} • source ${a.fingerprint}`,
          entityType: a.entityType,
          entityId: a.entityId,
          notify: getNotificationConfig(rule, nowMs),
        });
      }
    }
  }
}

async function processInstanceRules(
  rules: AlertRule[],
  instanceId: string,
  effectiveVoteTrackingEnabled: boolean,
  nowMs: number,
): Promise<string | null> {
  let lastError: string | null = null;

  try {
    if (isOracleSyncing(instanceId)) return null;

    const preSyncState = await getSyncState(instanceId);
    const envConfig = await getOracleEnv(instanceId);
    const missingConfig = !envConfig.rpcUrl || !envConfig.contractAddress;

    const consecutiveFailures = preSyncState.consecutiveFailures ?? 0;
    const lastAttemptAtRaw = preSyncState.sync.lastAttemptAt ?? '';
    const lastAttemptAtMs = lastAttemptAtRaw ? Date.parse(lastAttemptAtRaw) : NaN;

    const baseBackoffMs =
      consecutiveFailures > 0
        ? Math.min(5 * 60_000, 5_000 * 2 ** Math.min(consecutiveFailures - 1, 6))
        : 0;

    const isConfigError = missingConfig || preSyncState.sync.lastError === 'contract_not_found';
    const backoffMs = isConfigError
      ? Math.max(
          baseBackoffMs,
          consecutiveFailures > 0
            ? Math.min(60 * 60_000, 30_000 * 2 ** Math.min(consecutiveFailures - 1, 10))
            : 60_000,
        )
      : baseBackoffMs;

    const shouldAttemptSync =
      backoffMs === 0 || !Number.isFinite(lastAttemptAtMs) || nowMs - lastAttemptAtMs >= backoffMs;

    if (missingConfig) {
      lastError = 'missing_config';
    }

    if (shouldAttemptSync && !missingConfig) {
      await ensureOracleSynced(instanceId);
    }

    const syncState: WorkerSyncState = adaptSyncState(await getSyncState(instanceId));

    if (missingConfig) {
      await processSyncErrorRules(rules, instanceId, syncState, nowMs);
    }

    await processStaleSyncRules(
      rules,
      instanceId,
      syncState,
      missingConfig,
      shouldAttemptSync,
      nowMs,
    );
    await processContractPausedRules(rules, instanceId, syncState, nowMs);

    const oracleState: OracleState = await readOracleState(instanceId);
    await processBacklogRules(rules, instanceId, syncState, oracleState, nowMs);
    await processLivenessRules(rules, instanceId, oracleState, nowMs);
    await processDisputeRules(rules, instanceId, oracleState, effectiveVoteTrackingEnabled, nowMs);
    await processPriceDeviationRules(rules, instanceId, syncState, nowMs);
    await processLowGasRules(rules, instanceId, syncState, nowMs);
    await processDisputeRateRules(rules, instanceId, syncState, oracleState, nowMs);
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'unknown_error';

    if (lastError === 'contract_not_found' || lastError === 'missing_config') {
      logger.warn('Background sync skipped due to configuration issue', {
        errorMessage: lastError,
        instanceId,
      });
    } else {
      logger.error('Background sync failed', { error, errorMessage: lastError, instanceId });
    }
  }

  return lastError;
}

// processUMASync handles UMA-specific synchronization

async function _processUMASync(_nowMs: number): Promise<void> {
  try {
    const umaConfigs = await listUMAConfigs();
    const enabledUMAConfigs = umaConfigs.filter((c) => c.enabled);

    for (const config of enabledUMAConfigs) {
      const umaInstanceId = config.id;

      try {
        if (isUMASyncing(umaInstanceId)) continue;

        await ensureUMASynced(umaInstanceId);

        startRewardsSyncTask(umaInstanceId);
        startTvlSyncTask(umaInstanceId);
      } catch (error) {
        logger.error('UMA sync failed', { error, instanceId: umaInstanceId });
      }
    }
  } catch (error) {
    logger.error('Failed to sync UMA instances', { error });
  }
}

async function runMaintenanceTasks(nowMs: number): Promise<void> {
  const lastMaintenanceAt = global.oracleMonitorWorkerLastMaintenanceAt ?? 0;
  if (nowMs - lastMaintenanceAt < MAINTENANCE_INTERVAL_MS) return;

  try {
    await pruneStaleAlerts();
    cleanupStaleCooldowns();
    global.oracleMonitorWorkerLastMaintenanceAt = nowMs;
    logger.debug('Maintenance tasks completed');
  } catch (error) {
    logger.warn('Failed to run maintenance tasks', { error });
  }
}

// ============================================================================
// Main Worker Tick
// ============================================================================

async function tickWorker(): Promise<void> {
  if (global.oracleMonitorWorkerTickInProgress) {
    logger.debug('Worker tick already in progress, skipping');
    return;
  }

  global.oracleMonitorWorkerTickInProgress = true;
  const startedAt = Date.now();
  let lastError: string | null = null;

  try {
    if (hasDatabase()) {
      const isHealthy = await isLockHealthy();
      if (!isHealthy) {
        await handleUnhealthyLock();
        setTimeout(() => startWorker(), 5000);
        return;
      }
    }

    const nowMs = Date.now();

    await runMaintenanceTasks(nowMs);

    const rules: AlertRule[] = (await readAlertRules()).map((r) => ({
      id: r.id,
      enabled: r.enabled,
      event: r.event,
      severity: r.severity,
      silencedUntil: r.silencedUntil,
      params: r.params,
      channels: r.channels,
      recipient: r.recipient,
    }));

    const degraded = ['1', 'true'].includes((env.INSIGHT_VOTING_DEGRADATION || '').toLowerCase());
    const effectiveVoteTrackingEnabled =
      ['1', 'true'].includes((env.INSIGHT_ENABLE_VOTING || '').toLowerCase()) &&
      !['1', 'true'].includes((env.INSIGHT_DISABLE_VOTE_TRACKING || '').toLowerCase()) &&
      !degraded;

    const instances = await listOracleInstances();
    const enabledInstances = instances.filter((i) => i.enabled);

    for (const instance of enabledInstances) {
      const instanceError = await processInstanceRules(
        rules,
        instance.id,
        effectiveVoteTrackingEnabled,
        nowMs,
      );

      if (instanceError) {
        lastError = instanceError;
      }
    }

    await _processUMASync(nowMs);
    await processEscalationRules(rules, nowMs);
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'unknown_error';
    logger.error('Worker tick failed', { error, errorMessage: lastError });
  } finally {
    const duration = Date.now() - startedAt;
    const at = new Date().toISOString();

    global.oracleMonitorWorkerLastTickAt = at;
    global.oracleMonitorWorkerLastTickDurationMs = duration;
    global.oracleMonitorWorkerLastError = lastError;
    global.oracleMonitorWorkerTickInProgress = false;

    let lagBlocks: bigint | null = null;
    try {
      const syncState = await getSyncState();
      if (
        syncState?.latestBlock !== null &&
        syncState?.lastProcessedBlock !== null &&
        syncState.latestBlock !== undefined &&
        syncState.lastProcessedBlock !== undefined
      ) {
        lagBlocks = syncState.latestBlock - syncState.lastProcessedBlock;
      }
    } catch {
      lagBlocks = null;
    }

    syncPerformanceHistory.push({ duration, updated: false, lagBlocks });
    if (syncPerformanceHistory.length > ADAPTIVE_WINDOW_SIZE * 2) {
      syncPerformanceHistory.shift();
    }

    try {
      await writeJsonFile('worker/heartbeat/v1', {
        at,
        workerId: env.INSIGHT_WORKER_ID || 'embedded',
        lockKey: global.oracleMonitorWorkerLockKey ?? null,
        pid: typeof process !== 'undefined' ? process.pid : null,
        runtime: process.env.NEXT_RUNTIME ?? null,
        durationMs: duration,
        lastError,
      });
    } catch (error) {
      logger.error('Failed to write worker heartbeat', { error });
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

export function startWorker(): void {
  if (global.oracleMonitorWorkerStarted) {
    logger.debug('Worker already started');
    return;
  }

  void tryAcquireWorkerLock().then((ok) => {
    if (!ok) {
      logger.info('Failed to acquire worker lock, retrying in 30 seconds');
      setTimeout(() => startWorker(), 30000);
      return;
    }

    logger.info('Starting background sync worker...');
    global.oracleMonitorWorkerStarted = true;

    void tickWorker();

    const interval = setInterval(() => {
      void tickWorker();
    }, SYNC_INTERVAL);

    global.oracleMonitorWorkerInterval = interval;
  });
}

export async function stopWorker(): Promise<void> {
  if (!global.oracleMonitorWorkerStarted) return;

  logger.info('Stopping background sync worker...');

  if (global.oracleMonitorWorkerInterval) {
    clearInterval(global.oracleMonitorWorkerInterval);
  }

  await releaseWorkerLock();

  global.oracleMonitorWorkerStarted = false;
  global.oracleMonitorWorkerInterval = undefined;

  logger.info('Background sync worker stopped');
}

export async function tickWorkerOnce(): Promise<void> {
  await tickWorker();
}

export function getWorkerStatus(): {
  isRunning: boolean;
  hasLock: boolean;
  tickInProgress: boolean;
  lastTickAt?: string;
  lastTickDurationMs?: number;
  lastError: string | null;
} {
  return {
    isRunning: global.oracleMonitorWorkerStarted ?? false,
    hasLock: global.oracleMonitorWorkerLockClient !== undefined,
    tickInProgress: global.oracleMonitorWorkerTickInProgress ?? false,
    lastTickAt: global.oracleMonitorWorkerLastTickAt,
    lastTickDurationMs: global.oracleMonitorWorkerLastTickDurationMs,
    lastError: global.oracleMonitorWorkerLastError ?? null,
  };
}

export function resetWorkerState(): void {
  global.oracleMonitorWorkerStarted = undefined;
  global.oracleMonitorWorkerLockClient = undefined;
  global.oracleMonitorWorkerLockKey = undefined;
  global.oracleMonitorWorkerInterval = undefined;
  global.oracleMonitorWorkerTickInProgress = undefined;
  global.oracleMonitorWorkerLastTickAt = undefined;
  global.oracleMonitorWorkerLastTickDurationMs = undefined;
  global.oracleMonitorWorkerLastError = undefined;
  global.oracleMonitorWorkerLastMaintenanceAt = undefined;
}

// Auto-start worker if not disabled
const embeddedWorkerDisabled = ['1', 'true'].includes(
  env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
);

if (!embeddedWorkerDisabled) {
  startWorker();
}
