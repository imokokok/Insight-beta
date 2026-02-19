import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import {
  createBandClient,
  BAND_CONTRACT_ADDRESSES,
  BAND_CHAIN_REST_URLS,
} from '@/lib/blockchain/bandOracle';
import { getDefaultRpcUrl } from '@/lib/blockchain/chainConfig';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

interface BridgeStatusQueryParams {
  sourceChain?: SupportedChain;
  destinationChain?: string;
  status?: 'active' | 'degraded' | 'inactive';
}

interface BridgeStatus {
  id: string;
  sourceChain: SupportedChain;
  destinationChain: string;
  status: 'active' | 'degraded' | 'inactive';
  lastRelayTime: number;
  pendingRequests: number;
  issues: string[];
  contractAddress: string;
}

interface BandChainStatus {
  network: 'mainnet' | 'testnet';
  restUrl: string;
  blockHeight: number;
  blockHash: string;
  timestamp: number;
  status: 'active' | 'degraded' | 'inactive';
}

function parseQueryParams(request: NextRequest): BridgeStatusQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    sourceChain: searchParams.get('sourceChain') as SupportedChain | undefined,
    destinationChain: searchParams.get('destinationChain') ?? undefined,
    status: searchParams.get('status') as BridgeStatusQueryParams['status'],
  };
}

function isValidChain(chain: string | undefined): chain is SupportedChain {
  if (!chain) return false;
  return Object.keys(BAND_CONTRACT_ADDRESSES).includes(chain);
}

async function getBandChainStatus(network: 'mainnet' | 'testnet'): Promise<BandChainStatus> {
  const restUrl = BAND_CHAIN_REST_URLS[network];

  try {
    const response = await fetch(`${restUrl}/blocks/latest`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        network,
        restUrl,
        blockHeight: 0,
        blockHash: '',
        timestamp: 0,
        status: 'degraded',
      };
    }

    const data = (await response.json()) as {
      block?: { header?: { height?: string; time?: string } };
      block_id?: { hash?: string };
    };

    return {
      network,
      restUrl,
      blockHeight: parseInt(data.block?.header?.height ?? '0', 10),
      blockHash: data.block_id?.hash ?? '',
      timestamp: data.block?.header?.time ? new Date(data.block.header.time).getTime() : Date.now(),
      status: 'active',
    };
  } catch {
    return {
      network,
      restUrl,
      blockHeight: 0,
      blockHash: '',
      timestamp: 0,
      status: 'inactive',
    };
  }
}

async function getBridgeStatusForChain(chain: SupportedChain): Promise<BridgeStatus | null> {
  const contractAddress = BAND_CONTRACT_ADDRESSES[chain];
  if (!contractAddress) return null;

  const rpcUrl = getDefaultRpcUrl(chain);
  const client = createBandClient(chain, rpcUrl, { enableCosmosSupport: true });

  try {
    const bridgeStatus = await client.checkBridgeStatus();

    return {
      id: `bridge-${chain}`,
      sourceChain: chain,
      destinationChain: 'band-chain',
      status: bridgeStatus.status,
      lastRelayTime: bridgeStatus.lastRelayTime,
      pendingRequests: bridgeStatus.pendingRequests,
      issues: bridgeStatus.issues,
      contractAddress,
    };
  } catch (err) {
    return {
      id: `bridge-${chain}`,
      sourceChain: chain,
      destinationChain: 'band-chain',
      status: 'inactive',
      lastRelayTime: 0,
      pendingRequests: 0,
      issues: [err instanceof Error ? err.message : 'Unknown error'],
      contractAddress,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { sourceChain, destinationChain, status } = parseQueryParams(request);

    if (sourceChain) {
      if (!isValidChain(sourceChain)) {
        return error(
          { code: 'INVALID_CHAIN', message: `Invalid source chain: ${sourceChain}` },
          400,
        );
      }

      const bridgeStatus = await getBridgeStatusForChain(sourceChain);
      if (!bridgeStatus) {
        return error(
          {
            code: 'UNSUPPORTED_CHAIN',
            message: `Band Protocol not supported on chain: ${sourceChain}`,
          },
          400,
        );
      }

      if (status && bridgeStatus.status !== status) {
        return ok({
          sourceChain,
          status,
          data: null,
          message: `No bridge found with status: ${status}`,
        });
      }

      return ok({
        sourceChain,
        destinationChain: destinationChain ?? 'band-chain',
        data: bridgeStatus,
      });
    }

    const supportedChains = Object.entries(BAND_CONTRACT_ADDRESSES)
      .filter(([, address]) => address !== undefined)
      .map(([chainName]) => chainName as SupportedChain);

    const bridgeStatuses = await Promise.all(supportedChains.map(getBridgeStatusForChain));

    let filteredBridges = bridgeStatuses.filter((b): b is BridgeStatus => b !== null);

    if (destinationChain) {
      filteredBridges = filteredBridges.filter(
        (b) => b.destinationChain.toLowerCase() === destinationChain.toLowerCase(),
      );
    }

    if (status) {
      filteredBridges = filteredBridges.filter((b) => b.status === status);
    }

    const [mainnetStatus, testnetStatus] = await Promise.all([
      getBandChainStatus('mainnet'),
      getBandChainStatus('testnet'),
    ]);

    return ok({
      totalBridges: filteredBridges.length,
      bandChainStatus: {
        mainnet: mainnetStatus,
        testnet: testnetStatus,
      },
      data: filteredBridges,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch bridge status';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
