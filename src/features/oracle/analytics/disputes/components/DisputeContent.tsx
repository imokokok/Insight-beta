'use client';

import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Gavel, Calendar } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { StatCardSkeleton, ChartSkeleton, CardSkeleton, SkeletonList } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { DisputeReport, Dispute, DisputeTrend } from '@/types/oracle/dispute';

import { DisputeResultChart, BondDistributionChart } from './charts';
import { DisputeDetailPanel } from './details';
import { DisputeList } from './DisputeList';
import { DisputeTrendChart } from './DisputeTrendChart';
import { ProtocolChainFilter } from './filters';
import { SummaryStats } from './SummaryStats';

import type { TimeRangePreset } from '../hooks/useDisputeAnalytics';

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

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
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-border/30 bg-muted/50 p-1.5 backdrop-blur-sm"
        >
          <TabsList className="grid w-full grid-cols-2 gap-1 bg-transparent lg:inline-grid lg:w-auto">
            <TabsTrigger
              value="overview"
              className="h-10 text-sm transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Activity className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              {t('analytics:disputes.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger
              value="disputes"
              className="h-10 text-sm transition-all duration-200 hover:bg-background/80 data-[state=active]:border-border/50 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Gavel className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              {t('analytics:disputes.tabs.disputes')} ({filteredDisputes.length})
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  {loading && !report ? (
                    <>
                      <ChartSkeleton />
                      <ChartSkeleton />
                    </>
                  ) : report ? (
                    <>
                      <div className="rounded-xl transition-all duration-200 hover:border-border/50 hover:shadow-lg">
                        <DisputeTrendChart trends={filteredTrends} />
                      </div>
                      <div className="rounded-xl transition-all duration-200 hover:border-border/50 hover:shadow-lg">
                        <DisputeResultChart disputes={filteredDisputes} />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  {loading && !report ? (
                    <>
                      <ChartSkeleton />
                      <CardSkeleton />
                    </>
                  ) : report ? (
                    <>
                      <div className="rounded-xl transition-all duration-200 hover:border-border/50 hover:shadow-lg">
                        <BondDistributionChart
                          disputes={filteredDisputes}
                          trends={filteredTrends}
                        />
                      </div>
                      <Card className="transition-all duration-200 hover:border-border/50 hover:shadow-lg">
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
            )}

            {activeTab === 'disputes' && (
              <TabsContent value="disputes" className="mt-0 space-y-6">
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="relative flex-1">
                        <Activity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t('analytics:disputes.searchPlaceholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <select
                        value={filterStatus}
                        onChange={(e) =>
                          setFilterStatus(e.target.value as 'All' | 'Active' | 'Resolved')
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="All">{t('oracle.filters.allStatus')}</option>
                        <option value="Active">
                          {t('analytics:disputes.disputes.statusActive')}
                        </option>
                        <option value="Resolved">
                          {t('analytics:disputes.disputes.statusResolved')}
                        </option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-all duration-200 hover:border-border/50 hover:shadow-lg">
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
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs>

      <DisputeDetailPanel
        dispute={selectedDispute}
        isOpen={isDetailPanelOpen}
        onClose={handleCloseDetailPanel}
      />
    </>
  );
}
