'use client';

import { Activity, Gavel, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { StatCardSkeleton, ChartSkeleton, CardSkeleton, SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';

import { SummaryStats } from './SummaryStats';
import { DisputeList } from './DisputeList';
import { DisputerList } from './DisputerList';
import { DisputeTrendChart } from './DisputeTrendChart';

import type { DisputeReport, Dispute, DisputerStats } from '../types/disputes';

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
  selectedDispute: Dispute | null;
  setSelectedDispute: (dispute: Dispute | null) => void;
  selectedDisputer: DisputerStats | null;
  setSelectedDisputer: (disputer: DisputerStats | null) => void;
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
  selectedDispute: _selectedDispute,
  setSelectedDispute,
  selectedDisputer,
  setSelectedDisputer,
}: DisputeContentProps) {
  const { t } = useI18n();

  return (
    <>
      {loading && !report ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
        </div>
      ) : (
        <SummaryStats report={report} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            {t('analytics:disputes.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="disputes">
            <Gavel className="mr-2 h-4 w-4" />
            {t('analytics:disputes.tabs.disputes')} ({filteredDisputes.length})
          </TabsTrigger>
          <TabsTrigger value="disputers">
            <Users className="mr-2 h-4 w-4" />
            {t('analytics:disputes.tabs.disputers')} ({report?.topDisputers.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {loading && !report ? (
              <><ChartSkeleton /><CardSkeleton /></>
            ) : report ? (
              <>
                <DisputeTrendChart trends={report.trends} />
                <Card>
                  <CardHeader>
                    <CardTitle>{t('analytics:disputes.disputes.title')}</CardTitle>
                    <CardDescription>{t('analytics:disputes.disputes.showing', { count: report.recentActivity.length, total: report.disputes.length })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? <SkeletonList count={5} /> : <DisputeList disputes={report.recentActivity} isLoading={loading} onSelect={setSelectedDispute} />}
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
                  <option value="Resolved">{t('analytics:disputes.disputes.statusResolved')}</option>
                </select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics:disputes.disputes.title')}</CardTitle>
              <CardDescription>{t('analytics:disputes.disputes.showing', { count: filteredDisputes.length, total: report?.disputes.length || 0 })}</CardDescription>
            </CardHeader>
            <CardContent>
              <DisputeList
                disputes={filteredDisputes}
                isLoading={loading}
                onSelect={setSelectedDispute}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputers" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics:disputes.disputers.title')}</CardTitle>
                <CardDescription>{t('analytics:disputes.disputers.showing', { count: report?.topDisputers.length || 0 })}</CardDescription>
              </CardHeader>
              <CardContent>
                <DisputerList
                  disputers={report?.topDisputers || []}
                  isLoading={loading}
                  onSelect={setSelectedDisputer}
                />
              </CardContent>
            </Card>
            <div>
              {selectedDisputer && (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Disputer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-mono text-sm">{selectedDisputer.address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Total Disputes</p>
                          <p className="font-medium">{selectedDisputer.totalDisputes}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Success Rate</p>
                          <p className="font-medium text-green-600">{selectedDisputer.winRate.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
