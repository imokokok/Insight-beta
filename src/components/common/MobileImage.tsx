'use client';

import React, { useState, useEffect, useRef } from 'react';

import Image from 'next/image';

import { useIsMobile, useViewportSize } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface MobileImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  // 移动端优化选项
  mobileSrc?: string;
  mobileWidth?: number;
  mobileHeight?: number;
  lazyOffset?: string;
  enableLazyLoad?: boolean;
}

/**
 * 移动端优化的图片组件
 * 支持懒加载、响应式尺寸、错误处理和移动端优化
 */
export function MobileImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  containerClassName,
  priority = false,
  loading,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  quality = 75,
  objectFit = 'cover',
  onLoad,
  onError,
  fallbackSrc = '/logo-owl.png',
  mobileSrc,
  mobileWidth,
  mobileHeight,
  lazyOffset = '100px',
  enableLazyLoad = true,
}: MobileImageProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!enableLazyLoad || priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // 根据视口计算合适的 sizes
  const computedSizes = sizes || (fill
    ? '100vw'
    : width
      ? `(max-width: ${width}px) 100vw, ${width}px`
      : '100vw'
  );

  // 移动端使用优化的图片源
  useEffect(() => {
    if (isMobile && mobileSrc) {
      setCurrentSrc(mobileSrc);
    } else {
      setCurrentSrc(src);
    }
  }, [isMobile, mobileSrc, src]);

  // 懒加载实现
  useEffect(() => {
    if (!enableLazyLoad || priority || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: lazyOffset,
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [enableLazyLoad, priority, isVisible, lazyOffset]);

  // 处理加载完成
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // 处理加载错误
  const handleError = () => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(true);
    } else {
      onError?.();
    }
  };

  // 计算实际尺寸
  const actualWidth = isMobile && mobileWidth ? mobileWidth : width;
  const actualHeight = isMobile && mobileHeight ? mobileHeight : height;

  // 占位符样式
  const placeholderStyle: React.CSSProperties = {
    objectFit,
    filter: isLoaded ? 'none' : 'blur(10px)',
    transition: 'filter 0.3s ease-out',
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        fill && 'h-full w-full',
        !isVisible && 'bg-gray-100',
        containerClassName
      )}
      style={
        !fill && actualWidth && actualHeight
          ? { width: actualWidth, height: actualHeight }
          : undefined
      }
    >
      {/* 骨架屏占位 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}

      {/* 实际图片 */}
      {isVisible && (
        <Image
          src={currentSrc}
          alt={alt}
          width={fill ? undefined : actualWidth}
          height={fill ? undefined : actualHeight}
          fill={fill}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={placeholderStyle}
          priority={priority}
          loading={loading}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={computedSizes}
          quality={isMobile ? Math.min(quality, 70) : quality}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* 错误状态 */}
      {hasError && currentSrc === fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="mt-1 block text-xs text-gray-400">加载失败</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 响应式图片组件
 * 根据屏幕尺寸自动选择合适的图片源
 */
interface ResponsiveImageProps extends Omit<MobileImageProps, 'mobileSrc'> {
  sources: {
    src: string;
    width: number;
    media?: string;
  }[];
}

export function ResponsiveImage({
  sources,
  alt,
  className,
  containerClassName,
  priority = false,
  src: _src, // 忽略传入的src，使用sources中的src
  ...props
}: ResponsiveImageProps) {
  const { width: viewportWidth } = useViewportSize();
  
  // 确保sources至少有一个元素
  const safeSources = sources.length > 0 ? sources : [{ src: '', width: 100 }];
  const [currentSource, setCurrentSource] = useState(safeSources[0]);

  useEffect(() => {
    if (safeSources.length === 0) return;
    
    // 选择最适合当前视口的图片
    const suitable = safeSources
      .filter((s) => !s.media || window.matchMedia(s.media).matches)
      .sort((a, b) => b.width - a.width)
      .find((s) => s.width <= viewportWidth * 2); // 考虑 Retina 屏幕

    if (suitable) {
      setCurrentSource(suitable);
    }
  }, [viewportWidth, safeSources]);

  // 确保 currentSource 不为 undefined
  const safeCurrentSource = currentSource || safeSources[0];

  // 如果 safeCurrentSource 还是 undefined，返回 null 或占位符
  if (!safeCurrentSource || !safeCurrentSource.src) {
    return (
      <div className={cn('bg-gray-100', containerClassName)} />
    );
  }

  return (
    <MobileImage
      src={safeCurrentSource.src}
      alt={alt}
      width={safeCurrentSource.width}
      className={className}
      containerClassName={containerClassName}
      priority={priority}
      {...props}
    />
  );
}

/**
 * 头像组件
 * 针对移动端优化的圆形头像
 */
interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  fallback?: React.ReactNode;
  priority?: boolean;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function Avatar({
  src,
  alt,
  size = 'md',
  className,
  fallback,
  priority = false,
}: AvatarProps) {
  const dimension = typeof size === 'number' ? size : sizeMap[size];
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full bg-gray-100',
        className
      )}
      style={{ width: dimension, height: dimension }}
    >
      {src && !hasError ? (
        <MobileImage
          src={src}
          alt={alt}
          width={dimension}
          height={dimension}
          className="h-full w-full object-cover"
          priority={priority}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {fallback || (
            <svg
              className="h-1/2 w-1/2 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 图片画廊组件
 * 支持缩略图和全屏查看
 */
interface ImageGalleryProps {
  images: {
    src: string;
    alt: string;
    thumbnail?: string;
  }[];
  className?: string;
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 确保有图片数据
  if (!images || images.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100" />
      </div>
    );
  }

  const currentImage = images[selectedIndex];

  return (
    <div className={cn('space-y-4', className)}>
      {/* 主图 */}
      <div
        className="relative aspect-video cursor-pointer overflow-hidden rounded-xl bg-gray-100"
        onClick={() => setIsFullscreen(true)}
      >
        {currentImage && (
          <MobileImage
            src={currentImage.src}
            alt={currentImage.alt}
            fill
            className="object-cover"
            priority
          />
        )}
        
        {/* 图片计数器 */}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* 缩略图列表 */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all',
              selectedIndex === index
                ? 'ring-2 ring-purple-600'
                : 'opacity-60 hover:opacity-100'
            )}
          >
            <MobileImage
              src={image.thumbnail || image.src}
              alt={image.alt}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* 全屏查看 */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsFullscreen(false)}
        >
          {/* 关闭按钮 */}
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(false)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 导航按钮 */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* 全屏图片 */}
          <div className="relative h-full max-h-[80vh] w-full max-w-4xl">
            {currentImage && (
              <MobileImage
                src={currentImage.src}
                alt={currentImage.alt}
                fill
                className="object-contain"
                priority
              />
            )}
          </div>

          {/* 底部指示器 */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(index);
                }}
                className={cn(
                  'h-2 rounded-full transition-all',
                  selectedIndex === index
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/50 hover:bg-white/75'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
