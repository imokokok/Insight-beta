'use client';

import { useState } from 'react';
import { Globe, LayoutDashboard, BarChart3 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CrossChainOverview, CrossChainComparison, CrossChainHistory } from '@/features/cross-chain';
import { useI18n } from '@/i18n';

export default function CrossChainAnalysisPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('crossChain.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('crossChain.description')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto p-1 bg-muted">
          <TabsTrigger value="overview" className="flex items-center gap-2 px-4 py-2 h-auto">
            <LayoutDashboard className="h-4 w-4" />
            {t('nav.crossChainOverview')}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2 px-4 py-2 h-auto">
            <Globe className="h-4 w-4" />
            {t('nav.crossChainComparison')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 px-4 py-2 h-auto">
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
