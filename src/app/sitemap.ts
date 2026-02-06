import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://oracle-monitor.foresight.build';

  // 核心页面
  const corePages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/oracle`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/oracle/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/disputes`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/alerts`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/comparison`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
  ];

  // 协议页面
  const protocols = [
    'chainlink',
    'pyth',
    'uma',
    'band',
    'api3',
    'redstone',
    'switchboard',
    'dia',
    'flux',
  ];

  const protocolPages = protocols.map((protocol) => ({
    url: `${baseUrl}/oracle/protocols/${protocol}`,
    lastModified: new Date(),
    changeFrequency: 'always' as const,
    priority: 0.8,
  }));

  // 功能页面
  const featurePages = [
    {
      url: `${baseUrl}/oracle/address/popular`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/oracle/address/search`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/oracle/feeds`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/oracle/health`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.8,
    },
  ];

  return [...corePages, ...protocolPages, ...featurePages];
}
