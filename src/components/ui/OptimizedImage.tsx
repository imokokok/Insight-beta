'use client';

import Image from 'next/image';

import { cn } from '@/shared/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  containerClassName,
  fill = false,
  sizes,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
}: OptimizedImageProps) {
  const imageProps = {
    src,
    alt,
    priority,
    quality,
    placeholder,
    blurDataURL,
    className: cn('transition-opacity duration-300', className),
    ...(fill
      ? {
          fill: true,
          sizes: sizes || '100vw',
        }
      : {
          width,
          height,
        }),
  };

  if (fill) {
    return (
      <div className={cn('relative overflow-hidden', containerClassName)}>
        <Image {...imageProps} loading={priority ? 'eager' : 'lazy'} />
      </div>
    );
  }

  return <Image {...imageProps} loading={priority ? 'eager' : 'lazy'} />;
}

interface IconImageProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

export function IconImage({ src, alt, size = 24, className, priority = false }: IconImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn('object-contain', className)}
    />
  );
}

interface AvatarImageProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

const AVATAR_SIZES = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export function AvatarImage({
  src,
  alt,
  size = 'md',
  className,
  priority = false,
}: AvatarImageProps) {
  const dimension = AVATAR_SIZES[size];

  return (
    <div className={cn('relative overflow-hidden rounded-full', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={dimension}
        height={dimension}
        priority={priority}
        className="object-cover"
        containerClassName="aspect-square"
      />
    </div>
  );
}
