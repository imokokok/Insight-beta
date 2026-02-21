import { query, hasDatabase } from '@/lib/database/db';
import { encryptString, decryptString } from '@/lib/security/encryption';
import { logger } from '@/shared/logger';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationChannelConfig,
  CreateNotificationChannelInput,
  UpdateNotificationChannelInput,
} from '@/types/oracle/alert';

const SENSITIVE_FIELDS: (keyof NotificationChannelConfig)[] = ['secret', 'botToken'];

interface NotificationChannelRow {
  id: string;
  name: string;
  type: NotificationChannelType;
  enabled: boolean;
  config: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  last_used_at: Date | null;
  test_status: string | null;
  test_message: string | null;
}

function generateChannelId(): string {
  return `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function encryptSensitiveFields(config: NotificationChannelConfig): NotificationChannelConfig {
  const encryptedConfig = { ...config };

  for (const field of SENSITIVE_FIELDS) {
    const value = encryptedConfig[field];
    if (typeof value === 'string' && value) {
      const encrypted = encryptString(value);
      if (encrypted) {
        (encryptedConfig as Record<string, unknown>)[field] = encrypted;
      }
    }
  }

  return encryptedConfig;
}

function decryptSensitiveFields(config: NotificationChannelConfig): NotificationChannelConfig {
  const decryptedConfig = { ...config };

  for (const field of SENSITIVE_FIELDS) {
    const value = decryptedConfig[field];
    if (typeof value === 'string' && value) {
      const decrypted = decryptString(value);
      if (decrypted) {
        (decryptedConfig as Record<string, unknown>)[field] = decrypted;
      }
    }
  }

  return decryptedConfig;
}

function rowToChannel(row: NotificationChannelRow): NotificationChannel {
  let config: NotificationChannelConfig;
  try {
    const parsedConfig = JSON.parse(row.config) as NotificationChannelConfig;
    config = decryptSensitiveFields(parsedConfig);
  } catch {
    config = {};
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    enabled: row.enabled,
    config,
    description: row.description ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    testStatus: (row.test_status as NotificationChannel['testStatus']) ?? null,
    testMessage: row.test_message ?? null,
  };
}

export async function getAllChannels(): Promise<NotificationChannel[]> {
  if (!hasDatabase()) {
    logger.warn('Database not available, returning empty channels list');
    return [];
  }

  try {
    const result = await query<NotificationChannelRow>(
      'SELECT * FROM notification_channels ORDER BY created_at DESC',
    );

    return result.rows.map(rowToChannel);
  } catch (error) {
    logger.error('Failed to fetch notification channels', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getChannelById(id: string): Promise<NotificationChannel | null> {
  if (!hasDatabase()) {
    return null;
  }

  try {
    const result = await query<NotificationChannelRow>(
      'SELECT * FROM notification_channels WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return null;
    }

    return rowToChannel(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch notification channel by id', {
      error: error instanceof Error ? error.message : String(error),
      channelId: id,
    });
    throw error;
  }
}

export async function createChannel(
  input: CreateNotificationChannelInput,
): Promise<NotificationChannel> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const id = generateChannelId();
  const now = new Date();
  const encryptedConfig = encryptSensitiveFields(input.config);

  try {
    await query(
      `INSERT INTO notification_channels 
       (id, name, type, enabled, config, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        input.name,
        input.type,
        input.enabled ?? true,
        JSON.stringify(encryptedConfig),
        input.description ?? null,
        now,
        now,
      ],
    );

    const channel: NotificationChannel = {
      id,
      name: input.name,
      type: input.type,
      enabled: input.enabled ?? true,
      config: input.config,
      description: input.description,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastUsedAt: null,
      testStatus: null,
    };

    logger.info('Created notification channel', {
      channelId: id,
      type: input.type,
      name: input.name,
    });

    return channel;
  } catch (error) {
    logger.error('Failed to create notification channel', {
      error: error instanceof Error ? error.message : String(error),
      input: { name: input.name, type: input.type },
    });
    throw error;
  }
}

export async function updateChannel(
  input: UpdateNotificationChannelInput,
): Promise<NotificationChannel | null> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const existingChannel = await getChannelById(input.id);
  if (!existingChannel) {
    return null;
  }

  const updates: string[] = [];
  const values: (string | number | boolean | Date | null)[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }

  if (input.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(input.type);
  }

  if (input.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(input.enabled);
  }

  if (input.config !== undefined) {
    updates.push(`config = $${paramIndex++}`);
    const encryptedConfig = encryptSensitiveFields(input.config);
    values.push(JSON.stringify(encryptedConfig));
  }

  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description ?? null);
  }

  if (updates.length === 0) {
    return existingChannel;
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());

  values.push(input.id);

  try {
    await query(
      `UPDATE notification_channels SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );

    const updatedChannel = await getChannelById(input.id);

    logger.info('Updated notification channel', {
      channelId: input.id,
      updatedFields: Object.keys(input).filter((k) => k !== 'id'),
    });

    return updatedChannel;
  } catch (error) {
    logger.error('Failed to update notification channel', {
      error: error instanceof Error ? error.message : String(error),
      channelId: input.id,
    });
    throw error;
  }
}

export async function deleteChannel(id: string): Promise<boolean> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  try {
    const result = await query('DELETE FROM notification_channels WHERE id = $1', [id]);

    const deleted = result.rowCount !== null && result.rowCount > 0;

    if (deleted) {
      logger.info('Deleted notification channel', { channelId: id });
    }

    return deleted;
  } catch (error) {
    logger.error('Failed to delete notification channel', {
      error: error instanceof Error ? error.message : String(error),
      channelId: id,
    });
    throw error;
  }
}

export async function updateChannelTestStatus(
  id: string,
  status: NotificationChannel['testStatus'],
  message?: string,
): Promise<void> {
  if (!hasDatabase()) {
    return;
  }

  try {
    await query(
      `UPDATE notification_channels 
       SET test_status = $1, test_message = $2, updated_at = $3
       WHERE id = $4`,
      [status, message ?? null, new Date(), id],
    );

    logger.debug('Updated channel test status', {
      channelId: id,
      status,
    });
  } catch (error) {
    logger.error('Failed to update channel test status', {
      error: error instanceof Error ? error.message : String(error),
      channelId: id,
    });
    throw error;
  }
}

export async function updateChannelLastUsed(id: string): Promise<void> {
  if (!hasDatabase()) {
    return;
  }

  try {
    await query(
      'UPDATE notification_channels SET last_used_at = $1, updated_at = $1 WHERE id = $2',
      [new Date(), id],
    );
  } catch (error) {
    logger.error('Failed to update channel last used timestamp', {
      error: error instanceof Error ? error.message : String(error),
      channelId: id,
    });
  }
}

export { generateChannelId };
