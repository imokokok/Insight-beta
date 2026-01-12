import { createPublicClient, formatEther, http } from "viem";
import { oracleAbi } from "@/lib/oracleAbi";
import { parseRpcUrls } from "@/lib/utils";

export async function getBondData(
  rpcUrl: string | undefined,
  contractAddress: string | undefined
) {
  let bondWei: string | null = null;
  let bondEth: string | null = null;

  if (rpcUrl && contractAddress) {
    try {
      const urls = parseRpcUrls(rpcUrl);
      for (const url of urls) {
        try {
          const client = createPublicClient({ transport: http(url) });
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
  contractAddress: string | undefined
) {
  let owner: string | null = null;
  let isContractOwner: boolean | null = null;

  if (rpcUrl && contractAddress) {
    try {
      const urls = parseRpcUrls(rpcUrl);
      for (const url of urls) {
        try {
          const client = createPublicClient({ transport: http(url) });
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
