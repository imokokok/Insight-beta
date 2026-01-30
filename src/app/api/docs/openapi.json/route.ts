import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/lib/api/openapi';
import { headers } from 'next/headers';

export async function GET() {
  const h = await headers();
  const host = h.get('host') || 'localhost:3000';
  const protocol = h.get('x-forwarded-proto') || 'http';
  const baseUrl = `${protocol}://${host}`;

  const spec = generateOpenAPISpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
