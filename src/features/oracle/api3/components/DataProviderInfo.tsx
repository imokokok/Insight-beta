'use client';

import { Building2, ExternalLink, Globe, Radio } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface DataProviderInfoProps {
  providerName?: string;
  providerDescription?: string;
  providerWebsite?: string;
  sourceType?: 'beacon' | 'beacon_set';
  className?: string;
}

export function DataProviderInfo({
  providerName,
  providerDescription,
  providerWebsite,
  sourceType,
  className,
}: DataProviderInfoProps) {
  const { t } = useI18n();

  const getSourceTypeLabel = (type: 'beacon' | 'beacon_set') => {
    return type === 'beacon' ? t('api3.provider.beacon') : t('api3.provider.beaconSet');
  };

  const getSourceTypeVariant = (type: 'beacon' | 'beacon_set') => {
    return type === 'beacon' ? 'default' : 'secondary';
  };

  if (!providerName && !sourceType) {
    return null;
  }

  return (
    <Card className={cn('transition-all hover:shadow-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            {t('api3.provider.title')}
          </CardTitle>
          {sourceType && (
            <Badge variant={getSourceTypeVariant(sourceType)} className="gap-1">
              <Radio className="h-3 w-3" />
              {getSourceTypeLabel(sourceType)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {providerName && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('api3.provider.name')}</p>
            <p className="font-semibold">{providerName}</p>
          </div>
        )}

        {providerDescription && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('api3.provider.description')}</p>
            <p className="text-sm text-muted-foreground">{providerDescription}</p>
          </div>
        )}

        {providerWebsite && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('api3.provider.website')}</p>
            <a
              href={providerWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              {providerWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {!providerName && !providerDescription && !providerWebsite && sourceType && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('api3.provider.sourceType')}</p>
                <p className="font-medium">{getSourceTypeLabel(sourceType)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
