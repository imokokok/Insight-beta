'use client';

import { Sparkles, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';

export function DataDiscovery() {
  const { t } = useI18n();

  const newProtocols = [
    { name: 'Protocol Alpha', chain: 'Ethereum', tvl: '$12.5M', age: '2 days' },
    { name: 'Protocol Beta', chain: 'Arbitrum', tvl: '$8.2M', age: '5 days' },
    { name: 'Protocol Gamma', chain: 'Optimism', tvl: '$5.1M', age: '1 week' },
  ];

  const anomalies = [
    { type: 'Price Deviation', protocol: 'Chainlink ETH/USD', severity: 'high', value: '5.2%' },
    { type: 'Volume Spike', protocol: 'Uniswap V3', severity: 'medium', value: '+340%' },
    { type: 'TVL Drop', protocol: 'Aave V3', severity: 'low', value: '-2.1%' },
  ];

  const insights = [
    { title: 'Cross-chain arbitrage opportunity', description: 'ETH price deviation between chains' },
    { title: 'Unusual whale activity', description: 'Large transfer detected on Ethereum' },
    { title: 'Protocol migration trend', description: 'TVL moving from L1 to L2s' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {t('explore.discovery.newProtocols')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {newProtocols.map((protocol) => (
                <div key={protocol.name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{protocol.name}</p>
                    <p className="text-xs text-muted-foreground">{protocol.chain}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{protocol.tvl}</p>
                    <p className="text-xs text-muted-foreground">{protocol.age}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t('explore.discovery.anomalies')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        anomaly.severity === 'high'
                          ? 'destructive'
                          : anomaly.severity === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {anomaly.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{anomaly.type}</p>
                      <p className="text-xs text-muted-foreground">{anomaly.protocol}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{anomaly.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              {t('explore.discovery.trendingProtocols')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Uniswap', 'Aave', 'Lido', 'MakerDAO', 'Curve'].map((protocol, i) => (
                <div key={protocol} className="flex items-center justify-between">
                  <span className="font-medium">{protocol}</span>
                  <span className="text-sm text-green-600">+{(15 - i * 2).toFixed(1)}% TVL</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {t('explore.discovery.insights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
