import type { NextRequest } from 'next/server';

import { fetchChannels, createNewChannel, mockChannels } from '@/features/alerts/api';
import { ok, error } from '@/lib/api/apiResponse';
import { createNotificationChannelSchema } from '@/lib/api/validation/schemas';
import { parseAndValidate } from '@/lib/api/validation/validate';

export async function GET() {
  try {
    const channels = await fetchChannels();

    const isDev = process.env.NODE_ENV === 'development';
    const responseData =
      channels.length === 0 && isDev
        ? {
            channels: mockChannels,
            total: mockChannels.length,
            isMock: true,
            timestamp: new Date().toISOString(),
          }
        : { channels, total: channels.length, timestamp: new Date().toISOString() };

    return ok(responseData);
  } catch (err) {
    console.error('Failed to fetch channels:', err);
    return error({ code: 'FETCH_ERROR', message: 'Failed to fetch channels' }, 500);
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidate(request, createNotificationChannelSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const data = parsed.data;

  const result = await createNewChannel({
    name: data.name,
    type: data.type,
    enabled: data.enabled ?? true,
    config: data.config,
    description: data.description,
  });

  if ('error' in result) {
    return error({ code: 'VALIDATION_ERROR', message: result.error }, 400);
  }

  return ok({ channel: result.channel, timestamp: new Date().toISOString() });
}
