/**
 * API Error Handler
 *
 * 通用API错误处理工具
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 500,
): NextResponse {
  logger.error('API Error', { code, message, status });

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error('Unhandled API error', { error });
      return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    }
  }) as T;
}
