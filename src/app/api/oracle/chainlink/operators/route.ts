import type { NextRequest } from 'next/server';

import type { Operator } from '@/features/oracle/chainlink/types/chainlink';
import { ok, error } from '@/lib/api/apiResponse';
import { getChainlinkMockOperators } from '@/lib/mock/oracleMockData';

interface OperatorsQueryParams {
  status?: 'online' | 'offline' | 'all';
  chain?: string;
}

function parseQueryParams(request: NextRequest): OperatorsQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    status: (searchParams.get('status') as OperatorsQueryParams['status']) ?? 'all',
    chain: searchParams.get('chain') ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { status, chain } = parseQueryParams(request);

    let operators: Operator[] = getChainlinkMockOperators();

    if (status === 'online') {
      operators = operators.filter((op) => op.online);
    } else if (status === 'offline') {
      operators = operators.filter((op) => !op.online);
    }

    const onlineCount = operators.filter((op) => op.online).length;
    const offlineCount = operators.filter((op) => !op.online).length;

    return ok({
      operators,
      metadata: {
        total: operators.length,
        online: onlineCount,
        offline: offlineCount,
        filter: status,
        chain: chain ?? 'ethereum',
        source: 'mock',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - Operator data requires Chainlink official API integration',
        dataAvailability: {
          realDataAvailable: false,
          reason:
            'Chainlink node operator data is maintained by Chainlink Labs and ' +
            'requires access to the Chainlink Network API or on-chain registry contracts. ' +
            'Real operator status, response times, and supported feeds should be fetched ' +
            "from Chainlink's official data sources or the Chainlink Operator Registry.",
          alternativeSources: [
            'Chainlink Official Website (chain.link)',
            'Chainlink Network Status Page',
            'Chainlink Operator Registry Smart Contract',
          ],
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch operators';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
