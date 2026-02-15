'use client';

import { useState } from 'react';

import { Save, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/i18n';

export default function CrossChainSettingsPage() {
  const { t } = useI18n();

  const [deviationThreshold, setDeviationThreshold] = useState('0.5');
  const [criticalThreshold, setCriticalThreshold] = useState('2.0');
  const [arbitrageThreshold, setArbitrageThreshold] = useState('0.3');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleReset = () => {
    setDeviationThreshold('0.5');
    setCriticalThreshold('2.0');
    setArbitrageThreshold('0.3');
    setAlertEnabled(true);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.crossChainSettings')}</h1>
          <p className="mt-1 text-muted-foreground">{t('nav.descriptions.crossChainSettings')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Threshold Settings</CardTitle>
            <CardDescription>Configure deviation and arbitrage detection thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviation-threshold">Warning Deviation Threshold (%)</Label>
              <Input
                id="deviation-threshold"
                type="number"
                step="0.1"
                value={deviationThreshold}
                onChange={(e) => setDeviationThreshold(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Trigger warning when deviation exceeds this value
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="critical-threshold">Critical Deviation Threshold (%)</Label>
              <Input
                id="critical-threshold"
                type="number"
                step="0.1"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Trigger critical alert when deviation exceeds this value
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arbitrage-threshold">Arbitrage Threshold (%)</Label>
              <Input
                id="arbitrage-threshold"
                type="number"
                step="0.1"
                value={arbitrageThreshold}
                onChange={(e) => setArbitrageThreshold(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Minimum deviation to consider as arbitrage opportunity
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure alert notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications when deviations are detected
                </p>
              </div>
              <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
            </div>

            <div className="space-y-2">
              <Label>Monitored Symbols</Label>
              <div className="flex flex-wrap gap-2">
                {['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'].map((symbol) => (
                  <Button key={symbol} variant="outline" size="sm" className="capitalize">
                    {symbol}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monitored Chains</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  'ethereum',
                  'bsc',
                  'polygon',
                  'avalanche',
                  'arbitrum',
                  'optimism',
                  'base',
                ].map((chain) => (
                  <Button key={chain} variant="outline" size="sm" className="capitalize">
                    {chain}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Source Configuration</CardTitle>
          <CardDescription>Configure data sources for price feeds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: 'Chainlink', enabled: true },
              { name: 'Pyth', enabled: true },
              { name: 'Band Protocol', enabled: false },
            ].map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="font-medium">{source.name}</span>
                <Switch checked={source.enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
