import {
  getAllChannels as dbGetAllChannels,
  getChannelById as dbGetChannelById,
  createChannel as dbCreateChannel,
  updateChannel as dbUpdateChannel,
  deleteChannel as dbDeleteChannel,
  updateChannelTestStatus as dbUpdateChannelTestStatus,
  updateChannelLastUsed as dbUpdateChannelLastUsed,
  generateChannelId,
} from '@/features/alerts/services/notificationChannelService';
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

export { generateChannelId };

export const getAllChannels = dbGetAllChannels;
export const getChannelById = dbGetChannelById;
export const createChannel = dbCreateChannel;
export const updateChannel = dbUpdateChannel;
export const deleteChannel = dbDeleteChannel;
export const updateChannelTestStatus = dbUpdateChannelTestStatus;
export const updateChannelLastUsed = dbUpdateChannelLastUsed;
