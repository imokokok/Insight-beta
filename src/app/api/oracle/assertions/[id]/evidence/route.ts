import { handleApi, rateLimit } from "@/server/apiResponse";
import {
  getAssertion,
  getDisputeByAssertionId,
  getOracleEnv,
  getSyncState,
  readOracleConfig,
  redactOracleConfig,
} from "@/server/oracle";
import { verifyAdmin } from "@/server/adminAuth";
import { createPublicClient, http, parseAbi } from "viem";
import { parseRpcUrls } from "@/lib/utils";
import { env } from "@/lib/config/env";

const eventsAbi = parseAbi([
  "event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)",
  "event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)",
  "event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)",
  "event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "evidence_get",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const degraded = ["1", "true"].includes(
      (env.INSIGHT_VOTING_DEGRADATION || "").toLowerCase(),
    );
    const voteTrackingEnabled =
      ["1", "true"].includes((env.INSIGHT_ENABLE_VOTING || "").toLowerCase()) &&
      !["1", "true"].includes(
        (env.INSIGHT_DISABLE_VOTE_TRACKING || "").toLowerCase(),
      );

    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");
    const { id } = await params;
    const assertion = instanceId
      ? await getAssertion(id, instanceId)
      : await getAssertion(id);
    const dispute = instanceId
      ? await getDisputeByAssertionId(id, instanceId)
      : await getDisputeByAssertionId(id);
    const admin = await verifyAdmin(request, {
      strict: false,
      scope: "oracle_config_write",
    });
    const config = instanceId
      ? await readOracleConfig(instanceId)
      : await readOracleConfig();
    const envConfig = instanceId
      ? await getOracleEnv(instanceId)
      : await getOracleEnv();
    const sync = instanceId
      ? await getSyncState(instanceId)
      : await getSyncState();
    const includeLogs = admin.ok && url.searchParams.get("includeLogs") === "1";
    const maxBlocks = Math.min(
      1_000_000,
      Math.max(10_000, Number(url.searchParams.get("maxBlocks") ?? 200_000)),
    );

    let logs: unknown[] | null = null;
    let logsMeta: {
      fromBlock: string;
      toBlock: string;
      contractAddress: string;
    } | null = null;

    if (
      includeLogs &&
      assertion &&
      envConfig.rpcUrl &&
      envConfig.contractAddress &&
      assertion.txHash &&
      assertion.txHash !== "0x0"
    ) {
      try {
        const rpcUrls = parseRpcUrls(envConfig.rpcUrl);
        if (rpcUrls.length === 0) {
          logs = null;
          logsMeta = null;
          return {
            generatedAt: new Date().toISOString(),
            config: admin.ok ? config : redactOracleConfig(config),
            sync: admin.ok
              ? sync
              : { ...sync, rpcActiveUrl: null, rpcStats: null },
            assertion,
            dispute,
            logsMeta,
            logs,
          };
        }
        let created: unknown[] = [];
        let disputed: unknown[] = [];
        let resolved: unknown[] = [];
        let votes: unknown[] = [];
        let fromBlock: bigint | null = null;
        let toBlock: bigint | null = null;
        for (const rpcUrl of rpcUrls) {
          try {
            const client = createPublicClient({ transport: http(rpcUrl) });
            const receipt = await client.getTransactionReceipt({
              hash: assertion.txHash as `0x${string}`,
            });
            const latest = await client.getBlockNumber();
            fromBlock = receipt.blockNumber;
            toBlock =
              fromBlock + BigInt(maxBlocks) < latest
                ? fromBlock + BigInt(maxBlocks)
                : latest;
            const res = await Promise.all([
              client.getLogs({
                address: envConfig.contractAddress as `0x${string}`,
                event: eventsAbi[0],
                args: { assertionId: id as `0x${string}` },
                fromBlock,
                toBlock,
              }),
              client.getLogs({
                address: envConfig.contractAddress as `0x${string}`,
                event: eventsAbi[1],
                args: { assertionId: id as `0x${string}` },
                fromBlock,
                toBlock,
              }),
              client.getLogs({
                address: envConfig.contractAddress as `0x${string}`,
                event: eventsAbi[2],
                args: { assertionId: id as `0x${string}` },
                fromBlock,
                toBlock,
              }),
              voteTrackingEnabled && !degraded
                ? client.getLogs({
                    address: envConfig.contractAddress as `0x${string}`,
                    event: eventsAbi[3],
                    args: { assertionId: id as `0x${string}` },
                    fromBlock,
                    toBlock,
                  })
                : Promise.resolve([]),
            ]);
            created = res[0] as unknown[];
            disputed = res[1] as unknown[];
            resolved = res[2] as unknown[];
            votes = res[3] as unknown[];
            break;
          } catch {
            continue;
          }
        }
        if (fromBlock === null || toBlock === null) {
          logs = null;
          logsMeta = null;
          return {
            generatedAt: new Date().toISOString(),
            config: admin.ok ? config : redactOracleConfig(config),
            sync: admin.ok
              ? sync
              : { ...sync, rpcActiveUrl: null, rpcStats: null },
            assertion,
            dispute,
            logsMeta,
            logs,
          };
        }

        logs = [...created, ...disputed, ...resolved, ...votes].map((l) => {
          const log = l as {
            blockNumber?: bigint | null;
            transactionHash?: string | null;
            logIndex?: number | null;
            eventName?: string | null;
            args?: unknown;
          };
          return {
            blockNumber: log.blockNumber ? log.blockNumber.toString(10) : null,
            transactionHash: log.transactionHash ?? null,
            logIndex: log.logIndex ?? null,
            eventName: log.eventName ?? null,
            args: log.args ?? null,
          };
        });
        logsMeta = {
          fromBlock: fromBlock.toString(10),
          toBlock: toBlock.toString(10),
          contractAddress: envConfig.contractAddress,
        };
      } catch {
        logs = null;
        logsMeta = null;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      config: admin.ok ? config : redactOracleConfig(config),
      sync: admin.ok ? sync : { ...sync, rpcActiveUrl: null, rpcStats: null },
      assertion,
      dispute,
      logsMeta,
      logs,
    };
  });
}
