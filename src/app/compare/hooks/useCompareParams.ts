'use client';

import { useState, useCallback, useEffect } from 'react';

import { ORACLE_PROTOCOLS } from '@/types/oracle';
import type { OracleProtocol } from '@/types/oracle';

const STORAGE_KEY = 'compare-params';

interface CompareParams {
  selectedProtocols: OracleProtocol[];
  selectedSymbols: string[];
}

interface UseCompareParamsReturn {
  selectedProtocols: OracleProtocol[];
  selectedSymbols: string[];
  setSelectedProtocols: React.Dispatch<React.SetStateAction<OracleProtocol[]>>;
  setSelectedSymbols: React.Dispatch<React.SetStateAction<string[]>>;
  resetParams: () => void;
}

function loadParamsFromStorage(): CompareParams {
  if (typeof window === 'undefined') {
    return {
      selectedProtocols: [...ORACLE_PROTOCOLS],
      selectedSymbols: ['ETH/USD', 'BTC/USD'],
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        selectedProtocols: parsed.selectedProtocols || [...ORACLE_PROTOCOLS],
        selectedSymbols: parsed.selectedSymbols || ['ETH/USD', 'BTC/USD'],
      };
    }
  } catch {
    // ignore
  }

  return {
    selectedProtocols: [...ORACLE_PROTOCOLS],
    selectedSymbols: ['ETH/USD', 'BTC/USD'],
  };
}

function saveParamsToStorage(params: CompareParams): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // ignore
  }
}

export function useCompareParams(): UseCompareParamsReturn {
  const [selectedProtocols, setSelectedProtocols] = useState<OracleProtocol[]>(
    () => loadParamsFromStorage().selectedProtocols,
  );
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(
    () => loadParamsFromStorage().selectedSymbols,
  );

  useEffect(() => {
    saveParamsToStorage({ selectedProtocols, selectedSymbols });
  }, [selectedProtocols, selectedSymbols]);

  const resetParams = useCallback(() => {
    setSelectedProtocols([...ORACLE_PROTOCOLS]);
    setSelectedSymbols(['ETH/USD', 'BTC/USD']);
  }, []);

  return {
    selectedProtocols,
    selectedSymbols,
    setSelectedProtocols,
    setSelectedSymbols,
    resetParams,
  };
}
