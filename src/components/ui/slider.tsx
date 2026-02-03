'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue?.[0] ?? min);
    const currentValue = value?.[0] ?? internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.([newValue]);
    };

    const percentage = ((currentValue - min) / (max - min)) * 100;

    return (
      <div
        ref={ref}
        className={cn('relative flex w-full touch-none select-none items-center', className)}
        {...props}
      >
        <div className="bg-secondary relative h-2 w-full grow overflow-hidden rounded-full">
          <div className="bg-primary absolute h-full" style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          className="absolute h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="border-primary bg-background ring-offset-background focus-visible:ring-ring absolute block h-5 w-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';

export { Slider };
