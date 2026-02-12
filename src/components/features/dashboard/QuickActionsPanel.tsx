'use client';

import type { ReactNode } from 'react';

import {
  RefreshCw,
  Download,
  Settings,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

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
      className={cn('flex items-center gap-2', className)}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
          {badge}
        </span>
      )}
    </Button>
  );
}
