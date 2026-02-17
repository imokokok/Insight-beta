'use client';

import { useState } from 'react';
import { Activity, Layers, TrendingUp, BarChart3 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';

import { DashboardContent } from '@/features/oracle/dashboard/components/DashboardContent';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { DeviationContent } from '@/features/oracle/analytics/deviation/components/DeviationContent';

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto space-y-6 p-3 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          {t('nav.monitoring')}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('nav.descriptions.monitoring')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto p-1 bg-muted">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 px-4 py-2 h-auto">
            <BarChart3 className="h-4 w-4" />
            {t('nav.dashboard')}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2 px-4 py-2 h-auto">
            <Layers className="h-4 w-4" />
            {t('nav.oracleComparison')}
          </TabsTrigger>
          <TabsTrigger value="deviation" className="flex items-center gap-2 px-4 py-2 h-auto">
            <TrendingUp className="h-4 w-4" />
            {t('nav.deviation')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardContent />
        </TabsContent>

        <TabsContent value="comparison" className="mt-0">
          <ComparisonContent />
        </TabsContent>

        <TabsContent value="deviation" className="mt-0">
          <DeviationContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
