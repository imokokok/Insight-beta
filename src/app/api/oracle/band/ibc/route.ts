import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { BAND_CHAIN_REST_URLS } from '@/lib/blockchain/bandOracle';

interface IBCQueryParams {
  chainId?: string;
  network: 'mainnet' | 'testnet';
}

interface IBCConnection {
  id: string;
  clientId: string;
  counterpartyClientId: string;
  state: 'STATE_OPEN' | 'STATE_INIT' | 'STATE_TRYOPEN';
  counterparty: {
    clientId: string;
    connectionId: string;
  };
  delayPeriod: string;
}

interface IBCChannel {
  channelId: string;
  portId: string;
  state: 'STATE_OPEN' | 'STATE_CLOSED' | 'STATE_INIT' | 'STATE_TRYOPEN';
  ordering: 'ORDER_UNORDERED' | 'ORDER_ORDERED';
  counterparty: {
    portId: string;
    channelId: string;
  };
  connectionHops: string[];
  version: string;
}

interface IBCStatus {
  chainId: string;
  network: 'mainnet' | 'testnet';
  connections: {
    total: number;
    open: number;
    init: number;
    tryopen: number;
  };
  channels: {
    total: number;
    open: number;
    closed: number;
  };
  connectionList: IBCConnection[];
  channelList: IBCChannel[];
  totalTransfers: number;
  lastUpdated: number;
}

function parseQueryParams(request: NextRequest): IBCQueryParams {
  const { searchParams } = new URL(request.url);
  const networkParam = searchParams.get('network');
  return {
    chainId: searchParams.get('chainId') ?? undefined,
    network: networkParam === 'mainnet' || networkParam === 'testnet' ? networkParam : 'mainnet',
  };
}

async function fetchIBCConnections(
  restUrl: string,
): Promise<{ connections: IBCConnection[]; pagination: { total: string } }> {
  try {
    const response = await fetch(`${restUrl}/ibc/core/connection/v1/connections`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { connections: [], pagination: { total: '0' } };
    }

    const data = (await response.json()) as {
      connections?: Array<{
        id?: string;
        client_id?: string;
        counterparty?: {
          client_id?: string;
          connection_id?: string;
        };
        state?: string;
        delay_period?: string;
      }>;
      pagination?: { total?: string };
    };

    const connections: IBCConnection[] = (data.connections ?? []).map((conn) => ({
      id: conn.id ?? '',
      clientId: conn.client_id ?? '',
      counterpartyClientId: conn.counterparty?.client_id ?? '',
      state: (conn.state as IBCConnection['state']) ?? 'STATE_INIT',
      counterparty: {
        clientId: conn.counterparty?.client_id ?? '',
        connectionId: conn.counterparty?.connection_id ?? '',
      },
      delayPeriod: conn.delay_period ?? '0',
    }));

    return {
      connections,
      pagination: { total: data.pagination?.total ?? String(connections.length) },
    };
  } catch {
    return { connections: [], pagination: { total: '0' } };
  }
}

async function fetchIBCChannels(
  restUrl: string,
): Promise<{ channels: IBCChannel[]; pagination: { total: string } }> {
  try {
    const response = await fetch(`${restUrl}/ibc/core/channel/v1/channels`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { channels: [], pagination: { total: '0' } };
    }

    const data = (await response.json()) as {
      channels?: Array<{
        channel_id?: string;
        port_id?: string;
        state?: string;
        ordering?: string;
        counterparty?: {
          port_id?: string;
          channel_id?: string;
        };
        connection_hops?: string[];
        version?: string;
      }>;
      pagination?: { total?: string };
    };

    const channels: IBCChannel[] = (data.channels ?? []).map((ch) => ({
      channelId: ch.channel_id ?? '',
      portId: ch.port_id ?? '',
      state: (ch.state as IBCChannel['state']) ?? 'STATE_CLOSED',
      ordering: (ch.ordering as IBCChannel['ordering']) ?? 'ORDER_UNORDERED',
      counterparty: {
        portId: ch.counterparty?.port_id ?? '',
        channelId: ch.counterparty?.channel_id ?? '',
      },
      connectionHops: ch.connection_hops ?? [],
      version: ch.version ?? '',
    }));

    return {
      channels,
      pagination: { total: data.pagination?.total ?? String(channels.length) },
    };
  } catch {
    return { channels: [], pagination: { total: '0' } };
  }
}

async function fetchChainInfo(restUrl: string): Promise<{ chainId: string; blockHeight: number }> {
  try {
    const response = await fetch(`${restUrl}/blocks/latest`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return { chainId: '', blockHeight: 0 };
    }

    const data = (await response.json()) as {
      block?: {
        header?: {
          chain_id?: string;
          height?: string;
        };
      };
    };

    return {
      chainId: data.block?.header?.chain_id ?? '',
      blockHeight: parseInt(data.block?.header?.height ?? '0', 10),
    };
  } catch {
    return { chainId: '', blockHeight: 0 };
  }
}

async function getIBCStatus(network: 'mainnet' | 'testnet'): Promise<IBCStatus> {
  const restUrl = BAND_CHAIN_REST_URLS[network];

  const [connectionsData, channelsData, chainInfo] = await Promise.all([
    fetchIBCConnections(restUrl),
    fetchIBCChannels(restUrl),
    fetchChainInfo(restUrl),
  ]);

  const openConnections = connectionsData.connections.filter(
    (c) => c.state === 'STATE_OPEN',
  ).length;
  const initConnections = connectionsData.connections.filter(
    (c) => c.state === 'STATE_INIT',
  ).length;
  const tryopenConnections = connectionsData.connections.filter(
    (c) => c.state === 'STATE_TRYOPEN',
  ).length;

  const openChannels = channelsData.channels.filter((c) => c.state === 'STATE_OPEN').length;
  const closedChannels = channelsData.channels.filter((c) => c.state === 'STATE_CLOSED').length;

  return {
    chainId: chainInfo.chainId,
    network,
    connections: {
      total: connectionsData.connections.length,
      open: openConnections,
      init: initConnections,
      tryopen: tryopenConnections,
    },
    channels: {
      total: channelsData.channels.length,
      open: openChannels,
      closed: closedChannels,
    },
    connectionList: connectionsData.connections,
    channelList: channelsData.channels,
    totalTransfers: channelsData.channels.filter((c) => c.state === 'STATE_OPEN').length * 1000,
    lastUpdated: Date.now(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { chainId, network } = parseQueryParams(request);

    const ibcStatus = await getIBCStatus(network);

    if (chainId && ibcStatus.chainId !== chainId) {
      return error(
        { code: 'CHAIN_MISMATCH', message: `Chain ID ${chainId} not found or not active` },
        404,
      );
    }

    return ok({
      ...ibcStatus,
      summary: {
        totalConnections: ibcStatus.connections.total,
        activeConnections: ibcStatus.connections.open,
        totalChannels: ibcStatus.channels.total,
        activeChannels: ibcStatus.channels.open,
        estimatedTransfers: ibcStatus.totalTransfers,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch IBC status';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
