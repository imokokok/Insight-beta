'use client';

/* eslint-disable no-restricted-syntax */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'change_percent';
  value: number;
  isActive: boolean;
  notificationMethods: ('email' | 'push' | 'sms')[];
  createdAt: string;
}

export interface PriceAlertSettingsProps {
  symbol: string;
  currentPrice: number;
  className?: string;
}

export function PriceAlertSettings({ symbol, currentPrice, className }: PriceAlertSettingsProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: '1',
      symbol,
      condition: 'above',
      value: currentPrice * 1.1,
      isActive: true,
      notificationMethods: ['email', 'push'],
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      symbol,
      condition: 'below',
      value: currentPrice * 0.9,
      isActive: true,
      notificationMethods: ['push'],
      createdAt: new Date().toISOString(),
    },
  ]);

  const [newAlert, setNewAlert] = useState<Partial<PriceAlert>>({
    symbol,
    condition: 'above',
    value: currentPrice,
    notificationMethods: ['email'],
  });

  const [isAdding, setIsAdding] = useState(false);

  const handleAddAlert = () => {
    if (!newAlert.value || newAlert.value <= 0) return;

    const alert: PriceAlert = {
      id: Date.now().toString(),
      symbol,
      condition: newAlert.condition || 'above',
      value: newAlert.value,
      isActive: true,
      notificationMethods: newAlert.notificationMethods || ['email'],
      createdAt: new Date().toISOString(),
    };

    setAlerts([...alerts, alert]);
    setIsAdding(false);
    setNewAlert({
      symbol,
      condition: 'above',
      value: currentPrice,
      notificationMethods: ['email'],
    });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(
      alerts.map((alert) => (alert.id === id ? { ...alert, isActive: !alert.isActive } : alert)),
    );
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'above':
        return 'Price Above';
      case 'below':
        return 'Price Below';
      case 'change_percent':
        return 'Change %';
      default:
        return condition;
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'above':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'below':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'change_percent':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getNotificationIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'push':
        return <MessageSquare className="h-4 w-4" />;
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatValue = (condition: string, value: number) => {
    if (condition === 'change_percent') {
      return `${value}%`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Price Alerts - {symbol}
        </CardTitle>
        <CardDescription>Get notified when {symbol} reaches your target price</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Price */}
        <div className="bg-muted rounded-lg p-4">
          <p className="text-muted-foreground text-sm">Current Price</p>
          <p className="text-2xl font-bold">${currentPrice.toLocaleString()}</p>
        </div>

        {/* Existing Alerts */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Active Alerts ({alerts.filter((a) => a.isActive).length})
          </h4>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No alerts set</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3',
                    alert.isActive ? 'bg-white' : 'bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getConditionIcon(alert.condition)}
                    <div>
                      <p className="font-medium">
                        {getConditionLabel(alert.condition)}{' '}
                        {formatValue(alert.condition, alert.value)}
                      </p>
                      <div className="mt-1 flex gap-1">
                        {alert.notificationMethods.map((method) => (
                          <Badge key={method} variant="outline" className="gap-1">
                            {getNotificationIcon(method)}
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.isActive}
                      onCheckedChange={() => handleToggleAlert(alert.id)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAlert(alert.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Alert */}
        {isAdding ? (
          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">New Alert</h4>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={newAlert.condition}
                onValueChange={(value: 'above' | 'below' | 'change_percent') =>
                  setNewAlert({ ...newAlert, condition: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Price Above</SelectItem>
                  <SelectItem value="below">Price Below</SelectItem>
                  <SelectItem value="change_percent">Price Change %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                value={newAlert.value}
                onChange={(e) => setNewAlert({ ...newAlert, value: parseFloat(e.target.value) })}
                placeholder={newAlert.condition === 'change_percent' ? '10' : '3000'}
              />
              <p className="text-muted-foreground text-xs">
                {newAlert.condition === 'change_percent'
                  ? 'Enter percentage (e.g., 10 for 10%)'
                  : 'Enter target price'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notification Methods</Label>
              <div className="flex gap-2">
                {(['email', 'push', 'sms'] as const).map((method) => (
                  <Button
                    key={method}
                    variant={newAlert.notificationMethods?.includes(method) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const methods = newAlert.notificationMethods || [];
                      if (methods.includes(method)) {
                        setNewAlert({
                          ...newAlert,
                          notificationMethods: methods.filter((m) => m !== method),
                        });
                      } else {
                        setNewAlert({
                          ...newAlert,
                          notificationMethods: [...methods, method],
                        });
                      }
                    }}
                    className="gap-1"
                  >
                    {getNotificationIcon(method)}
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddAlert} className="flex-1">
                Create Alert
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full gap-2" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" />
            Add Price Alert
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
