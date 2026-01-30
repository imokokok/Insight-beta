import { NextResponse } from 'next/server';
import { generateSwaggerUI } from '@/lib/api/openapi';

export async function GET() {
  const html = generateSwaggerUI('/api/docs/openapi.json');

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
