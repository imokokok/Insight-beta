"use client";

import { useState, useEffect, useRef } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: {
    default: string;
    sm?: string;
    md?: string;
    lg?: string;
  };
}

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = { default: "gap-4", md: "gap-6" },
}: ResponsiveGridProps) {
  const isSm = useMediaQuery("(min-width: 640px)");
  const isMd = useMediaQuery("(min-width: 768px)");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const isXl = useMediaQuery("(min-width: 1280px)");

  const colCount = isXl
    ? cols.xl ?? cols.lg ?? cols.md ?? cols.sm ?? cols.default
    : isLg
      ? cols.lg ?? cols.md ?? cols.sm ?? cols.default
      : isMd
        ? cols.md ?? cols.sm ?? cols.default
        : isSm
          ? cols.sm ?? cols.default
          : cols.default;

  const gapValue = isXl
    ? gap.lg ?? gap.md ?? gap.default
    : isLg
      ? gap.lg ?? gap.md ?? gap.default
      : isMd
        ? gap.md ?? gap.default
        : gap.default;

  return (
    <div className={cn("grid", gapValue, className)} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

interface TouchOptimizedButtonProps {
  childrenNode;
  on: React.ReactClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
}

export function TouchOptimizedButton({
  children,
  onClick,
  className,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
}: TouchOptimizedButtonProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs min-h-[36px]",
    md: "px-4 py-2.5 text-sm min-h-[44px]",
    lg: "px-6 py-3 text-base min-h-[52px]",
  };

  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-lg shadow-primary-500/20",
    secondary: "bg-white text-gray-900 hover:bg-gray-50 active:bg-gray-100 border border-gray-200 shadow-lg",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-lg shadow-red-500/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        "touch-manipulation",
        isMobile && "active:scale-[0.98]",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      style={{
        minHeight: isMobile ? "44px" : "auto",
        padding: isMobile ? "12px 20px" : undefined,
      }}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

interface SwipeableContainerProps {
  children: React.ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function SwipeableContainer({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeableContainerProps) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn("touch-action-manipulation", className)}
    >
      {children}
    </div>
  );
}

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current !== null && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      setPullDistance(Math.min(distance, 120));
      setIsPulling(distance > 20);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setIsPulling(false);
    startY.current = null;
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("overflow-hidden", className)}
    >
      <div
        className="flex items-center justify-center transition-transform duration-200"
        style={{ height: pullDistance, transform: `translateY(${Math.min(pullDistance - 40, 40)}px)` }}
      >
        {isRefreshing ? (
          <svg className="animate-spin h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            className={cn("h-6 w-6 text-primary-600 transition-transform", isPulling && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: "bottom" | "right";
}

export function MobileSheet({ isOpen, onClose, children, title, position = "bottom" }: MobileSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!isMobile) return <>{children}</>;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div
            className={cn(
              "absolute bg-white dark:bg-dark-800 shadow-2xl transition-all duration-300 ease-out",
              position === "bottom"
                ? "bottom-0 left-0 right-0 rounded-t-2xl max-h-[80vh]"
                : "right-0 top-0 bottom-0 w-[85vw] max-w-sm rounded-l-2xl",
            )}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
              <h3 className="font-semibold text-lg">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}

interface StickyHeaderProps {
  children: React.ReactNode;
  className?: string;
  showThreshold?: number;
}

export function StickyHeader({ children, className, showThreshold = 50 }: StickyHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY.current || currentScrollY < showThreshold);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showThreshold]);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-transform duration-300",
        isVisible ? "translate-y-0" : "-translate-y-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
