'use client';

import { useEffect, useState } from 'react';

import { Landmark, Coins, FileCheck, AlertTriangle, RefreshCw } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/i18n';

interface TVLData {
  totalStaked: number;
  totalBonded: number;
  activeAssertions: number;
  activeDisputes: number;
  lastUpdated: string;
  isMock?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatCurrency(num: number): string {
  return `$${formatNumber(num)}`;
}

interface TVLStatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subValue?: string;
  color: string;
  bgColor: string;
}

function TVLStatCard({ icon, title, value, subValue, bgColor }: TVLStatCardProps) {
  return (
    <Card className="min-w-[200px] flex-1">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-2 ${bgColor}`}>{icon}</div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TVLOverviewCard() {
  const { t } = useI18n();
  const [tvlData, setTvlData] = useState<TVLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTVLData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/oracle/uma/tvl');
      if (!response.ok) {
        throw new Error('Failed to fetch TVL data');
      }
      const data = await response.json();
      setTvlData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTVLData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tvlData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
            <span className="ml-2">{t('common.error')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      icon: <Landmark className="h-4 w-4 text-blue-600" />,
      title: t('analytics:disputes.tvl.totalStaked'),
      value: formatCurrency(tvlData.totalStaked),
      subValue: `${formatNumber(tvlData.totalStaked)} UMA`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: <Coins className="h-4 w-4 text-purple-600" />,
      title: t('analytics:disputes.tvl.totalBonded'),
      value: formatCurrency(tvlData.totalBonded),
      subValue: `${formatNumber(tvlData.totalBonded)} UMA`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: <FileCheck className="h-4 w-4 text-green-600" />,
      title: t('analytics:disputes.tvl.activeAssertions'),
      value: tvlData.activeAssertions.toString(),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      title: t('analytics:disputes.tvl.activeDisputes'),
      value: tvlData.activeDisputes.toString(),
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('analytics:disputes.tvl.title')}</h2>
        {tvlData.isMock && (
          <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            Mock Data
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        {stats.map((stat, index) => (
          <TVLStatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
}
