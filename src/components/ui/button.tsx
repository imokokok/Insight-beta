'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/25 hover:from-primary-500 hover:to-primary-400 hover:shadow-lg hover:shadow-primary-500/30',
        destructive:
          'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/30',
        outline:
          'text-primary-dark border-2 border-primary/20 bg-white/50 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10',
        secondary:
          'text-primary-dark bg-gradient-to-r from-primary-100 to-primary-50 hover:from-primary-200 hover:to-primary-100',
        ghost: 'text-primary-dark hover:text-primary-darker hover:bg-primary/10',
        link: 'text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline',
        gradient:
          'bg-gradient-to-r from-blue-600 via-primary-500 to-cyan-500 text-white shadow-lg shadow-primary-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary-500/40',
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={loading || props.disabled}
        {...props}
      >
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
Button.displayName = 'Button';

export { Button, buttonVariants };
