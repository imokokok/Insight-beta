/**
 * Streaming - 流式响应处理
 *
 * 用于大数据导出和实时数据流
 */

import { Readable } from 'stream';

// ============================================================================
// NDJSON 流（Newline Delimited JSON）
// ============================================================================

export interface NDJSONStreamOptions {
  batchSize?: number;
  flushInterval?: number;
}

export class NDJSONStream<T> extends Readable {
  private buffer: T[] = [];
  private isReading = false;
  private flushTimer?: NodeJS.Timeout;

  constructor(
    private dataSource: AsyncIterable<T>,
    private options: NDJSONStreamOptions = {},
  ) {
    super({ objectMode: true });
    this.options = {
      batchSize: 100,
      flushInterval: 1000,
      ...options,
    };
  }

  async _read(): Promise<void> {
    if (this.isReading) return;
    this.isReading = true;

    try {
      for await (const item of this.dataSource) {
        this.buffer.push(item);

        if (this.buffer.length >= (this.options.batchSize || 100)) {
          this.flush();
        }
      }

      // 刷新剩余数据
      this.flush();
      this.push(null);
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isReading = false;
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    for (const item of this.buffer) {
      this.push(JSON.stringify(item) + '\n');
    }

    this.buffer = [];
  }
}

// ============================================================================
// CSV 流
// ============================================================================

export interface CSVStreamOptions {
  headers: string[];
  batchSize?: number;
  delimiter?: string;
}

export class CSVStream<T extends Record<string, unknown>> extends Readable {
  private buffer: T[] = [];
  private isReading = false;
  private headersSent = false;

  constructor(
    private dataSource: AsyncIterable<T>,
    private options: CSVStreamOptions,
  ) {
    super({ objectMode: true });
    this.options = {
      batchSize: 100,
      delimiter: ',',
      ...options,
    };
  }

  async _read(): Promise<void> {
    if (this.isReading) return;
    this.isReading = true;

    try {
      // 发送 CSV 头
      if (!this.headersSent) {
        this.push(this.options.headers.join(this.options.delimiter) + '\n');
        this.headersSent = true;
      }

      for await (const item of this.dataSource) {
        this.buffer.push(item);

        if (this.buffer.length >= (this.options.batchSize || 100)) {
          this.flush();
        }
      }

      this.flush();
      this.push(null);
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isReading = false;
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    for (const item of this.buffer) {
      const row = this.options.headers
        .map((header) => {
          const value = item[header];
          // 处理包含逗号或引号的值
          const stringValue = String(value ?? '');
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(this.options.delimiter);

      this.push(row + '\n');
    }

    this.buffer = [];
  }
}

// ============================================================================
// SSE 流（Server-Sent Events）
// ============================================================================

export interface SSEEvent {
  id?: string;
  event?: string;
  data: unknown;
  retry?: number;
}

export class SSEStream extends Readable {
  private isReading = false;

  constructor(private eventSource: AsyncIterable<SSEEvent>) {
    super({ objectMode: true });
  }

  async _read(): Promise<void> {
    if (this.isReading) return;
    this.isReading = true;

    try {
      for await (const event of this.eventSource) {
        const lines: string[] = [];

        if (event.id) {
          lines.push(`id: ${event.id}`);
        }

        if (event.event) {
          lines.push(`event: ${event.event}`);
        }

        if (event.retry) {
          lines.push(`retry: ${event.retry}`);
        }

        // 数据可能有多行
        const dataLines = JSON.stringify(event.data).split('\n');
        for (const line of dataLines) {
          lines.push(`data: ${line}`);
        }

        lines.push(''); // 空行表示事件结束
        this.push(lines.join('\n') + '\n');
      }

      this.push(null);
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isReading = false;
    }
  }
}

// ============================================================================
// 流式响应辅助
// ============================================================================

export function createStreamingResponse(
  stream: Readable,
  contentType: string,
  headers?: Record<string, string>,
): Response {
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: string | Buffer) => {
        const text = typeof chunk === 'string' ? chunk : chunk.toString();
        controller.enqueue(encoder.encode(text));
      });

      stream.on('end', () => {
        controller.close();
      });

      stream.on('error', (error) => {
        controller.error(error);
      });
    },

    cancel() {
      stream.destroy();
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...headers,
    },
  });
}

// ============================================================================
// 导出辅助
// ============================================================================

export function exportAsNDJSON<T>(dataSource: AsyncIterable<T>, filename: string): Response {
  const stream = new NDJSONStream(dataSource);
  return createStreamingResponse(stream, 'application/x-ndjson', {
    'Content-Disposition': `attachment; filename="${filename}.ndjson"`,
  });
}

export function exportAsCSV<T extends Record<string, unknown>>(
  dataSource: AsyncIterable<T>,
  headers: string[],
  filename: string,
): Response {
  const stream = new CSVStream(dataSource, { headers });
  return createStreamingResponse(stream, 'text/csv', {
    'Content-Disposition': `attachment; filename="${filename}.csv"`,
  });
}

export function createSSEStream(eventSource: AsyncIterable<SSEEvent>): Response {
  const stream = new SSEStream(eventSource);
  return createStreamingResponse(stream, 'text/event-stream', {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
}
