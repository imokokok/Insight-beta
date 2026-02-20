'use client';

import { useEffect, useState } from 'react';

import {
  Bell,
  Plus,
  Trash2,
  Edit,
  Webhook,
  Mail,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';

import { useToast } from '@/components/common/DashboardToast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationChannelConfig,
  CreateNotificationChannelInput,
} from '@/types/oracle/alert';

import { EmailConfig } from './EmailConfig';
import { TelegramConfig } from './TelegramConfig';
import { WebhookConfig } from './WebhookConfig';

import type { UseNotificationChannelsReturn } from '../hooks/useNotificationChannels';

interface NotificationChannelsProps {
  channels: NotificationChannel[];
  loading: boolean;
  fetchChannels: () => Promise<void>;
  createChannel: UseNotificationChannelsReturn['createChannel'];
  updateChannel: UseNotificationChannelsReturn['updateChannel'];
  deleteChannel: UseNotificationChannelsReturn['deleteChannel'];
  toggleChannel: UseNotificationChannelsReturn['toggleChannel'];
  testChannel: UseNotificationChannelsReturn['testChannel'];
}

const channelTypeIcons: Record<NotificationChannelType, typeof Webhook> = {
  webhook: Webhook,
  email: Mail,
  telegram: MessageSquare,
  slack: MessageSquare,
};

const channelTypeColors: Record<NotificationChannelType, string> = {
  webhook: 'bg-blue-500',
  email: 'bg-green-500',
  telegram: 'bg-cyan-500',
  slack: 'bg-purple-500',
};

export function NotificationChannels({
  channels,
  loading,
  fetchChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  toggleChannel,
  testChannel,
}: NotificationChannelsProps) {
  const { t } = useI18n();
  const { success, error: showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<{
    name: string;
    type: NotificationChannelType;
    enabled: boolean;
    description: string;
    config: NotificationChannelConfig;
  }>({
    name: '',
    type: 'webhook',
    enabled: true,
    description: '',
    config: {},
  });

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showForm]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'webhook',
      enabled: true,
      description: '',
      config: {},
    });
    setFormErrors({});
    setEditingChannel(null);
  };

  const handleEdit = (channel: NotificationChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      enabled: channel.enabled,
      description: channel.description || '',
      config: channel.config,
    });
    setShowForm(true);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setTogglingId(id);
    const result = await toggleChannel(id, enabled);
    setTogglingId(null);
    if (result) {
      success(
        enabled ? t('alerts.channels.enabled') : t('alerts.channels.disabled'),
        t('alerts.channels.toggleSuccess'),
      );
    } else {
      showError(t('common.error'), t('alerts.channels.toggleFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('alerts.channels.confirmDelete'))) return;
    setDeletingId(id);
    const result = await deleteChannel(id);
    setDeletingId(null);
    if (result) {
      success(t('alerts.channels.deleted'), t('alerts.channels.deleteSuccess'));
    } else {
      showError(t('common.error'), t('alerts.channels.deleteFailed'));
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    const result = await testChannel(id);
    setTestingId(null);
    if (result.success) {
      success(t('alerts.channels.testSuccess'), result.message || t('alerts.channels.testSent'));
    } else {
      showError(t('alerts.channels.testFailed'), result.message || t('alerts.channels.testError'));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t('alerts.channels.nameRequired');
    }

    if (formData.type === 'webhook') {
      if (!formData.config.url?.trim()) {
        errors.url = t('alerts.channels.urlRequired');
      } else {
        try {
          new URL(formData.config.url);
        } catch {
          errors.url = t('alerts.channels.invalidUrl');
        }
      }
    }

    if (formData.type === 'email') {
      if (!formData.config.email?.trim()) {
        errors.email = t('alerts.channels.emailRequired');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.config.email)) {
          errors.email = t('alerts.channels.invalidEmail');
        }
      }
    }

    if (formData.type === 'telegram') {
      if (!formData.config.botToken?.trim()) {
        errors.botToken = t('alerts.channels.botTokenRequired');
      }
      if (!formData.config.chatId?.trim()) {
        errors.chatId = t('alerts.channels.chatIdRequired');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const input: CreateNotificationChannelInput = {
      name: formData.name,
      type: formData.type,
      enabled: formData.enabled,
      description: formData.description || undefined,
      config: formData.config,
    };

    if (editingChannel) {
      const result = await updateChannel({ id: editingChannel.id, ...input });
      if (result) {
        success(t('alerts.channels.updated'), t('alerts.channels.updateSuccess'));
        setShowForm(false);
        resetForm();
      } else {
        showError(t('common.error'), t('alerts.channels.updateFailed'));
      }
    } else {
      const result = await createChannel(input);
      if (result) {
        success(t('alerts.channels.created'), t('alerts.channels.createSuccess'));
        setShowForm(false);
        resetForm();
      } else {
        showError(t('common.error'), t('alerts.channels.createFailed'));
      }
    }
  };

  const handleConfigChange = (config: NotificationChannelConfig) => {
    setFormData((prev) => ({ ...prev, config }));
  };

  const renderConfigForm = () => {
    switch (formData.type) {
      case 'webhook':
        return (
          <WebhookConfig
            config={formData.config}
            onChange={handleConfigChange}
            errors={formErrors}
          />
        );
      case 'email':
        return (
          <EmailConfig config={formData.config} onChange={handleConfigChange} errors={formErrors} />
        );
      case 'telegram':
        return (
          <TelegramConfig
            config={formData.config}
            onChange={handleConfigChange}
            errors={formErrors}
          />
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('alerts.channels.title')}
              </CardTitle>
              <CardDescription>{t('alerts.channels.description')}</CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('alerts.channels.createChannel')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 opacity-50" />
              <p className="mt-4 text-lg font-medium">{t('alerts.channels.noChannels')}</p>
              <p className="mt-1 text-sm">{t('alerts.channels.noChannelsDesc')}</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-4"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('alerts.channels.createFirstChannel')}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t('alerts.channels.name')}</TableHead>
                    <TableHead>{t('alerts.channels.type')}</TableHead>
                    <TableHead>{t('alerts.channels.configSummary')}</TableHead>
                    <TableHead className="text-center">{t('alerts.channels.status')}</TableHead>
                    <TableHead>{t('alerts.channels.lastUsed')}</TableHead>
                    <TableHead className="text-right">{t('alerts.channels.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => {
                    const Icon = channelTypeIcons[channel.type];
                    const isTesting = testingId === channel.id;
                    const testStatus = channel.testStatus;

                    return (
                      <TableRow key={channel.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{channel.name}</span>
                              {channel.description && (
                                <p className="text-xs text-muted-foreground">
                                  {channel.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={channelTypeColors[channel.type]}>{channel.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {channel.type === 'webhook' && channel.config.url && (
                              <span className="font-mono text-xs">
                                {channel.config.url.replace(/https?:\/\//, '').split('/')[0]}
                              </span>
                            )}
                            {channel.type === 'email' && channel.config.email && (
                              <span>{channel.config.email}</span>
                            )}
                            {channel.type === 'telegram' && channel.config.chatId && (
                              <span>Chat ID: {channel.config.chatId}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={channel.enabled}
                            onCheckedChange={(checked) => handleToggle(channel.id, checked)}
                            disabled={togglingId === channel.id}
                            className={cn(togglingId === channel.id && 'opacity-50')}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {channel.lastUsedAt ? (
                              <span className="text-sm text-muted-foreground">
                                {formatDate(channel.lastUsedAt)}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {t('alerts.channels.never')}
                              </span>
                            )}
                            {testStatus && (
                              <span
                                className={cn(
                                  'flex items-center gap-1 text-xs',
                                  testStatus === 'success' && 'text-green-500',
                                  testStatus === 'failed' && 'text-red-500',
                                  testStatus === 'pending' && 'text-yellow-500',
                                )}
                              >
                                {testStatus === 'success' && <CheckCircle className="h-3 w-3" />}
                                {testStatus === 'failed' && <XCircle className="h-3 w-3" />}
                                {testStatus === 'pending' && (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTest(channel.id)}
                              disabled={isTesting || !channel.enabled}
                              title={t('alerts.channels.test')}
                            >
                              {isTesting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(channel)}
                              title={t('common.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(channel.id)}
                              disabled={deletingId === channel.id}
                              title={t('common.delete')}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-semibold">
                  {editingChannel
                    ? t('alerts.channels.editChannel')
                    : t('alerts.channels.createChannel')}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="channel-name">
                    {t('alerts.channels.channelName')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="channel-name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t('alerts.channels.channelNamePlaceholder')}
                    className={formErrors.name ? 'border-destructive' : ''}
                  />
                  {formErrors.name && <p className="text-destructive text-xs">{formErrors.name}</p>}
                </div>

                <div className="grid gap-2">
                  <Label>{t('alerts.channels.channelType')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: NotificationChannelType) =>
                      setFormData((prev) => ({ ...prev, type: value, config: {} }))
                    }
                    disabled={!!editingChannel}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webhook">
                        <div className="flex items-center gap-2">
                          <Webhook className="h-4 w-4" />
                          Webhook
                        </div>
                      </SelectItem>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </SelectItem>
                      <SelectItem value="telegram">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Telegram
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {editingChannel && (
                    <p className="text-xs text-muted-foreground">
                      {t('alerts.channels.typeCannotChange')}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="channel-description">
                    {t('alerts.channels.channelDescription')}
                  </Label>
                  <Input
                    id="channel-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder={t('alerts.channels.descriptionPlaceholder')}
                  />
                </div>

                <div className="rounded-lg border p-4">{renderConfigForm()}</div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="channel-enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                  <Label htmlFor="channel-enabled">{t('alerts.channels.enabled')}</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={!formData.name}>
                  {editingChannel ? t('common.update') : t('common.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
