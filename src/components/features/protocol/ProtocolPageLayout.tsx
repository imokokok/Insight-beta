'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/shared/utils';
import { type OracleProtocol } from '@/types';

export interface ProtocolPageLayoutProps {
  protocol: OracleProtocol;
  title: string;
  description: string;
  icon: string;
  officialUrl: string;
  children?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
  tabs: {
    id: string;
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
  }[];
  defaultTab?: string;
  stats?: React.ReactNode;
  chainSelector?: React.ReactNode;
}

export function ProtocolPageLayout({
  title,
  description,
  icon,
  officialUrl,
  children,
  loading = false,
  onRefresh,
  tabs,
  defaultTab,
  stats,
  chainSelector,
}: ProtocolPageLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/oracle')}
              aria-label="Go back to oracle dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden="true">
                {icon}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="gap-2"
              aria-label={loading ? 'Refreshing data' : 'Refresh data'}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </Button>
            <Link href={officialUrl as never} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Official Site
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats}</div>}

        {/* Chain Selector */}
        {chainSelector && <div className="flex flex-wrap gap-2">{chainSelector}</div>}

        {/* Main Content */}
        {tabs.length > 0 ? (
          <Tabs defaultValue={defaultTab || tabs[0]?.id} className="space-y-4">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
