'use client';

import { useCallback } from 'react';

import type {
  AlertRule,
  NotificationChannel,
  CreateNotificationChannelInput,
  UpdateNotificationChannelInput,
} from '@/types/oracle/alert';

import { useAlertRules, useNotificationChannels } from '../hooks';

import type { CreateAlertRuleInput, UpdateAlertRuleInput } from './useAlertRules';

export interface UseAlertsActionsOptions {
  onDataRefresh?: () => void;
}

export interface UseAlertsActionsReturn {
  createRule: (input: CreateAlertRuleInput) => Promise<AlertRule | null>;
  updateRule: (input: UpdateAlertRuleInput) => Promise<AlertRule | null>;
  deleteRule: (id: string) => Promise<boolean>;
  toggleRule: (id: string, enabled: boolean) => Promise<boolean>;
  createChannel: (input: CreateNotificationChannelInput) => Promise<NotificationChannel | null>;
  updateChannel: (input: UpdateNotificationChannelInput) => Promise<NotificationChannel | null>;
  deleteChannel: (id: string) => Promise<boolean>;
  toggleChannel: (id: string, enabled: boolean) => Promise<boolean>;
  testChannel: (id: string) => Promise<{ success: boolean; message?: string }>;
  handleBatchActionComplete: (processed: number, failed: number) => void;
  rules: AlertRule[];
  rulesLoading: boolean;
  channels: NotificationChannel[];
  channelsLoading: boolean;
  fetchChannels: () => Promise<void>;
}

export function useAlertsActions(options: UseAlertsActionsOptions = {}): UseAlertsActionsReturn {
  const { onDataRefresh } = options;

  const {
    rules,
    loading: rulesLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  } = useAlertRules();

  const {
    channels,
    loading: channelsLoading,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    testChannel,
  } = useNotificationChannels();

  const handleBatchActionComplete = useCallback(
    (_processed: number, _failed: number) => {
      onDataRefresh?.();
    },
    [onDataRefresh],
  );

  return {
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    testChannel,
    handleBatchActionComplete,
    rules,
    rulesLoading,
    channels,
    channelsLoading,
    fetchChannels,
  };
}
