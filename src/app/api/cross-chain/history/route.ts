import type { NextRequest } from 'next/server';

import { VALID_SYMBOLS } from '@/config/constants';
import { crossChainAnalysisService } from '@/features/oracle/services/crossChainAnalysisService';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { validateSymbol } from '@/lib/api/validation';
import { logger } from '@/shared/logger';
import { apiSuccess, apiError, getQueryParam } from '@/shared/utils';

const VALID_INTERVALS = ['1hour', '1day'] as const;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

function validateInterval(interval: string | null): '1hour' | '1day' {
  if (interval && VALID_INTERVALS.includes(interval as '1hour' | '1day')) {
    return interval as '1hour' | '1day';
  }
  return '1day';
}

function validatePage(page: string | null): number {
  const pageNum = parseInt(page || '1', 10);
  return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
}

function validatePageSize(size: string | null): number {
  const sizeNum = parseInt(size || String(DEFAULT_PAGE_SIZE), 10);
  return isNaN(sizeNum) || sizeNum < 1
    ? DEFAULT_PAGE_SIZE
    : sizeNum > MAX_PAGE_SIZE
      ? MAX_PAGE_SIZE
      : sizeNum;
}

interface PaginationParams {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function createPaginationMeta(params: PaginationParams): Record<string, number | boolean> {
  return {
    page: params.page,
    pageSize: params.pageSize,
    totalCount: params.totalCount,
    totalPages: params.totalPages,
    hasNextPage: params.page < params.totalPages ? 1 : 0,
    hasPreviousPage: params.page > 1 ? 1 : 0,
  };
}

async function handleGet(request: NextRequest) {
  const symbol = getQueryParam(request, 'symbol');
  const startTimeParam = getQueryParam(request, 'startTime');
  const endTimeParam = getQueryParam(request, 'endTime');
  const intervalParam = getQueryParam(request, 'interval');
  const pageParam = getQueryParam(request, 'page');
  const pageSizeParam = getQueryParam(request, 'pageSize');

  const validatedSymbol = validateSymbol(symbol);
  if (validatedSymbol === null) {
    return apiError(
      'INVALID_SYMBOL',
      `Invalid symbol. Valid symbols: ${VALID_SYMBOLS.join(', ')}`,
      400,
    );
  }

  const interval = validateInterval(intervalParam);
  const page = validatePage(pageParam);
  const pageSize = validatePageSize(pageSizeParam);

  let startTime: Date;
  let endTime: Date;

  if (!startTimeParam || !endTimeParam) {
    const now = new Date();
    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endTime = now;
  } else {
    startTime = new Date(startTimeParam);
    endTime = new Date(endTimeParam);
  }

  const fullAnalysis = await crossChainAnalysisService.getHistoricalAnalysis(
    validatedSymbol,
    'price_comparison',
    startTime,
    endTime,
    interval,
  );

  const dataPoints = fullAnalysis.dataPoints;
  const totalCount = dataPoints.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDataPoints = dataPoints.slice(startIndex, endIndex);

  const paginatedAnalysis = {
    ...fullAnalysis,
    dataPoints: paginatedDataPoints,
  };

  logger.info('Cross-chain history completed', {
    symbol: validatedSymbol,
    totalDataPoints: totalCount,
    returnedDataPoints: paginatedDataPoints.length,
    page,
    pageSize,
    interval,
  });

  return apiSuccess({
    analysis: paginatedAnalysis,
    pagination: createPaginationMeta({
      page,
      pageSize,
      totalCount,
      totalPages,
    }),
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
