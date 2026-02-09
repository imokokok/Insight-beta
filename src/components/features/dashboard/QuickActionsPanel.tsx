'use client';

import type { ReactNode } from 'react';

import {
  RefreshCw,
  Download,
  Settings,
  Filter,
  Share2,
  Maximize2,
  HelpCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
}

interface QuickActionsPanelProps {
  actions?: QuickAction[];
  onRefresh?: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function QuickActionsPanel({
  actions,
  onRefresh,
  onExport,
  onFilter,
  onSettings,
  className,
}: QuickActionsPanelProps) {
  const { t } = useI18n();

  const defaultActions: QuickAction[] = [
    {
      id: 'refresh',
      label: t('dashboard:actions.refresh'),
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: onRefresh,
      variant: 'outline',
    },
    {
      id: 'export',
      label: t('dashboard:actions.export'),
      icon: <Download className="h-4 w-4" />,
      onClick: onExport,
      variant: 'outline',
    },
    {
      id: 'filter',
      label: t('dashboard:actions.filter'),
      icon: <Filter className="h-4 w-4" />,
      onClick: onFilter,
      variant: 'outline',
    },
    {
      id: 'settings',
      label: t('dashboard:actions.settings'),
      icon: <Settings className="h-4 w-4" />,
      onClick: onSettings,
      variant: 'outline',
    },
  ];

  const displayActions = actions || defaultActions;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('dashboard:actions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {displayActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className="flex items-center gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  badge?: number;
}

export function QuickActionButton({
  icon,
  label,
  onClick,
  variant = 'outline',
  size = 'sm',
  className,
  badge,
}: QuickActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn('relative', className)}
    >
      {icon}
      <span className="ml-2">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
          {badge}
        </span>
      )}
    </Button>
  );
}

// Toolbar component for dashboard header
interface DashboardToolbarProps {
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onFullscreen?: () => void;
  onHelp?: () => void;
  className?: string;
}

export function DashboardToolbar({
  onRefresh,
  onExport,
  onShare,
  onFullscreen,
  onHelp,
  className,
}: DashboardToolbarProps) {

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {onRefresh && (
        <Button variant="outline" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
      {onExport && (
        <Button variant="outline" size="icon" onClick={onExport}>
          <Download className="h-4 w-4" />
        </Button>
      )}
      {onShare && (
        <Button variant="outline" size="icon" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      )}
      {onFullscreen && (
        <Button variant="outline" size="icon" onClick={onFullscreen}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
      {onHelp && (
        <Button variant="outline" size="icon" onClick={onHelp}>
          <HelpCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
