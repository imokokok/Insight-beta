import {
  getAllChannels,
  getChannelById,
  createChannel as dbCreateChannel,
  updateChannel as dbUpdateChannel,
  deleteChannel as dbDeleteChannel,
  updateChannelTestStatus,
  generateChannelId,
} from '@/features/alerts/services/notificationChannelService';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationChannelConfig,
  CreateNotificationChannelInput,
  UpdateNotificationChannelInput,
} from '@/types/oracle/alert';

export { generateChannelId };

export const mockChannels: NotificationChannel[] = [
  {
    id: 'channel-1',
    name: 'Ops Webhook',
    type: 'webhook',
    enabled: true,
    config: {
      url: 'https://hooks.example.com/webhook/ops',
      secret: 'secret123',
    },
    description: 'Operations team webhook',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    testStatus: 'success',
  },
  {
    id: 'channel-2',
    name: 'Alerts Email',
    type: 'email',
    enabled: true,
    config: {
      email: 'alerts@example.com',
    },
    description: 'Primary alerts email',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    testStatus: 'success',
  },
  {
    id: 'channel-3',
    name: 'Telegram Bot',
    type: 'telegram',
    enabled: false,
    config: {
      botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      chatId: '-1001234567890',
    },
    description: 'Telegram notification bot',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsedAt: null,
    testStatus: null,
  },
];

export interface CreateChannelInput {
  name: string;
  type: NotificationChannelType;
  enabled?: boolean;
  config: NotificationChannelConfig;
  description?: string;
}

export interface UpdateChannelInput {
  id: string;
  name?: string;
  enabled?: boolean;
  config?: NotificationChannelConfig;
  description?: string;
}

export interface ChannelValidationResult {
  valid: boolean;
  error?: string;
}

function validateChannelConfig(
  type: NotificationChannelType,
  config: NotificationChannelConfig,
): ChannelValidationResult {
  switch (type) {
    case 'webhook':
      if (!config.url) {
        return { valid: false, error: 'Webhook URL is required' };
      }
      try {
        new URL(config.url);
      } catch {
        return { valid: false, error: 'Invalid webhook URL' };
      }
      break;
    case 'email':
      if (!config.email) {
        return { valid: false, error: 'Email address is required' };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.email)) {
        return { valid: false, error: 'Invalid email address' };
      }
      break;
    case 'telegram':
      if (!config.botToken) {
        return { valid: false, error: 'Bot token is required' };
      }
      if (!config.chatId) {
        return { valid: false, error: 'Chat ID is required' };
      }
      break;
    case 'slack':
      if (!config.url) {
        return { valid: false, error: 'Slack webhook URL is required' };
      }
      break;
  }
  return { valid: true };
}

export async function fetchChannels(): Promise<NotificationChannel[]> {
  return getAllChannels();
}

export async function fetchChannelById(id: string): Promise<NotificationChannel | null> {
  return getChannelById(id);
}

export async function createNewChannel(
  input: CreateChannelInput,
): Promise<{ channel: NotificationChannel } | { error: string }> {
  const configValidation = validateChannelConfig(input.type, input.config);
  if (!configValidation.valid) {
    return { error: configValidation.error! };
  }

  const channelInput: CreateNotificationChannelInput = {
    name: input.name,
    type: input.type,
    enabled: input.enabled ?? true,
    config: input.config,
    description: input.description,
  };

  try {
    const channel = await dbCreateChannel(channelInput);
    return { channel };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create channel';
    return { error: errorMessage };
  }
}

export async function updateExistingChannel(
  input: UpdateChannelInput,
): Promise<{ channel: NotificationChannel } | { error: string }> {
  const existingChannel = await getChannelById(input.id);

  if (!existingChannel) {
    return { error: 'Channel not found' };
  }

  if (input.config) {
    const configValidation = validateChannelConfig(existingChannel.type, input.config);
    if (!configValidation.valid) {
      return { error: configValidation.error! };
    }
  }

  const updateInput: UpdateNotificationChannelInput = {
    id: input.id,
    name: input.name,
    enabled: input.enabled,
    config: input.config,
    description: input.description,
  };

  try {
    const channel = await dbUpdateChannel(updateInput);
    if (!channel) {
      return { error: 'Channel not found' };
    }
    return { channel };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update channel';
    return { error: errorMessage };
  }
}

export async function deleteExistingChannel(id: string): Promise<boolean> {
  return dbDeleteChannel(id);
}

export async function setChannelTestStatus(
  id: string,
  status: NotificationChannel['testStatus'],
  message?: string,
): Promise<void> {
  return updateChannelTestStatus(id, status, message);
}

export { validateChannelConfig };
