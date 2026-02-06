/**
 * OptimizedImage Component
 *
 * 优化的图片组件，支持懒加载、响应式图片和占位符
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  placeholder?: 'blur' | 'empty' | 'color';
  placeholderColor?: string;
  sizes?: string;
  srcSet?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = React.memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  containerClassName,
  priority = false,
  loading = 'lazy',
  placeholder = 'blur',
  placeholderColor = '#f3f4f6',
  sizes,
  srcSet,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // 生成模糊占位符样式
  const getPlaceholderStyle = () => {
    switch (placeholder) {
      case 'blur':
        return {
          backgroundColor: placeholderColor,
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        };
      case 'color':
        return {
          backgroundColor: placeholderColor,
        };
      default:
        return {};
    }
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          containerClassName,
        )}
        style={{ width, height }}
      >
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', containerClassName)} style={{ width, height }}>
      {/* 占位符 */}
      {!isLoaded && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={getPlaceholderStyle()}
        />
      )}

      {/* 实际图片 - 使用原生 img 标签以支持更灵活的图片加载策略 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        decoding={priority ? 'sync' : 'async'}
        sizes={sizes}
        srcSet={srcSet}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
    </div>
  );
});

/**
 * 响应式图片组件
 */
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'srcSet' | 'sizes'> {
  srcSet: { url: string; width: number }[];
  sizes?: string;
}

export const ResponsiveImage = React.memo(function ResponsiveImage({
  srcSet,
  sizes = '100vw',
  ...props
}: ResponsiveImageProps) {
  const srcSetString = srcSet.map(({ url, width }) => `${url} ${width}w`).join(', ');

  const defaultSrc = srcSet[0]?.url || '';

  return <OptimizedImage {...props} src={defaultSrc} srcSet={srcSetString} sizes={sizes} />;
});

/**
 * 懒加载图片组件（使用 Intersection Observer）
 */
interface LazyImageProps extends OptimizedImageProps {
  rootMargin?: string;
  threshold?: number;
}

export const LazyImage = React.memo(function LazyImage({
  rootMargin = '50px',
  threshold = 0.01,
  ...props
}: LazyImageProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {shouldLoad ? (
        <OptimizedImage {...props} loading="lazy" />
      ) : (
        <div
          className="h-full w-full bg-gray-100"
          style={{ width: props.width, height: props.height }}
        />
      )}
    </div>
  );
});

export default OptimizedImage;
