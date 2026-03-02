'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  AlertTriangle,
  Bell,
  Clock,
  Server,
  Trash2,
  Edit2,
  Plus,
  TrendingUp,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Switch } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { API3AlertConfig, API3AlertType, API3AlertsResponse } from '../types/api3';

interface AlertConfigPanelProps {
  className?: string;
}

export function AlertConfigPanel({ className }: AlertConfigPanelProps) {
  const { t } = useI18n();

  const ALERT_TYPE_INFO: Record<
    API3AlertType,
    {
      label: string;
      description: string;
      icon: typeof AlertTriangle;
      thresholdLabel: string;
      defaultThreshold: number;
    }
  > = {
    price_deviation: {
      label: t('api3:alertConfig.priceDeviation.label'),
      description: t('api3:alertConfig.priceDeviation.description'),
      icon: TrendingUp,
      thresholdLabel: t('api3:alertConfig.priceDeviation.thresholdLabel'),
      defaultThreshold: 5,
    },
    update_frequency: {
      label: t('api3:alertConfig.updateFrequency.label'),
      description: t('api3:alertConfig.updateFrequency.description'),
      icon: Clock,
      thresholdLabel: t('api3:alertConfig.updateFrequency.thresholdLabel'),
      defaultThreshold: 300,
    },
    airnode_offline: {
      label: t('api3:alertConfig.airnodeOffline.label'),
      description: t('api3:alertConfig.airnodeOffline.description'),
      icon: Server,
      thresholdLabel: t('api3:alertConfig.airnodeOffline.thresholdLabel'),
      defaultThreshold: 60,
    },
  };

  const CHAIN_OPTIONS = [
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'optimism', label: 'Optimism' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'bsc', label: 'BSC' },
    { value: 'avalanche', label: 'Avalanche' },
  ];

  const DAPI_OPTIONS = [
    { value: 'BTC/USD', label: 'BTC/USD' },
    { value: 'ETH/USD', label: 'ETH/USD' },
    { value: 'LINK/USD', label: 'LINK/USD' },
    { value: 'MATIC/USD', label: 'MATIC/USD' },
    { value: 'BNB/USD', label: 'BNB/USD' },
    { value: 'AVAX/USD', label: 'AVAX/USD' },
    { value: 'EUR/USD', label: 'EUR/USD' },
  ];

  const [alerts, setAlerts] = useState<API3AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<API3AlertConfig | null>(null);

  const [formData, setFormData] = useState({
    type: '' as API3AlertType | '',
    name: '',
    threshold: '',
    targetDapi: '',
    targetAirnode: '',
    chain: 'ethereum',
    enabled: true,
  });

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/oracle/api3/alerts');
      const data: API3AlertsResponse = await response.json();
      if (data.success && data.data) {
        setAlerts(data.data.alerts);
      } else {
        setError(data.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<API3AlertConfig> = {
        ...formData,
        type: formData.type as API3AlertType,
        threshold: Number(formData.threshold),
      };

      if (editingAlert) {
        payload.id = editingAlert.id;
      }

      const response = await fetch('/api/oracle/api3/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        await fetchAlerts();
        resetForm();
      } else {
        setError(data.error || 'Failed to save alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alert');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/oracle/api3/alerts?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        await fetchAlerts();
      } else {
        setError(data.error || 'Failed to delete alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  const handleToggleEnabled = async (alert: API3AlertConfig) => {
    try {
      const response = await fetch('/api/oracle/api3/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alert.id,
          enabled: !alert.enabled,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchAlerts();
      } else {
        setError(data.error || 'Failed to update alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert');
    }
  };

  const handleEdit = (alert: API3AlertConfig) => {
    setEditingAlert(alert);
    setFormData({
      type: alert.type,
      name: alert.name,
      threshold: String(alert.threshold),
      targetDapi: alert.targetDapi || '',
      targetAirnode: alert.targetAirnode || '',
      chain: alert.chain || 'ethereum',
      enabled: alert.enabled,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      type: '',
      name: '',
      threshold: '',
      targetDapi: '',
      targetAirnode: '',
      chain: 'ethereum',
      enabled: true,
    });
    setEditingAlert(null);
    setShowForm(false);
  };

  const getAlertTypeIcon = (type: API3AlertType) => {
    const Info = ALERT_TYPE_INFO[type];
    return Info ? <Info.icon className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
  };

  const getAlertTypeLabel = (type: API3AlertType) => {
    return ALERT_TYPE_INFO[type]?.label || type;
  };

  const enabledCount = alerts.filter((a) => a.enabled).length;
  const disabledCount = alerts.filter((a) => !a.enabled).length;

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('api3:alertConfig.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {enabledCount} {t('api3:alertConfig.enabled')}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                {disabledCount} {t('api3:alertConfig.disabled')}
              </Badge>
            </div>
          </div>
          <CardDescription>{t('api3:alertConfig.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</div>
          )}

          {!showForm ? (
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('api3:alertConfig.addRule')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {editingAlert ? t('api3:alertConfig.editRule') : t('api3:alertConfig.newRule')}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="alertType">{t('api3:alertConfig.alertType')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: value as API3AlertType,
                        threshold: String(
                          ALERT_TYPE_INFO[value as API3AlertType]?.defaultThreshold || '',
                        ),
                      })
                    }
                  >
                    <SelectTrigger id="alertType">
                      <SelectValue placeholder={t('api3:alertConfig.selectAlertType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ALERT_TYPE_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <info.icon className="h-4 w-4" />
                            {info.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alertName">{t('api3:alertConfig.alertName')}</Label>
                  <Input
                    id="alertName"
                    placeholder={t('api3:alertConfig.enterAlertName')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {formData.type && (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    {ALERT_TYPE_INFO[formData.type as API3AlertType]?.description}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {(formData.type === 'price_deviation' || formData.type === 'update_frequency') && (
                  <div className="space-y-2">
                    <Label htmlFor="targetDapi">{t('api3:alertConfig.targetDapi')}</Label>
                    <Select
                      value={formData.targetDapi}
                      onValueChange={(value) => setFormData({ ...formData, targetDapi: value })}
                    >
                      <SelectTrigger id="targetDapi">
                        <SelectValue placeholder={t('api3:alertConfig.selectDapi')} />
                      </SelectTrigger>
                      <SelectContent>
                        {DAPI_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.type === 'airnode_offline' && (
                  <div className="space-y-2">
                    <Label htmlFor="targetAirnode">{t('api3:alertConfig.targetAirnode')}</Label>
                    <Input
                      id="targetAirnode"
                      placeholder={t('api3:alertConfig.enterAirnodeAddress')}
                      value={formData.targetAirnode}
                      onChange={(e) => setFormData({ ...formData, targetAirnode: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="chain">{t('api3:alertConfig.blockchainNetwork')}</Label>
                  <Select
                    value={formData.chain}
                    onValueChange={(value) => setFormData({ ...formData, chain: value })}
                  >
                    <SelectTrigger id="chain">
                      <SelectValue placeholder={t('api3:alertConfig.selectNetwork')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAIN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold">
                    {ALERT_TYPE_INFO[formData.type as API3AlertType]?.thresholdLabel ||
                      t('api3:alertConfig.threshold')}
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    step="1"
                    placeholder={t('api3:alertConfig.enterThreshold')}
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                  <Label htmlFor="enabled" className="cursor-pointer">
                    {t('api3:alertConfig.enableAlert')}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {t('api3:alertConfig.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingAlert
                      ? t('api3:alertConfig.updateAlert')
                      : t('api3:alertConfig.createAlert')}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('api3:alertConfig.alertRulesList')}</CardTitle>
          <CardDescription>
            {t('api3:alertConfig.configuredAlertRules', { count: alerts.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 opacity-50" />
              <p className="mt-2">{t('api3:alertConfig.noAlertRules')}</p>
              <p className="text-sm">{t('api3:alertConfig.clickToAddAlert')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-4 transition-colors',
                    alert.enabled ? 'bg-card' : 'bg-muted/30',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        alert.enabled
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {getAlertTypeIcon(alert.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{alert.name}</p>
                        <Badge variant={alert.enabled ? 'default' : 'secondary'}>
                          {getAlertTypeLabel(alert.type)}
                        </Badge>
                        {alert.chain && <Badge variant="outline">{alert.chain}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {t('api3:alertConfig.threshold')}:{' '}
                          {alert.type === 'price_deviation'
                            ? `${alert.threshold}%`
                            : alert.type === 'update_frequency'
                              ? `${alert.threshold}${t('api3:alertConfig.seconds')}`
                              : `${alert.threshold}${t('api3:alertConfig.seconds')}`}
                        </span>
                        {alert.targetDapi && <span>dAPI: {alert.targetDapi}</span>}
                        {alert.targetAirnode && <span>Airnode: {alert.targetAirnode}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={() => handleToggleEnabled(alert)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(alert)}
                      aria-label={t('common.edit')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => handleDelete(alert.id)}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
