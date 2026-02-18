'use client';

import { useState } from 'react';

import { BarChart3, Layers, TrendingUp } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ComparisonContent } from '@/features/comparison/components/ComparisonContent';
import { DeviationContent } from '@/features/oracle/analytics/deviation/components/DeviationContent';
import { DashboardContent } from '@/features/oracle/dashboard/components/DashboardContent';
import { useI18n } from '@/i18n';

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto bg-muted p-1">
          <TabsTrigger value="dashboard" className="flex h-auto items-center gap-2 px-4 py-2">
            <BarChart3 className="h-4 w-4" />
            {t('nav.dashboard')}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex h-auto items-center gap-2 px-4 py-2">
            <Layers className="h-4 w-4" />
            {t('nav.oracleComparison')}
          </TabsTrigger>
          <TabsTrigger value="deviation" className="flex h-auto items-center gap-2 px-4 py-2">
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
