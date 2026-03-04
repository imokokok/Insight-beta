'use client';

import { cn } from '@/shared/utils';

import { useDensity, type DensityMode } from './DensityProvider';

interface DensitySwitchProps {
  className?: string;
}

const densityLabels: Record<DensityMode, string> = {
  compact: '紧凑',
  balanced: '均衡',
  normal: '标准',
  comfortable: '舒适',
};

export function DensitySwitch({ className }: DensitySwitchProps) {
  const { density, setDensity } = useDensity();

  const modes: DensityMode[] = ['compact', 'balanced', 'normal', 'comfortable'];

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg border border-border bg-card p-1',
        className,
      )}
    >
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => setDensity(mode)}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-all duration-200',
            density === mode
              ? 'text-primary-foreground bg-primary shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          title={densityLabels[mode]}
        >
          {densityLabels[mode]}
        </button>
      ))}
    </div>
  );
}

export default DensitySwitch;
