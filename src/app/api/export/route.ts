/**
 * Data Export API
 *
 * Provides data export functionality in multiple formats
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ExportOptions } from '@/server/export/dataExportService';
import { dataExportService } from '@/server/export/dataExportService';
import { logger } from '@/lib/logger';

/**
 * GET /api/export/templates
 *
 * Returns available export templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template');

    if (templateId) {
      const template = dataExportService.getTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          {
            success: false,
            error: 'Template not found',
          },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        data: template,
      });
    }

    const templates = dataExportService.getTemplates();
    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Failed to fetch export templates', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch templates',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/export
 *
 * Export data in specified format
 *
 * Body: {
 *   data: any[],
 *   options: ExportOptions
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, options } = body as { data: unknown[]; options: ExportOptions };

    // Validate options
    const validationErrors = dataExportService.validateExportOptions(options);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // Validate data
    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data must be an array',
        },
        { status: 400 },
      );
    }

    const result = await dataExportService.exportData(data, options);

    // Return based on format
    if (typeof result.data === 'string') {
      return new NextResponse(result.data, {
        headers: {
          'Content-Type': result.contentType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'X-Export-Size': String(result.size),
          'X-Export-Generated-At': result.generatedAt.toISOString(),
        },
      });
    } else {
      return new NextResponse(result.data, {
        headers: {
          'Content-Type': result.contentType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'X-Export-Size': String(result.size),
          'X-Export-Generated-At': result.generatedAt.toISOString(),
        },
      });
    }
  } catch (error) {
    logger.error('Export failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Export failed',
      },
      { status: 500 },
    );
  }
}
