import { NextRequest, NextResponse } from 'next/server';
import { crossChainAnalysisService } from '@/server/oracle/crossChainAnalysisService';
import { logger } from '@/lib/logger';

const VALID_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];
const VALID_INTERVALS = ['1hour', '1day'] as const;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

function validateSymbol(symbol: string | null): string | null {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const upperSymbol = symbol.toUpperCase().trim();
  if (!VALID_SYMBOLS.includes(upperSymbol)) {
    return null;
  }
  return upperSymbol;
}

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
  return isNaN(sizeNum) || sizeNum < 1 ? DEFAULT_PAGE_SIZE : 
         sizeNum > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : sizeNum;
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const startTimeParam = searchParams.get('startTime');
  const endTimeParam = searchParams.get('endTime');
  const intervalParam = searchParams.get('interval');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');

  try {
    const validatedSymbol = validateSymbol(symbol);
    if (validatedSymbol === null) {
      return NextResponse.json(
        { 
          error: `Invalid symbol. Valid symbols: ${VALID_SYMBOLS.join(', ')}`, 
          code: 'INVALID_SYMBOL' 
        },
        { status: 400 }
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
      interval
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

    return NextResponse.json({
      success: true,
      data: paginatedAnalysis,
      pagination: createPaginationMeta({
        page,
        pageSize,
        totalCount,
        totalPages,
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cross-chain history error:', {
      error: error instanceof Error ? error.message : String(error),
      symbol,
      startTime: startTimeParam,
      endTime: endTimeParam,
      interval: intervalParam,
    });

    const errorMessage = error instanceof Error ? error.message : 'Failed to get historical data';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: 'HISTORY_ERROR',
      },
      { status: 500 }
    );
  }
}
