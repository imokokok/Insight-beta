import { createPublicClient, http, parseAbi, type Address } from "viem";
import type { Assertion, Dispute } from "@/lib/oracleTypes";
import { readOracleConfig } from "@/server/oracleConfig";
import { 
  readOracleState, 
  getSyncState, 
  fetchAssertion,
  fetchDispute, 
  upsertAssertion, 
  upsertDispute, 
  updateSyncState,
  type StoredState 
} from "@/server/oracleState";
import { isZeroBytes32, toIsoFromSeconds } from "@/lib/utils";
import { env } from "@/lib/env";

const abi = parseAbi([
  "event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)",
  "event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)",
  "event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)",
  "event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)"
]);

export async function getOracleEnv() {
  const config = await readOracleConfig();
  const rpcUrl = config.rpcUrl || env.INSIGHT_RPC_URL;
  const contractAddress = (config.contractAddress || env.INSIGHT_ORACLE_ADDRESS) as Address;
  const chain = (config.chain || (env.INSIGHT_CHAIN as StoredState["chain"] | undefined) || "Local") as StoredState["chain"];
  const startBlock = BigInt(config.startBlock ?? 0);
  const maxBlockRange = BigInt(config.maxBlockRange ?? 10_000);
  const votingPeriodMs = Number(config.votingPeriodHours ?? 72) * 3600 * 1000;
  return { rpcUrl, contractAddress, chain, startBlock, maxBlockRange, votingPeriodMs };
}

let inflight: Promise<{ updated: boolean; state: StoredState }> | null = null;

export async function ensureOracleSynced() {
  if (!inflight) {
    inflight = syncOracleOnce().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function isOracleSyncing() {
  return inflight !== null;
}

function toSyncErrorCode(error: unknown) {
  if (error instanceof Error) {
    const message = error.message;
    if (message === "contract_not_found") return "contract_not_found";
    const lowered = message.toLowerCase();
    if (
      lowered.includes("failed to fetch") ||
      lowered.includes("fetch failed") ||
      lowered.includes("econnrefused") ||
      lowered.includes("timeout") ||
      lowered.includes("timed out") ||
      lowered.includes("socket")
    ) {
      return "rpc_unreachable";
    }
  }
  return "sync_failed";
}

async function syncOracleOnce(): Promise<{ updated: boolean; state: StoredState }> {
  const { rpcUrl, contractAddress, chain, startBlock, maxBlockRange, votingPeriodMs } = await getOracleEnv();
  const syncState = await getSyncState();
  let lastProcessedBlock = syncState.lastProcessedBlock;

  if (!rpcUrl || !contractAddress) {
    return { updated: false, state: await readOracleState() };
  }

  const attemptAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const bytecode = await client.getBytecode({ address: contractAddress });
    if (!bytecode || bytecode === "0x") {
      throw new Error("contract_not_found");
    }

    const latest = await client.getBlockNumber();
    const fromBlock =
      syncState.lastProcessedBlock === 0n
        ? (startBlock > 0n
            ? startBlock
            : (latest > maxBlockRange ? latest - maxBlockRange : 0n))
        : syncState.lastProcessedBlock + 1n;
    const toBlock = latest;

    if (fromBlock > toBlock) {
      await updateSyncState(
        toBlock,
        attemptAt,
        new Date().toISOString(),
        Date.now() - startedAt,
        null
      );
      return { updated: false, state: await readOracleState() };
    }

    let updated = false;
    let cursor = fromBlock;
    let window = maxBlockRange > 0n ? maxBlockRange : 10_000n;

    while (cursor <= toBlock) {
      const rangeTo = cursor + window - 1n <= toBlock ? cursor + window - 1n : toBlock;

      let attempts = 0;
      while (true) {
        try {
          const [createdLogs, disputedLogs, resolvedLogs, voteLogs] = await Promise.all([
            client.getLogs({ address: contractAddress, event: abi[0], fromBlock: cursor, toBlock: rangeTo }),
            client.getLogs({ address: contractAddress, event: abi[1], fromBlock: cursor, toBlock: rangeTo }),
            client.getLogs({ address: contractAddress, event: abi[2], fromBlock: cursor, toBlock: rangeTo }),
            client.getLogs({ address: contractAddress, event: abi[3], fromBlock: cursor, toBlock: rangeTo })
          ]);

          for (const log of createdLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const assertedAt = toIsoFromSeconds(args.assertedAt as bigint);
            const livenessEndsAt = toIsoFromSeconds(args.livenessEndsAt as bigint);
            const txHashArg = args.txHash as `0x${string}` | undefined;
            const txHash = !isZeroBytes32(txHashArg) ? txHashArg! : ((log.transactionHash as `0x${string}`) ?? "0x0");

            const assertion: Assertion = {
              id,
              chain: chain as Assertion["chain"],
              asserter: args.asserter as `0x${string}`,
              protocol: args.protocol as string,
              market: args.market as string,
              assertion: args.assertion as string,
              assertedAt,
              livenessEndsAt,
              resolvedAt: undefined,
              status: "Pending",
              bondUsd: Number(args.bondUsd as bigint),
              txHash
            };
            
            await upsertAssertion(assertion);
            updated = true;
          }

          for (const log of disputedLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const disputedAt = toIsoFromSeconds(args.disputedAt as bigint);
            const disputer = args.disputer as `0x${string}`;

            const assertion = await fetchAssertion(id);
            if (assertion) {
              assertion.status = "Disputed";
              assertion.disputer = disputer;
              await upsertAssertion(assertion);
              updated = true;
            }

            const dispute: Dispute = {
              id: `D:${id}`,
              chain: chain as Dispute["chain"],
              assertionId: id,
              market: assertion?.market ?? id,
              disputeReason: args.reason as string,
              disputer,
              disputedAt,
              votingEndsAt: new Date(new Date(disputedAt).getTime() + votingPeriodMs).toISOString(),
              status: "Voting",
              currentVotesFor: 0,
              currentVotesAgainst: 0,
              totalVotes: 0
            };
            
            await upsertDispute(dispute);
            updated = true;
          }

          for (const log of voteLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const support = args.support as boolean;
            const weight = Number(args.weight as bigint);

            const dispute = await fetchDispute(`D:${id}`);
            if (dispute) {
              if (support) {
                dispute.currentVotesFor += weight;
              } else {
                dispute.currentVotesAgainst += weight;
              }
              dispute.totalVotes += weight;
              await upsertDispute(dispute);
              updated = true;
            }
          }

          for (const log of resolvedLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const resolvedAt = toIsoFromSeconds(args.resolvedAt as bigint);
            const outcome = args.outcome as boolean;
            
            const assertion = await fetchAssertion(id);
            if (assertion) {
              assertion.status = "Resolved";
              assertion.resolvedAt = resolvedAt;
              assertion.settlementResolution = outcome;
              await upsertAssertion(assertion);
              updated = true;
            }

            const dispute = await fetchDispute(`D:${id}`);
            if (dispute) {
              dispute.status = "Executed";
              dispute.votingEndsAt = resolvedAt;
              await upsertDispute(dispute);
              updated = true;
            }
          }

          await updateSyncState(
            rangeTo,
            attemptAt,
            syncState.sync.lastSuccessAt,
            syncState.sync.lastDurationMs,
            null
          );
          lastProcessedBlock = rangeTo;
          cursor = rangeTo + 1n;
          break;

        } catch (e) {
          attempts += 1;
          if (window > 200n) {
            window = window / 2n;
            if (window < 200n) window = 200n;
            continue;
          }
          if (attempts < 3) continue;
          throw e;
        }
      }
    }

    await updateSyncState(
      toBlock,
      attemptAt,
      new Date().toISOString(),
      Date.now() - startedAt,
      null
    );

    return { updated, state: await readOracleState() };

  } catch (e) {
    const code = toSyncErrorCode(e);
    await updateSyncState(
      lastProcessedBlock,
      attemptAt,
      syncState.sync.lastSuccessAt,
      syncState.sync.lastDurationMs,
      code
    );
    throw e;
  }
}
