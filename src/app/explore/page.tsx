'use client';

import { useState } from 'react';
import { Layers, User } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProtocolExplorer, AddressExplorer } from '@/features/oracle/components';
import { useI18n } from '@/i18n';

export default function ExplorePage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('protocols');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.explore')}</h1>
        <p className="mt-2 text-muted-foreground">{t('nav.descriptions.explore')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto p-1 bg-muted">
          <TabsTrigger value="protocols" className="flex items-center gap-2 px-4 py-2 h-auto">
            <Layers className="h-4 w-4" />
            {t('nav.protocols')}
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2 px-4 py-2 h-auto">
            <User className="h-4 w-4" />
            {t('nav.address')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="protocols" className="mt-0">
          <ProtocolExplorer />
        </TabsContent>

        <TabsContent value="address" className="mt-0">
          <AddressExplorer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
