'use client';

import { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

import { cn, formatNumber } from '@/shared/utils';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  protocols: {
    name: string;
    price: number;
    diff: number;
  }[];
}

interface PriceTickerProps {
  prices: PriceData[];
  isLoading?: boolean;
}

export function PriceTicker({ prices, isLoading }: PriceTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto scroll animation
  useEffect(() => {
    if (isPaused || isLoading || !scrollRef.current) return;

    const scrollContainer = scrollRef.current;
    let animationId: number;
    let scrollPos = 0;

    const scroll = () => {
      if (!scrollContainer) return;
      scrollPos += 0.5;
      if (scrollPos >= scrollContainer.scrollWidth / 2) {
        scrollPos = 0;
      }
      scrollContainer.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, isLoading]);

  // Duplicate prices for seamless loop
  const displayPrices = [...prices, ...prices];

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden border-y border-border/30 bg-background/30 py-4">
        <div className="flex animate-pulse gap-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-64 flex-shrink-0 rounded-xl bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden border-y border-border/30 bg-background/30 py-4">
      {/* Gradient masks */}
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {displayPrices.map((item, index) => (
          <PriceItem key={`${item.symbol}-${index}`} data={item} />
        ))}
      </div>
    </div>
  );
}

function PriceItem({ data }: { data: PriceData }) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(data.price);

  useEffect(() => {
    if (data.price > prevPriceRef.current) {
      setFlash('up');
    } else if (data.price < prevPriceRef.current) {
      setFlash('down');
    }
    prevPriceRef.current = data.price;

    const timer = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(timer);
  }, [data.price]);

  const isPositive = data.change24h >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex flex-shrink-0 items-center gap-4 rounded-xl border px-5 py-3 transition-all duration-300',
        'border-border/30 bg-background/50 backdrop-blur-sm hover:border-border/60 hover:bg-background/70',
        flash === 'up' && 'animate-value-flash-green',
        flash === 'down' && 'animate-value-flash-red',
      )}
    >
      {/* Symbol and Price */}
      <div className="flex min-w-[100px] flex-col">
        <span className="text-sm font-semibold text-foreground">{data.symbol}</span>
        <span className="text-lg font-bold tabular-nums">${formatNumber(data.price, 2)}</span>
      </div>

      {/* 24h Change */}
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
        )}
      >
        <TrendIcon className="h-3 w-3" />
        <span>
          {isPositive ? '+' : ''}
          {data.change24h.toFixed(2)}%
        </span>
      </div>

      {/* Protocol Prices */}
      <div className="flex items-center gap-3 border-l border-border/30 pl-3">
        {data.protocols.slice(0, 3).map((protocol) => (
          <div key={protocol.name} className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-muted-foreground">
              {protocol.name.slice(0, 3)}
            </span>
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                protocol.diff > 0
                  ? 'text-emerald-400'
                  : protocol.diff < 0
                    ? 'text-red-400'
                    : 'text-muted-foreground',
              )}
            >
              {protocol.diff > 0 ? '+' : ''}
              {protocol.diff.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
