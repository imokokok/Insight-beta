'use client';

import { useRouter } from 'next/navigation';

import { Link2, Zap, Server, Globe, ArrowRight } from 'lucide-react';

import { ContentSection, Breadcrumb } from '@/components/common';
import { Badge, Button, Card } from '@/components/ui';
import { useI18n } from '@/i18n';

interface ProtocolCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  features: string[];
  status: 'active' | 'maintenance';
  href: string;
}

const PROTOCOLS: ProtocolCard[] = [
  {
    id: 'chainlink',
    name: 'Chainlink',
    description: 'protocols.chainlink.description',
    icon: <Link2 className="h-8 w-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    features: ['OCR', 'VRF', 'Automation', 'CCIP'],
    status: 'active',
    href: '/protocols/chainlink',
  },
  {
    id: 'pyth',
    name: 'Pyth Network',
    description: 'protocols.pyth.description',
    icon: <Zap className="h-8 w-8" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    features: ['High Frequency', 'Confidence Intervals', 'Hermes', 'Publishers'],
    status: 'active',
    href: '/protocols/pyth',
  },
  {
    id: 'api3',
    name: 'API3',
    description: 'protocols.api3.description',
    icon: <Server className="h-8 w-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    features: ['Airnode', 'dAPIs', 'OEV', 'First-party'],
    status: 'active',
    href: '/protocols/api3',
  },
  {
    id: 'band',
    name: 'Band Protocol',
    description: 'protocols.band.description',
    icon: <Globe className="h-8 w-8" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    features: ['Cross-chain', 'IBC', 'Oracle Scripts', 'Data Sources'],
    status: 'active',
    href: '/protocols/band',
  },
];

export default function ProtocolsListPage() {
  const { t } = useI18n();
  const router = useRouter();

  const breadcrumbItems = [{ label: t('nav.protocols'), href: '/protocols' }];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">{t('protocols.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('protocols.subtitle')}</p>
      </div>

      <ContentSection
        title={t('protocols.availableProtocols')}
        description={t('protocols.availableProtocolsDesc')}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {PROTOCOLS.map((protocol) => (
            <Card
              key={protocol.id}
              className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => router.push(protocol.href as any)}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-3 ${protocol.bgColor}`}>
                      <div className={protocol.color}>{protocol.icon}</div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{protocol.name}</h3>
                      <Badge
                        variant={protocol.status === 'active' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {protocol.status === 'active'
                          ? t('common.status.healthy')
                          : t('common.status.warning')}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{t(protocol.description)}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {protocol.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-4">
                  <span className="text-xs text-muted-foreground">
                    {t('protocols.clickToViewDetails')}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    {t('protocols.viewDetails')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ContentSection>
    </div>
  );
}
