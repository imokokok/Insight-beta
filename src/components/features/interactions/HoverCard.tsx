'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverShadow?: boolean;
  hoverBorder?: boolean;
}

export function HoverCard({
  children,
  className,
  hoverScale = 1.02,
  hoverShadow = true,
  hoverBorder = true,
}: HoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6 transition-all duration-300 ease-out',
        hoverShadow && 'hover:shadow-lg',
        hoverBorder && 'hover:border-primary/50',
        isHovered && hoverShadow && 'shadow-lg',
        isHovered && hoverBorder && 'border-primary/50',
        className
      )}
      style={{
        transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}

interface HoverButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function HoverButton({
  children,
  onClick,
  className,
  variant = 'default',
  size = 'md',
  disabled,
}: HoverButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-out';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 text-lg',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        transform: isPressed ? 'scale(0.95)' : isHovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface HoverLinkProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  underline?: boolean;
}

export function HoverLink({
  children,
  href,
  onClick,
  className,
  underline = true,
}: HoverLinkProps) {
  const [isHovered, setIsHovered] = useState(false);

  const Component = href ? 'a' : 'button';

  return (
    <Component
      href={href}
      className={cn(
        'relative inline-flex items-center gap-1 text-primary transition-colors duration-200',
        'hover:text-primary/80',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {children}
      {underline && (
        <span
          className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ease-out"
          style={{
            width: isHovered ? '100%' : '0%',
          }}
        />
      )}
    </Component>
  );
}

// Ripple effect button
interface RippleButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function RippleButton({ children, onClick, className }: RippleButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);

    onClick?.();
  };

  return (
    <button
      className={cn(
        'relative overflow-hidden rounded-lg bg-primary px-6 py-3 text-primary-foreground',
        'transition-all duration-200 hover:bg-primary/90 active:scale-95',
        className
      )}
      onClick={handleClick}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute animate-ripple rounded-full bg-white/30"
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
      <span className="relative z-10">{children}</span>
    </button>
  );
}
