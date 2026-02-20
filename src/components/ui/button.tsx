'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'text-primary-foreground bg-primary shadow-md shadow-primary/25 hover:bg-primary-600 hover:shadow-lg hover:shadow-primary/30',
        destructive:
          'bg-error text-white shadow-md shadow-error/25 hover:bg-error-dark hover:shadow-lg hover:shadow-error/30',
        outline:
          'border-2 border-primary/20 bg-card/50 text-primary backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10',
        secondary: 'bg-primary/10 text-primary hover:bg-primary/20',
        ghost: 'text-primary hover:bg-primary/10',
        link: 'text-primary underline-offset-4 hover:text-primary-400 hover:underline',
        gradient:
          'text-primary-foreground bg-primary shadow-lg shadow-primary/30 hover:bg-primary-600 hover:shadow-xl hover:shadow-primary/40',
        glow: 'text-primary-foreground bg-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-primary-600 hover:shadow-[0_0_30px_rgba(59,130,246,0.7)]',
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
    const [isPressed, setIsPressed] = React.useState(false);

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
        className={cn(
          buttonVariants({ variant, size, className }),
          'transition-all duration-200 ease-out will-change-transform',
          'hover:-translate-y-0.5',
          'active:translate-y-0 active:scale-[0.97]',
        )}
        ref={ref}
        onClick={handleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        disabled={loading || props.disabled}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="animate-ripple pointer-events-none absolute rounded-full bg-white/35"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 8,
              height: 8,
              marginLeft: -4,
              marginTop: -4,
            }}
          />
        ))}

        {loading && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}

        <span
          className={cn(
            'relative z-10 inline-flex items-center gap-2',
            loading && 'opacity-80',
            'transition-all duration-200 ease-out',
            isPressed && 'scale-[0.98]',
          )}
        >
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
