'use client';

import { PieChart } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/i18n';

import type { BeaconSetComponent } from '../types/api3';

interface BeaconSetCompositionProps {
  components: BeaconSetComponent[];
  className?: string;
}

const WEIGHT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-indigo-500',
];

export function BeaconSetComposition({ components, className }: BeaconSetCompositionProps) {
  const { t } = useI18n();

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatWeight = (weight: number) => {
    return `${(weight * 100).toFixed(1)}%`;
  };

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const normalizedComponents = components.map((c) => ({
    ...c,
    normalizedWeight: totalWeight > 0 ? c.weight / totalWeight : 0,
  }));

  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t('api3.beaconSet.composition')}</span>
        <Badge variant="secondary" className="text-xs">
          {components.length} {t('api3.beaconSet.beacons')}
        </Badge>
      </div>

      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
        {normalizedComponents.map((component, index) => (
          <div
            key={component.beaconId}
            className={WEIGHT_COLORS[index % WEIGHT_COLORS.length]}
            style={{ width: `${component.normalizedWeight * 100}%` }}
            title={`${component.beaconName}: ${formatWeight(component.normalizedWeight)}`}
          />
        ))}
      </div>

      <div className="space-y-3">
        {normalizedComponents.map((component, index) => (
          <div key={component.beaconId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-sm ${WEIGHT_COLORS[index % WEIGHT_COLORS.length]}`}
                />
                <span className="text-sm font-medium">{component.beaconName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">
                  {formatPrice(component.lastPrice)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {formatWeight(component.normalizedWeight)}
                </Badge>
              </div>
            </div>
            <Progress value={component.normalizedWeight * 100} className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
