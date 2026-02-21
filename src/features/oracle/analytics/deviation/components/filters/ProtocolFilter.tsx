'use client';

/**
 * ProtocolFilter - Oracle 协议多选过滤器
 *
 * 职责：
 * - 提供多协议选择功能（Chainlink, Pyth, RedStone, UMA）
 * - 支持全选/取消全选
 * - 使用 DropdownMenu 下拉形式，带图标显示
 * - 与 useProtocolFilter hook 配合使用
 *
 * 使用场景：
 * - Deviation Analytics 页面的协议筛选
 * - 需要多选协议的场景
 *
 * 注意：
 * - 此组件使用 OracleProtocol 类型，确保类型安全
 * - 支持 i18n 国际化
 */

import { Check, ChevronDown, Layers } from 'lucide-react';

import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
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

  const getButtonText = () => {
    if (isAllSelected) {
      return t('analytics.deviation.protocolFilter.all');
    }
    if (selectedProtocols.length === 1 && selectedProtocols[0]) {
      return PROTOCOL_DISPLAY_NAMES[selectedProtocols[0]];
    }
    return t('analytics.deviation.protocolFilter.selected', { count: selectedProtocols.length });
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2', className)}>
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t('analytics.deviation.protocolFilter.label')}:
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-11 min-w-32 justify-between sm:h-9">
            <span className="truncate">{getButtonText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" onCloseAutoFocus={false}>
          <div className="flex items-center justify-between px-2 py-2 sm:py-1.5">
            <span className="text-sm font-medium">
              {t('analytics.deviation.protocolFilter.selectProtocols')}
            </span>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded px-2 text-xs text-primary hover:bg-gray-100 sm:min-h-0 sm:min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAll();
              }}
            >
              {isAllSelected
                ? t('analytics.deviation.protocolFilter.deselectAll')
                : t('analytics.deviation.protocolFilter.selectAll')}
            </button>
          </div>
          <DropdownMenuSeparator />
          {protocols.map((protocol) => {
            const isSelected = selectedProtocols.includes(protocol);
            return (
              <DropdownMenuItem
                key={protocol}
                className="flex h-11 items-center justify-between sm:h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleProtocol(protocol);
                }}
              >
                <div className="flex items-center gap-2">
                  <span>{PROTOCOL_ICONS[protocol]}</span>
                  <span>{PROTOCOL_DISPLAY_NAMES[protocol]}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
