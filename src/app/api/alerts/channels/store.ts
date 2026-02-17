import type { NotificationChannel } from '@/types/oracle/alert';

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

export let channelsStore: NotificationChannel[] = [...mockChannels];

export function generateChannelId(): string {
  return `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
