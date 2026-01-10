import { handleApi, rateLimit } from "@/server/apiResponse";
import { getAssertion, getDisputeByAssertionId, getSyncState, readOracleConfig } from "@/server/oracle";
import { createPublicClient, http, parseAbi } from "viem";

const eventsAbi = parseAbi([
  "event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)",
  "event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)",
  "event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)",
  "event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)"
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "evidence_get", limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    const { id } = await params;
    const assertion = await getAssertion(id);
    const dispute = await getDisputeByAssertionId(id);
    const config = await readOracleConfig();
    const sync = await getSyncState();

    const url = new URL(request.url);
    const includeLogs = url.searchParams.get("includeLogs") === "1";
    const maxBlocks = Math.min(
      1_000_000,
      Math.max(10_000, Number(url.searchParams.get("maxBlocks") ?? 200_000))
    );

    let logs: unknown[] | null = null;
    let logsMeta: { fromBlock: string; toBlock: string; contractAddress: string } | null = null;

    if (includeLogs && assertion && config.rpcUrl && config.contractAddress && assertion.txHash && assertion.txHash !== "0x0") {
      try {
        const client = createPublicClient({ transport: http(config.rpcUrl) });
        const receipt = await client.getTransactionReceipt({ hash: assertion.txHash as `0x${string}` });
        const latest = await client.getBlockNumber();
        const fromBlock = receipt.blockNumber;
        const toBlock = fromBlock + BigInt(maxBlocks) < latest ? fromBlock + BigInt(maxBlocks) : latest;

        const [created, disputed, resolved, votes] = await Promise.all([
          client.getLogs({ address: config.contractAddress as `0x${string}`, event: eventsAbi[0], args: { assertionId: id as `0x${string}` }, fromBlock, toBlock }),
          client.getLogs({ address: config.contractAddress as `0x${string}`, event: eventsAbi[1], args: { assertionId: id as `0x${string}` }, fromBlock, toBlock }),
          client.getLogs({ address: config.contractAddress as `0x${string}`, event: eventsAbi[2], args: { assertionId: id as `0x${string}` }, fromBlock, toBlock }),
          client.getLogs({ address: config.contractAddress as `0x${string}`, event: eventsAbi[3], args: { assertionId: id as `0x${string}` }, fromBlock, toBlock })
        ]);

        logs = [...created, ...disputed, ...resolved, ...votes].map((l) => ({
          blockNumber: l.blockNumber?.toString(10) ?? null,
          transactionHash: l.transactionHash ?? null,
          logIndex: l.logIndex ?? null,
          eventName: l.eventName,
          args: l.args ?? null
        }));
        logsMeta = {
          fromBlock: fromBlock.toString(10),
          toBlock: toBlock.toString(10),
          contractAddress: config.contractAddress
        };
      } catch {
        logs = null;
        logsMeta = null;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      config,
      sync,
      assertion,
      dispute,
      logsMeta,
      logs
    };
  });
}
