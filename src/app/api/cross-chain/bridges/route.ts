import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess } from '@/shared/utils';

interface BridgeInfo {
  name: string;
  displayName: string;
  feePercent: number;
  supportedChains: string[];
}

const BRIDGES: BridgeInfo[] = [
  {
    name: 'multichain',
    displayName: 'Multichain',
    feePercent: 0.1,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base'],
  },
  {
    name: 'stargate',
    displayName: 'Stargate',
    feePercent: 0.06,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'],
  },
  {
    name: 'layerzero',
    displayName: 'LayerZero',
    feePercent: 0.05,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base'],
  },
  {
    name: 'wormhole',
    displayName: 'Wormhole',
    feePercent: 0.03,
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'solana'],
  },
  {
    name: 'across',
    displayName: 'Across Protocol',
    feePercent: 0.04,
    supportedChains: ['ethereum', 'arbitrum', 'optimism', 'base'],
  },
];

async function handleGet() {
  return apiSuccess({
    bridges: BRIDGES,
    meta: {
      dataSource: 'static',
      isExample: true,
      disclaimer: '此数据为静态示例数据，非实时监控数据',
      timestamp: new Date().toISOString(),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
