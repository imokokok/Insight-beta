/**
 * Resource Hints Component - 资源提示组件
 *
 * 用于添加预连接、DNS 预解析、预加载等优化
 * - Preconnect: 提前建立连接
 * - DNS Prefetch: 提前解析 DNS
 * - Preload: 预加载关键资源
 * - Module Preload: 预加载 JS 模块
 */

import React from 'react';

interface ResourceHintsProps {
  /** 是否启用预连接 */
  enablePreconnect?: boolean;
  /** 是否启用 DNS 预解析 */
  enableDnsPrefetch?: boolean;
  /** 是否启用资源预加载 */
  enablePreload?: boolean;
  /** 自定义预连接域名 */
  customPreconnect?: string[];
  /** 自定义 DNS 预解析域名 */
  customDnsPrefetch?: string[];
}

// 默认预连接域名
const DEFAULT_PRECONNECT = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

// 默认 DNS 预解析域名
const DEFAULT_DNS_PREFETCH = [
  'https://cdn.jsdelivr.net',
  'https://www.google-analytics.com',
  'https://browser.sentry-cdn.com',
];

// 关键资源预加载
const CRITICAL_PRELOADS = [
  // 字体
  { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
];

// 关键模块预加载
const MODULE_PRELOADS = [
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/framework.js',
];

// 关键图片预加载
const CRITICAL_IMAGES = ['/logo-owl.png', '/icon-192x192.png'];

export function ResourceHints({
  enablePreconnect = true,
  enableDnsPrefetch = true,
  enablePreload = true,
  customPreconnect = [],
  customDnsPrefetch = [],
}: ResourceHintsProps) {
  const preconnectDomains = [...DEFAULT_PRECONNECT, ...customPreconnect];
  const dnsPrefetchDomains = [...DEFAULT_DNS_PREFETCH, ...customDnsPrefetch];

  return (
    <>
      {/* Preconnect - 提前建立连接 */}
      {enablePreconnect &&
        preconnectDomains.map((domain) => (
          <React.Fragment key={`preconnect-${domain}`}>
            <link rel="preconnect" href={domain} />
            {domain.includes('fonts.gstatic.com') && (
              <link rel="preconnect" href={domain} crossOrigin="anonymous" />
            )}
          </React.Fragment>
        ))}

      {/* DNS Prefetch - 提前解析 DNS */}
      {enableDnsPrefetch &&
        dnsPrefetchDomains.map((domain) => (
          <link key={`dns-${domain}`} rel="dns-prefetch" href={domain} />
        ))}

      {/* Preload - 预加载关键资源 */}
      {enablePreload &&
        CRITICAL_PRELOADS.map((resource) => (
          <link
            key={`preload-${resource.href}`}
            rel="preload"
            href={resource.href}
            as={resource.as}
            type={resource.type}
            crossOrigin={resource.crossOrigin as 'anonymous' | 'use-credentials' | undefined}
          />
        ))}

      {/* Module Preload - 预加载关键 JS 模块 */}
      {enablePreload &&
        MODULE_PRELOADS.map((module) => (
          <link key={`module-${module}`} rel="modulepreload" href={module} />
        ))}

      {/* Preload Critical Images - 预加载关键图片 */}
      {enablePreload &&
        CRITICAL_IMAGES.map((image) => (
          <link key={`img-${image}`} rel="preload" as="image" href={image} fetchPriority="high" />
        ))}
    </>
  );
}

/**
 * 预加载图片组件
 */
interface PreloadImageProps {
  src: string;
  fetchpriority?: 'high' | 'low' | 'auto';
}

export function PreloadImage({ src, fetchpriority = 'auto' }: PreloadImageProps) {
  return <link rel="preload" as="image" href={src} fetchPriority={fetchpriority} />;
}

/**
 * 预加载关键 CSS
 */
interface PreloadCriticalCSSProps {
  href: string;
}

export function PreloadCriticalCSS({ href }: PreloadCriticalCSSProps) {
  return (
    <link
      rel="preload"
      href={href}
      as="style"
      onLoad={(e) => {
        const link = e.currentTarget;
        link.rel = 'stylesheet';
      }}
    />
  );
}

export default ResourceHints;
