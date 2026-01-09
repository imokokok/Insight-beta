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
  "event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)"
]);

export async function getOracleEnv() {
  const config = await readOracleConfig();
  const rpcUrl = config.rpcUrl || env.INSIGHT_RPC_URL;
  const contractAddress = (config.contractAddress || env.INSIGHT_ORACLE_ADDRESS) as Address;
  const chain = (config.chain || (env.INSIGHT_CHAIN as StoredState["chain"] | undefined) || "Local") as StoredState["chain"];
  return { rpcUrl, contractAddress, chain };
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
  const { rpcUrl, contractAddress, chain } = await getOracleEnv();
  const syncState = await getSyncState();

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
    const fromBlock = syncState.lastProcessedBlock === 0n ? latest : syncState.lastProcessedBlock + 1n;
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

    const [createdLogs, disputedLogs, resolvedLogs] = await Promise.all([
      client.getLogs({ address: contractAddress, event: abi[0], fromBlock, toBlock }),
      client.getLogs({ address: contractAddress, event: abi[1], fromBlock, toBlock }),
      client.getLogs({ address: contractAddress, event: abi[2], fromBlock, toBlock })
    ]);

    let updated = false;

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
        votingEndsAt: new Date(new Date(disputedAt).getTime() + 72 * 3600 * 1000).toISOString(),
        status: "Voting",
        currentVotesFor: 0,
        currentVotesAgainst: 0,
        totalVotes: 0
      };
      
      await upsertDispute(dispute);
      updated = true;
    }

    for (const log of resolvedLogs) {
      const args = log.args;
      if (!args) continue;
      const id = args.assertionId as `0x${string}`;
      const resolvedAt = toIsoFromSeconds(args.resolvedAt as bigint);
      
      const assertion = await fetchAssertion(id);
      if (assertion) {
        assertion.status = "Resolved";
        assertion.resolvedAt = resolvedAt;
        await upsertAssertion(assertion);
        updated = true;
      }

      const dispute = await fetchDispute(`D:${id}`);
      if (dispute) {
        dispute.status = "Executed";
        // Update votingEndsAt to resolvedAt if it resolved early? 
        // Or keep original voting deadline?
        // Original code didn't change votingEndsAt.
        // Wait, looking at original logic (from memory/previous context), it might just update status.
        // But if I want to be precise, Resolved usually means voting is over or fast-tracked.
        // Let's stick to updating status.
        // Wait, my previous thought said "votingEndsAt = resolvedAt".
        // Let's verify if I should do that.
        // If it's resolved, the vote is effectively over.
        // Let's set it for clarity.
        dispute.votingEndsAt = resolvedAt; 
        await upsertDispute(dispute);
        updated = true;
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
      syncState.lastProcessedBlock,
      attemptAt,
      syncState.sync.lastSuccessAt,
      syncState.sync.lastDurationMs,
      code
    );
    throw e;
  }
}
