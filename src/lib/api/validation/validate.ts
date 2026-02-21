import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';

import { error } from '../apiResponse';

import type { z } from 'zod';

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: ReturnType<z.ZodError['flatten']> };

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): ValidationResult<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { valid: false, error: result.error.flatten() };
  }
  return { valid: true, data: result.data };
}

export async function parseAndValidate<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const validation = validateBody(schema, body);
    if (!validation.valid) {
      return {
        success: false,
        response: error(
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error,
          },
          400,
        ),
      };
    }
    return { success: true, data: validation.data };
  } catch {
    return {
      success: false,
      response: error({ code: 'INVALID_JSON', message: 'Invalid JSON in request body' }, 400),
    };
  }
}
