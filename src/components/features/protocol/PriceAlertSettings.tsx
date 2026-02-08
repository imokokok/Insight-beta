'use client';

import { useState } from 'react';

import { Bell, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface AlertRule {
  id: string;
  type: 'above' | 'below';
  price: number;
  enabled: boolean;
}

interface PriceAlertSettingsProps {
  symbol: string;
  currentPrice: number;
  className?: string;
}

export function PriceAlertSettings({ symbol, currentPrice, className }: PriceAlertSettingsProps) {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [newAlertPrice, setNewAlertPrice] = useState('');
  const [newAlertType, setNewAlertType] = useState<'above' | 'below'>('above');

  const addAlert = () => {
    const price = parseFloat(newAlertPrice);
    if (isNaN(price) || price <= 0) return;

    const newAlert: AlertRule = {
      id: Date.now().toString(),
      type: newAlertType,
      price,
      enabled: true,
    };

    setAlerts([...alerts, newAlert]);
    setNewAlertPrice('');
  };

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Price Alerts - {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted flex items-center justify-between rounded-lg p-3">
          <span className="text-muted-foreground text-sm">Current Price</span>
          <span className="text-lg font-semibold">${currentPrice.toLocaleString()}</span>
        </div>

        <div className="flex gap-2">
          <select
            value={newAlertType}
            onChange={(e) => setNewAlertType(e.target.value as 'above' | 'below')}
            className="bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
          <Input
            type="number"
            placeholder="Price"
            value={newAlertPrice}
            onChange={(e) => setNewAlertPrice(e.target.value)}
            className="flex-1"
          />
          <Button onClick={addAlert} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No alerts set. Add one above.
            </p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Switch checked={alert.enabled} onCheckedChange={() => toggleAlert(alert.id)} />
                  <div>
                    <p className="text-sm font-medium">
                      {alert.type === 'above' ? '↑ Above' : '↓ Below'} $
                      {alert.price.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {alert.enabled ? 'Active' : 'Paused'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeAlert(alert.id)}>
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
