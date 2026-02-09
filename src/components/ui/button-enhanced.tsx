'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-blue-400 hover:shadow-lg hover:shadow-blue-500/30',
        destructive:
          'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/30',
        outline:
          'border-2 border-purple-200 bg-white/50 text-purple-700 backdrop-blur-sm hover:border-purple-400 hover:bg-purple-50/50',
        secondary:
          'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 hover:from-purple-200 hover:to-purple-100',
        ghost: 'text-purple-700 hover:bg-purple-100/50 hover:text-purple-900',
        link: 'text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline',
        gradient:
          'bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40',
        glow: 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(37,99,235,0.7)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  ripple?: boolean;
}

const ButtonEnhanced = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, ripple = true, children, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !loading) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
        }, 600);
      }

      onClick?.(e);
    };

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }), 'overflow-hidden')}
        ref={ref}
        onClick={handleClick}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Ripple Effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="animate-ripple pointer-events-none absolute rounded-full bg-white/40"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
            }}
          />
        ))}

        {/* Loading Spinner */}
        {loading && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}

        <span
          className={cn('relative z-10 inline-flex items-center gap-2', loading && 'opacity-80')}
        >
          {children}
        </span>
      </button>
    );
  },
);
ButtonEnhanced.displayName = 'ButtonEnhanced';

// Icon Button with tooltip
interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode;
  tooltip?: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, tooltip, className, variant = 'ghost', size = 'icon', ...props }, ref) => {
    const [showTooltip, setShowTooltip] = React.useState(false);

    return (
      <div className="relative inline-block">
        <ButtonEnhanced
          ref={ref}
          variant={variant}
          size={size}
          className={cn('rounded-full', className)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          {...props}
        >
          {icon}
        </ButtonEnhanced>

        {/* Tooltip */}
        {tooltip && (
          <span
            className={cn(
              'absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap',
              'rounded-md bg-gray-900 px-2 py-1 text-xs text-white',
              'transition-all duration-200',
              showTooltip
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-1 opacity-0',
            )}
          >
            {tooltip}
          </span>
        )}
      </div>
    );
  },
);
IconButton.displayName = 'IconButton';

// Action Button Group
interface ActionButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

function ActionButtonGroup({ children, className }: ActionButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-purple-200 bg-white/50 p-1 backdrop-blur-sm',
        className,
      )}
    >
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={cn(
            index !== 0 && 'border-l border-purple-200',
            '[&>button]:rounded-none [&>button]:border-0 [&>button]:bg-transparent [&>button]:shadow-none',
            '[&>button]:hover:bg-purple-100/50',
            'first:[&>button]:rounded-l-md last:[&>button]:rounded-r-md',
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

export { ButtonEnhanced, IconButton, ActionButtonGroup, buttonVariants };
