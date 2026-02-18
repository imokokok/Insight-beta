'use client';

import { useState } from 'react';

import { Activity, Gavel, Calendar } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  StatCardSkeleton,
  ChartSkeleton,
  CardSkeleton,
  SkeletonList,
} from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import type { DisputeReport, Dispute, DisputeTrend } from '@/types/oracle/dispute';

import { DisputeResultChart, BondDistributionChart } from './charts';
import { DisputeDetailPanel } from './details';
import { DisputeList } from './DisputeList';
import { DisputeTrendChart } from './DisputeTrendChart';
import { ProtocolChainFilter } from './filters';
import { SummaryStats } from './SummaryStats';

import type { TimeRangePreset } from '../hooks/useDisputeAnalytics';

interface DisputeContentProps {
  report: DisputeReport | null;
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: 'All' | 'Active' | 'Resolved';
  setFilterStatus: (status: 'All' | 'Active' | 'Resolved') => void;
  filteredDisputes: Dispute[];
  filteredTrends: DisputeTrend[];
  selectedDispute: Dispute | null;
  setSelectedDispute: (dispute: Dispute | null) => void;
  timeRangePreset: TimeRangePreset;
  setTimeRangePreset: (preset: TimeRangePreset) => void;
  selectedProtocols: string[];
  setSelectedProtocols: (protocols: string[]) => void;
  selectedChains: string[];
  setSelectedChains: (chains: string[]) => void;
  availableProtocols: string[];
  availableChains: string[];
}

export function DisputeContent({
  report,
  loading,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filteredDisputes,
  filteredTrends,
  selectedDispute,
  setSelectedDispute,
  timeRangePreset,
  setTimeRangePreset,
  selectedProtocols,
  setSelectedProtocols,
  selectedChains,
  setSelectedChains,
  availableProtocols,
  availableChains,
}: DisputeContentProps) {
  const { t } = useI18n();
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  const handleSelectDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedDispute(null);
  };

  return (
    <>
      {loading && !report ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <SummaryStats report={report} />
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('common.timeRange')}:</span>
              <Select
                value={timeRangePreset}
                onValueChange={(v) => setTimeRangePreset(v as TimeRangePreset)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1{t('common.hours')}</SelectItem>
                  <SelectItem value="6h">6{t('common.hours')}</SelectItem>
                  <SelectItem value="24h">24{t('common.hours')}</SelectItem>
                  <SelectItem value="7d">7{t('common.days')}</SelectItem>
                  <SelectItem value="30d">30{t('common.days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ProtocolChainFilter
              protocols={availableProtocols}
              chains={availableChains}
              selectedProtocols={selectedProtocols}
              selectedChains={selectedChains}
              onProtocolChange={setSelectedProtocols}
              onChainChange={setSelectedChains}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            {t('analytics:disputes.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="disputes">
            <Gavel className="mr-2 h-4 w-4" />
            {t('analytics:disputes.tabs.disputes')} ({filteredDisputes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {loading && !report ? (
              <>
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            ) : report ? (
              <>
                <DisputeTrendChart trends={filteredTrends} />
                <DisputeResultChart disputes={filteredDisputes} />
              </>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {loading && !report ? (
              <>
                <ChartSkeleton />
                <CardSkeleton />
              </>
            ) : report ? (
              <>
                <BondDistributionChart disputes={filteredDisputes} trends={filteredTrends} />
                <Card>
                  <CardHeader>
                    <CardTitle>{t('analytics:disputes.disputes.title')}</CardTitle>
                    <CardDescription>
                      {t('analytics:disputes.disputes.showing', {
                        count: Math.min(5, filteredDisputes.length),
                        total: filteredDisputes.length,
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <SkeletonList count={5} />
                    ) : (
                      <DisputeList
                        disputes={filteredDisputes.slice(0, 5)}
                        isLoading={loading}
                        onSelect={handleSelectDispute}
                      />
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Activity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('analytics:disputes.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Active' | 'Resolved')}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="All">{t('oracle.filters.allStatus')}</option>
                  <option value="Active">{t('analytics:disputes.disputes.statusActive')}</option>
                  <option value="Resolved">
                    {t('analytics:disputes.disputes.statusResolved')}
                  </option>
                </select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics:disputes.disputes.title')}</CardTitle>
              <CardDescription>
                {t('analytics:disputes.disputes.showing', {
                  count: filteredDisputes.length,
                  total: report?.disputes.length || 0,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DisputeList
                disputes={filteredDisputes}
                isLoading={loading}
                onSelect={handleSelectDispute}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DisputeDetailPanel
        dispute={selectedDispute}
        isOpen={isDetailPanelOpen}
        onClose={handleCloseDetailPanel}
      />
    </>
  );
}
