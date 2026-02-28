import { error, ok } from '@/lib/api/apiResponse';

async function fetchEndpoint(baseUrl: string, path: string) {
  try {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const [airnodesData, oevData, dapisData] = await Promise.all([
      fetchEndpoint(baseUrl, '/api/oracle/api3/airnodes'),
      fetchEndpoint(baseUrl, '/api/oracle/api3/oev'),
      fetchEndpoint(baseUrl, '/api/oracle/api3/dapis'),
    ]);

    const result = {
      airnodes: airnodesData?.data ?? null,
      oev: oevData?.data ?? null,
      dapis: dapisData?.data ?? null,
    };

    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
