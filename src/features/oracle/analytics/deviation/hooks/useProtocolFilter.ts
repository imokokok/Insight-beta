'use client';

import { useState, useCallback, useMemo } from 'react';

import type { OracleProtocol} from '@/types/oracle/protocol';
import { ORACLE_PROTOCOLS, PROTOCOL_DISPLAY_NAMES } from '@/types/oracle/protocol';

export interface ProtocolFilterState {
  selectedProtocols: OracleProtocol[];
  isAllSelected: boolean;
}

export const PROTOCOL_OPTIONS = ORACLE_PROTOCOLS.map((protocol) => ({
  id: protocol,
  name: PROTOCOL_DISPLAY_NAMES[protocol],
}));

export function useProtocolFilter(defaultProtocols: OracleProtocol[] = ORACLE_PROTOCOLS) {
  const [selectedProtocols, setSelectedProtocols] = useState<OracleProtocol[]>(defaultProtocols);

  const isAllSelected = useMemo(
    () => selectedProtocols.length === ORACLE_PROTOCOLS.length,
    [selectedProtocols.length],
  );

  const isProtocolSelected = useCallback(
    (protocol: OracleProtocol) => selectedProtocols.includes(protocol),
    [selectedProtocols],
  );

  const toggleProtocol = useCallback((protocol: OracleProtocol) => {
    setSelectedProtocols((prev) => {
      if (prev.includes(protocol)) {
        const newSelection = prev.filter((p) => p !== protocol);
        return newSelection.length === 0 ? ORACLE_PROTOCOLS : newSelection;
      }
      return [...prev, protocol];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedProtocols([...ORACLE_PROTOCOLS]);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedProtocols([]);
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, deselectAll]);

  const setProtocols = useCallback((protocols: OracleProtocol[]) => {
    setSelectedProtocols(protocols.length === 0 ? ORACLE_PROTOCOLS : protocols);
  }, []);

  const reset = useCallback(() => {
    setSelectedProtocols(defaultProtocols);
  }, [defaultProtocols]);

  const filterParams = useMemo(
    () => ({
      protocols: isAllSelected ? undefined : selectedProtocols.join(','),
    }),
    [isAllSelected, selectedProtocols],
  );

  return {
    selectedProtocols,
    isAllSelected,
    isProtocolSelected,
    toggleProtocol,
    selectAll,
    deselectAll,
    toggleAll,
    setProtocols,
    reset,
    filterParams,
    protocolOptions: PROTOCOL_OPTIONS,
  };
}
