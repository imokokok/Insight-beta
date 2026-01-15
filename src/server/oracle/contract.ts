import { createPublicClient, formatEther, http } from "viem";
import { oracleAbi } from "@/lib/oracleAbi";
import { parseRpcUrls } from "@/lib/utils";
import { env } from "@/lib/env";

function getRpcTimeoutMs() {
  const raw = Number(
    env.INSIGHT_RPC_TIMEOUT_MS || env.INSIGHT_DEPENDENCY_TIMEOUT_MS || 10_000,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 10_000;
}

export async function getBondData(
  rpcUrl: string | undefined,
  contractAddress: string | undefined,
) {
  let bondWei: string | null = null;
  let bondEth: string | null = null;

  if (rpcUrl && contractAddress) {
    try {
      const urls = parseRpcUrls(rpcUrl);
      for (const url of urls) {
        try {
          const client = createPublicClient({
            transport: http(url, {
              timeout: getRpcTimeoutMs(),
              retryCount: 2,
              retryDelay: 250,
            }),
          });
          const bond = (await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: oracleAbi,
            functionName: "getBond",
            args: [],
          })) as bigint;
          bondWei = bond.toString(10);
          bondEth = formatEther(bond);
          break;
        } catch {
          continue;
        }
      }
    } catch {
      bondWei = null;
      bondEth = null;
    }
  }
  return { bondWei, bondEth };
}

export async function getOwnerData(
  rpcUrl: string | undefined,
  contractAddress: string | undefined,
) {
  let owner: string | null = null;
  let isContractOwner: boolean | null = null;

  if (rpcUrl && contractAddress) {
    try {
      const urls = parseRpcUrls(rpcUrl);
      for (const url of urls) {
        try {
          const client = createPublicClient({
            transport: http(url, {
              timeout: getRpcTimeoutMs(),
              retryCount: 2,
              retryDelay: 250,
            }),
          });
          const ownerAddress = (await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: oracleAbi,
            functionName: "owner",
            args: [],
          })) as `0x${string}`;
          const code = await client.getBytecode({ address: ownerAddress });
          owner = ownerAddress;
          isContractOwner =
            code !== null && code !== undefined && code !== "0x";
          break;
        } catch {
          continue;
        }
      }
    } catch {
      owner = null;
      isContractOwner = null;
    }
  }

  return { owner, isContractOwner };
}
