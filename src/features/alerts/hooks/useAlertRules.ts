'use client';

import { useState, useCallback } from 'react';

import { fetchApiData } from '@/shared/utils/api';
import { buildApiUrl } from '@/shared/utils/url';
import type { AlertRule, AlertEvent, AlertSeverity } from '@/types/oracle/alert';

export interface CreateAlertRuleInput {
  name: string;
  enabled?: boolean;
  event: AlertEvent;
  severity: AlertSeverity;
  protocols?: string[];
  chains?: string[];
  instances?: string[];
  symbols?: string[];
  params?: Record<string, unknown>;
  channels?: Array<'webhook' | 'email' | 'telegram' | 'slack' | 'pagerduty'>;
  recipients?: string[];
  cooldownMinutes?: number;
  maxNotificationsPerHour?: number;
  runbook?: string;
  owner?: string;
}

export interface UpdateAlertRuleInput extends Partial<CreateAlertRuleInput> {
  id: string;
}

export interface AlertRulesState {
  rules: AlertRule[];
  loading: boolean;
  error: string | null;
}

export interface UseAlertRulesReturn extends AlertRulesState {
  fetchRules: () => Promise<void>;
  createRule: (input: CreateAlertRuleInput) => Promise<AlertRule | null>;
  updateRule: (input: UpdateAlertRuleInput) => Promise<AlertRule | null>;
  deleteRule: (id: string) => Promise<boolean>;
  toggleRule: (id: string, enabled: boolean) => Promise<boolean>;
}

export function useAlertRules(): UseAlertRulesReturn {
  const [state, setState] = useState<AlertRulesState>({
    rules: [],
    loading: false,
    error: null,
  });

  const fetchRules = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const url = buildApiUrl('/api/alerts/rules');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch alert rules');
      }
      const data = await response.json();
      setState({
        rules: data.rules || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch alert rules';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const createRule = useCallback(async (input: CreateAlertRuleInput): Promise<AlertRule | null> => {
    try {
      const rule = await fetchApiData<AlertRule>('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      setState((prev) => ({
        ...prev,
        rules: [...prev.rules, rule],
      }));
      return rule;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create alert rule';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  const updateRule = useCallback(async (input: UpdateAlertRuleInput): Promise<AlertRule | null> => {
    try {
      const rule = await fetchApiData<AlertRule>(`/api/alerts/rules/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      setState((prev) => ({
        ...prev,
        rules: prev.rules.map((r) => (r.id === input.id ? rule : r)),
      }));
      return rule;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update alert rule';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    try {
      await fetchApiData<void>(`/api/alerts/rules/${id}`, {
        method: 'DELETE',
      });
      setState((prev) => ({
        ...prev,
        rules: prev.rules.filter((r) => r.id !== id),
      }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete alert rule';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  const toggleRule = useCallback(async (id: string, enabled: boolean): Promise<boolean> => {
    try {
      await fetchApiData<AlertRule>(`/api/alerts/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      setState((prev) => ({
        ...prev,
        rules: prev.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
      }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle alert rule';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  return {
    ...state,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}
