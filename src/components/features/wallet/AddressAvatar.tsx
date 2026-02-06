'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';

interface AddressAvatarProps {
  address: string;
  size?: number;
  className?: string;
}

export function AddressAvatar({ address, size = 24, className }: AddressAvatarProps) {
  const gradientStyle = useMemo(() => {
    if (!address) return {};

    // Simple hashing to generate colors
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }

    const c1 = Math.abs(hash % 360);
    const c2 = Math.abs((hash * 13) % 360);

    return {
      background: `linear-gradient(135deg, hsl(${c1}, 70%, 60%), hsl(${c2}, 70%, 60%))`,
      width: size,
      height: size,
    };
  }, [address, size]);

  return (
    <div
      className={cn(
        'shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-900',
        className,
      )}
      style={gradientStyle}
      title={address}
    />
  );
}
