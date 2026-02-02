import type { NextRequest } from 'next/server';
import { handleApi } from '@/server/apiResponse';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// 允许的标签白名单（用于文档说明）
// const ALLOWED_TAGS = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'br', 'hr', 'b', 'i', 'u', 'strong', 'em'];

/**
 * 简单的 HTML 清理函数
 * 移除所有不允许的标签和属性
 */
function sanitizeHtml(html: string): string {
  // 限制 HTML 大小
  if (html.length > 100000) {
    throw new Error('html_too_large');
  }

  // 移除 script 标签及其内容
  let sanitized = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // 移除 iframe、object、embed 标签
  sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*\/>/gi, '');
  // 移除事件处理器
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  // 移除 javascript: 伪协议
  sanitized = sanitized.replace(/javascript:/gi, '');
  // 移除 data: URI
  sanitized = sanitized.replace(/data:[^;]*;base64,[^"']*/gi, '');

  return sanitized;
}

export async function POST(request: NextRequest) {
  return handleApi(request, async () => {
    const { html } = await request.json();

    // 输入验证
    if (!html || typeof html !== 'string') {
      return { error: 'invalid_html' };
    }

    // 清理 HTML
    let sanitizedHtml: string;
    try {
      sanitizedHtml = sanitizeHtml(html);
    } catch (error) {
      logger.warn('HTML sanitization failed', { error });
      return { error: 'invalid_html_content' };
    }

    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setContent(sanitizedHtml, { waitUntil: 'networkidle0', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm',
        },
      });

      await browser.close();

      logger.info('PDF generated successfully', {
        size: pdfBuffer.length,
      });

      return new Response(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="report-${Date.now()}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
        },
      });
    } catch (error) {
      logger.error('Failed to generate PDF', { error });
      return { error: 'pdf_generation_failed' };
    }
  });
}
