'use client';

import { useState, useCallback } from 'react';

import { fetchApiData } from '@/shared/utils/api';
import { buildApiUrl } from '@/shared/utils/url';
import type {
  NotificationChannel,
  CreateNotificationChannelInput,
  UpdateNotificationChannelInput,
} from '@/types/oracle/alert';

export interface NotificationChannelsState {
  channels: NotificationChannel[];
  loading: boolean;
  error: string | null;
}

export interface UseNotificationChannelsReturn extends NotificationChannelsState {
  fetchChannels: () => Promise<void>;
  createChannel: (input: CreateNotificationChannelInput) => Promise<NotificationChannel | null>;
  updateChannel: (input: UpdateNotificationChannelInput) => Promise<NotificationChannel | null>;
  deleteChannel: (id: string) => Promise<boolean>;
  toggleChannel: (id: string, enabled: boolean) => Promise<boolean>;
  testChannel: (id: string) => Promise<{ success: boolean; message?: string }>;
}

export function useNotificationChannels(): UseNotificationChannelsReturn {
  const [state, setState] = useState<NotificationChannelsState>({
    channels: [],
    loading: false,
    error: null,
  });

  const fetchChannels = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const url = buildApiUrl('/api/alerts/channels');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch notification channels');
      }
      const data = await response.json();
      setState({
        channels: data.channels || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch notification channels';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const createChannel = useCallback(
    async (input: CreateNotificationChannelInput): Promise<NotificationChannel | null> => {
      try {
        const channel = await fetchApiData<NotificationChannel>('/api/alerts/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        setState((prev) => ({
          ...prev,
          channels: [...prev.channels, channel],
        }));
        return channel;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to create notification channel';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [],
  );

  const updateChannel = useCallback(
    async (input: UpdateNotificationChannelInput): Promise<NotificationChannel | null> => {
      try {
        const channel = await fetchApiData<NotificationChannel>(
          `/api/alerts/channels/${input.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
        );
        setState((prev) => ({
          ...prev,
          channels: prev.channels.map((c) => (c.id === input.id ? channel : c)),
        }));
        return channel;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update notification channel';
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [],
  );

  const deleteChannel = useCallback(async (id: string): Promise<boolean> => {
    try {
      await fetchApiData<void>(`/api/alerts/channels/${id}`, {
        method: 'DELETE',
      });
      setState((prev) => ({
        ...prev,
        channels: prev.channels.filter((c) => c.id !== id),
      }));
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete notification channel';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  const toggleChannel = useCallback(async (id: string, enabled: boolean): Promise<boolean> => {
    try {
      await fetchApiData<NotificationChannel>(`/api/alerts/channels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      setState((prev) => ({
        ...prev,
        channels: prev.channels.map((c) => (c.id === id ? { ...c, enabled } : c)),
      }));
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to toggle notification channel';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  const testChannel = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const result = await fetchApiData<{ success: boolean; message?: string }>(
          `/api/alerts/channels/${id}/test`,
          {
            method: 'POST',
          },
        );
        setState((prev) => ({
          ...prev,
          channels: prev.channels.map((c) =>
            c.id === id
              ? {
                  ...c,
                  testStatus: result.success ? 'success' : 'failed',
                  testMessage: result.message,
                }
              : c,
          ),
        }));
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to test notification channel';
        setState((prev) => ({
          ...prev,
          channels: prev.channels.map((c) =>
            c.id === id
              ? {
                  ...c,
                  testStatus: 'failed' as const,
                  testMessage: errorMessage,
                }
              : c,
          ),
        }));
        return { success: false, message: errorMessage };
      }
    },
    [],
  );

  return {
    ...state,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    testChannel,
  };
}
