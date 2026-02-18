'use client';

import { useState } from 'react';

import { LayoutDashboard, Globe, BarChart3 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CrossChainOverview,
  CrossChainComparison,
  CrossChainHistory,
} from '@/features/cross-chain';
import { useI18n } from '@/i18n';

export default function CrossChainAnalysisPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto bg-muted p-1">
          <TabsTrigger value="overview" className="flex h-auto items-center gap-2 px-4 py-2">
            <LayoutDashboard className="h-4 w-4" />
            {t('nav.crossChainOverview')}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex h-auto items-center gap-2 px-4 py-2">
            <Globe className="h-4 w-4" />
            {t('nav.crossChainComparison')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex h-auto items-center gap-2 px-4 py-2">
            <BarChart3 className="h-4 w-4" />
            {t('nav.crossChainHistory')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <CrossChainOverview />
        </TabsContent>

        <TabsContent value="comparison" className="mt-0">
          <CrossChainComparison />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <CrossChainHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
