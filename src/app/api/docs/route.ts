import { NextResponse } from 'next/server';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DOCS_DIR = path.join(process.cwd(), 'docs/generated');

export async function GET() {
  try {
    const openapiPath = path.join(DOCS_DIR, 'openapi.json');

    if (!fs.existsSync(openapiPath)) {
      return NextResponse.json(
        {
          error: "API documentation not generated. Run 'npm run docs:api' first.",
        },
        { status: 404 },
      );
    }

    const content = fs.readFileSync(openapiPath, 'utf-8');
    const spec = JSON.parse(content);

    return NextResponse.json(spec, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load API documentation' }, { status: 500 });
  }
}
