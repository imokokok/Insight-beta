'use client';

import { RefreshCw, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { DEFAULT_CHAINS } from '../hooks/useGasMonitor';

interface GasChainSelectorProps {
  selectedChains: string[];
  setSelectedChains: (chains: string[]) => void;
  showTrend: boolean;
  setShowTrend: (show: boolean) => void;
  handleToggleChain: (chain: string) => void;
}

export function GasChainSelector({
  selectedChains,
  setSelectedChains,
  showTrend,
  setShowTrend,
  handleToggleChain,
}: GasChainSelectorProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Chain Selection</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CHAINS.map((chain) => (
            <Button
              key={chain}
              variant={selectedChains.includes(chain) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleChain(chain)}
            >
              {chain.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowTrend(!showTrend)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {showTrend ? 'Hide Trend Chart' : 'Show Trend Chart'}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setSelectedChains(DEFAULT_CHAINS)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
