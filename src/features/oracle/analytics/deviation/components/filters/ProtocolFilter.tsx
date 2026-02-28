'use client';

import { Check, Layers } from 'lucide-react';

import { FilterPopover } from '@/components/common/controls';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { OracleProtocol } from '@/types/oracle/protocol';
import { PROTOCOL_DISPLAY_NAMES } from '@/types/oracle/protocol';

interface ProtocolFilterProps {
  selectedProtocols: OracleProtocol[];
  isAllSelected: boolean;
  onToggleProtocol: (protocol: OracleProtocol) => void;
  onToggleAll: () => void;
  className?: string;
}

const PROTOCOL_ICONS: Record<OracleProtocol, string> = {
  chainlink: '🔗',
  pyth: '🐍',
  redstone: '💎',
  uma: '⚖️',
  api3: '🔮',
  band: '🎸',
};

export function ProtocolFilter({
  selectedProtocols,
  isAllSelected,
  onToggleProtocol,
  onToggleAll,
  className,
}: ProtocolFilterProps) {
  const { t } = useI18n();

  const protocols = Object.keys(PROTOCOL_DISPLAY_NAMES) as OracleProtocol[];

  return (
    <FilterPopover
      icon={<Layers className="h-4 w-4" />}
      label={t('analytics.deviation.protocolFilter.label')}
      count={isAllSelected ? 0 : selectedProtocols.length}
      className={className}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {t('analytics.deviation.protocolFilter.selectProtocols')}
          </span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={onToggleAll}
          >
            {isAllSelected
              ? t('analytics.deviation.protocolFilter.deselectAll')
              : t('analytics.deviation.protocolFilter.selectAll')}
          </button>
        </div>
        <div className="space-y-1">
          {protocols.map((protocol) => {
            const isSelected = selectedProtocols.includes(protocol);
            return (
              <button
                key={protocol}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                )}
                onClick={() => onToggleProtocol(protocol)}
              >
                <div className="flex items-center gap-2">
                  <span>{PROTOCOL_ICONS[protocol]}</span>
                  <span>{PROTOCOL_DISPLAY_NAMES[protocol]}</span>
                </div>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </FilterPopover>
  );
}
