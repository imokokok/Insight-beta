'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: string | number | Date;
  label?: string;
  className?: string;
  onExpire?: () => void;
}

export function CountdownTimer({ targetDate, label, className, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const result = calculateTimeLeft();
      setTimeLeft((prev) => {
        if (prev?.isExpired) return prev;
        // 只在值变化时更新
        if (
          prev &&
          prev.days === result.days &&
          prev.hours === result.hours &&
          prev.minutes === result.minutes &&
          prev.seconds === result.seconds &&
          prev.isExpired === result.isExpired
        ) {
          return prev;
        }
        if (result.isExpired && !prev?.isExpired) {
          onExpire?.();
        }
        return result;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (!timeLeft) return null;

  if (timeLeft.isExpired) {
    return null; // Or render "Expired" state if needed, but usually we hide or show static text outside
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2; // Less than 2 hours

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 font-mono text-sm transition-colors',
        isUrgent ? 'animate-pulse font-bold text-rose-600' : 'text-gray-600',
        className,
      )}
    >
      <Clock size={14} className={cn(isUrgent && 'text-rose-600')} />
      {label && <span className="mr-1 font-sans text-xs uppercase text-gray-500">{label}</span>}
      <span>
        {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
        {timeLeft.hours.toString().padStart(2, '0')}h :
        {timeLeft.minutes.toString().padStart(2, '0')}m :
        {timeLeft.seconds.toString().padStart(2, '0')}s
      </span>
    </div>
  );
}
