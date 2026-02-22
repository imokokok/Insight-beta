/**
 * DensityToggle - 密度切换组件
 * 允许用户在紧凑/标准/宽松三种模式间切换
 */

import { memo } from 'react';

import { AlignJustify, Menu, LayoutGrid } from 'lucide-react';

import { cn } from '@/shared/utils';

import { useDensity, type DensityMode } from './DensityProvider';

export interface DensityToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'icons' | 'buttons' | 'dropdown';
}

const densityIcons: Record<DensityMode, React.ElementType> = {
  compact: AlignJustify,
  standard: Menu,
  comfortable: LayoutGrid,
};

const densityLabels: Record<DensityMode, string> = {
  compact: '紧凑',
  standard: '标准',
  comfortable: '宽松',
};

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
};

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const DensityToggle = memo(function DensityToggle({
  className,
  size = 'md',
  showLabel = false,
  variant = 'icons',
}: DensityToggleProps) {
  const { density, setDensity, toggleDensity } = useDensity();

  if (variant === 'icons') {
    return (
      <button
        type="button"
        onClick={toggleDensity}
        className={cn(
          'flex items-center justify-center rounded-md border border-border/50 bg-transparent',
          'text-foreground/80 hover:bg-muted/50 hover:text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          'transition-colors duration-200 ease-in-out',
          sizeClasses[size],
          className,
        )}
        title={`当前: ${densityLabels[density]} - 点击切换`}
      >
        {Object.entries(densityIcons).map(([mode, Icon]) => (
          <Icon key={mode} className={cn(iconSizes[size], density !== mode && 'hidden')} />
        ))}
        {showLabel && <span className="ml-1.5 text-xs font-medium">{densityLabels[density]}</span>}
      </button>
    );
  }

  if (variant === 'buttons') {
    const modes: DensityMode[] = ['compact', 'standard', 'comfortable'];

    return (
      <div
        className={cn('flex items-center gap-1 rounded-lg border border-border/50 p-1', className)}
      >
        {modes.map((mode) => {
          const Icon = densityIcons[mode];
          const isActive = density === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setDensity(mode)}
              className={cn(
                'flex items-center justify-center gap-1 rounded-md px-2 py-1',
                'text-xs font-medium transition-colors duration-200 ease-in-out',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/60 hover:bg-muted/50 hover:text-foreground',
              )}
              title={densityLabels[mode]}
            >
              <Icon className={iconSizes[size]} />
              {showLabel && <span>{densityLabels[mode]}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
});

export default DensityToggle;
