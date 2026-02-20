'use client';

import { useEffect, useState } from 'react';

import {
  Bell,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  Clock,
  Webhook,
  Mail,
  MessageSquare,
} from 'lucide-react';

import { useToast } from '@/components/common/DashboardToast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import type { AlertRule } from '@/types/oracle/alert';

import { AlertRuleForm } from './AlertRuleForm';

import type { CreateAlertRuleInput } from '../hooks/useAlertRules';

interface AlertRulesListProps {
  rules: AlertRule[];
  loading: boolean;
  onToggle: (id: string, enabled: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onCreate: (input: CreateAlertRuleInput) => Promise<AlertRule | null>;
  onUpdate: (input: { id: string } & Partial<CreateAlertRuleInput>) => Promise<AlertRule | null>;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

const channelIcons: Record<string, typeof Webhook> = {
  webhook: Webhook,
  email: Mail,
  telegram: MessageSquare,
  slack: MessageSquare,
  pagerduty: Bell,
};

export function AlertRulesList({
  rules,
  loading,
  onToggle,
  onDelete,
  onCreate,
  onUpdate,
}: AlertRulesListProps) {
  const { t } = useI18n();
  const { success, error: showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggle = async (id: string, enabled: boolean) => {
    setTogglingId(id);
    const result = await onToggle(id, enabled);
    setTogglingId(null);
    if (result) {
      success(
        enabled ? t('alerts.rules.enabled') : t('alerts.rules.disabled'),
        t('alerts.rules.toggleSuccess'),
      );
    } else {
      showError(t('common.error'), t('alerts.rules.toggleFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('alerts.rules.confirmDelete'))) return;
    setDeletingId(id);
    const result = await onDelete(id);
    setDeletingId(null);
    if (result) {
      success(t('alerts.rules.deleted'), t('alerts.rules.deleteSuccess'));
    } else {
      showError(t('common.error'), t('alerts.rules.deleteFailed'));
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleFormSubmit = async (input: CreateAlertRuleInput) => {
    if (editingRule) {
      const result = await onUpdate({ id: editingRule.id, ...input });
      if (result) {
        success(t('alerts.rules.updated'), t('alerts.rules.updateSuccess'));
        setShowForm(false);
        setEditingRule(null);
        return true;
      } else {
        showError(t('common.error'), t('alerts.rules.updateFailed'));
        return false;
      }
    } else {
      const result = await onCreate(input);
      if (result) {
        success(t('alerts.rules.created'), t('alerts.rules.createSuccess'));
        setShowForm(false);
        return true;
      } else {
        showError(t('common.error'), t('alerts.rules.createFailed'));
        return false;
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRule(null);
  };

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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('alerts.rules.title')}
              </CardTitle>
              <CardDescription>{t('alerts.rules.description')}</CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t('alerts.rules.createRule')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 opacity-50" />
              <p className="mt-4 text-lg font-medium">{t('alerts.rules.noRules')}</p>
              <p className="mt-1 text-sm">{t('alerts.rules.noRulesDesc')}</p>
              <Button onClick={() => setShowForm(true)} className="mt-4" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {t('alerts.rules.createFirstRule')}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t('alerts.rules.name')}</TableHead>
                    <TableHead>{t('alerts.rules.event')}</TableHead>
                    <TableHead>{t('alerts.rules.severity')}</TableHead>
                    <TableHead>{t('alerts.rules.channels')}</TableHead>
                    <TableHead>{t('alerts.rules.cooldown')}</TableHead>
                    <TableHead className="text-center">{t('alerts.rules.status')}</TableHead>
                    <TableHead className="text-right">{t('alerts.rules.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{rule.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {rule.event}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[rule.severity] || 'bg-gray-500'}>
                          {rule.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {rule.channels?.slice(0, 3).map((channel) => {
                            const Icon = channelIcons[channel] || Bell;
                            return (
                              <Badge key={channel} variant="secondary" className="text-xs">
                                <Icon className="mr-1 h-3 w-3" />
                                {channel}
                              </Badge>
                            );
                          })}
                          {(rule.channels?.length || 0) > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(rule.channels?.length || 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {rule.cooldownMinutes || 5} {t('alerts.rules.minutes')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                          disabled={togglingId === rule.id}
                          className={cn(togglingId === rule.id && 'opacity-50')}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rule)}
                            title={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rule.id)}
                            disabled={deletingId === rule.id}
                            title={t('common.delete')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <AlertRuleForm
              rule={editingRule}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
            />
          </div>
        </div>
      )}
    </>
  );
}
