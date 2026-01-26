export interface APIDocumentation {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
    };
  };
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  paths: Record<string, APIPath>;
  components: {
    schemas: Record<string, Schema>;
    responses: Record<string, Response>;
    securitySchemes?: SecurityRequirement[];
  };
  tags?: string[];
  servers?: Array<{ url: string; description: string }>;
  contact?: {
    name: string;
    email: string;
  };
}

export interface APIPath {
  get?: APIOperation;
  post?: APIOperation;
  put?: APIOperation;
  delete?: APIOperation;
  patch?: APIOperation;
}

export interface APIOperation {
  summary: string;
  description: string;
  tags: string[];
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses: Record<string, APIResponse>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface APIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description: string;
  required: boolean;
  schema: Schema;
  type?: string;
  enum?: string[];
  example?: unknown;
}

export interface APIRequestBody {
  description: string;
  required: boolean;
  content: Record<string, MediaType>;
}

export interface MediaType {
  schema: Schema;
  example?: unknown;
}

export interface APIResponse {
  description: string;
  content?: Record<string, MediaType>;
}

export interface Schema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: string[];
  format?: string;
  description?: string;
  example?: unknown;
  $ref?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

export interface Response {
  description: string;
  schema?: Schema;
}

export interface SecurityRequirement {
  [key: string]: string[];
}

export interface DocGenerationOptions {
  format?: 'json' | 'html' | 'markdown';
  includeExamples?: boolean;
  includeSecurity?: boolean;
  theme?: 'light' | 'dark';
}

const DEFAULT_VERSION = '1.0.0';
const DEFAULT_THEME = 'light';

export class APIDocGenerator {
  private doc: APIDocumentation;
  private cache: Map<string, { spec: APIDocumentation; timestamp: number }> = new Map();
  private cacheTimeout: number = 300000; // 5 minutes

  constructor(config: { title: string; version?: string; description?: string; baseUrl?: string }) {
    this.doc = {
      openapi: '3.0.0',
      info: {
        title: config.title,
        version: config.version || DEFAULT_VERSION,
        description: config.description || '',
      },
      title: config.title,
      version: config.version || DEFAULT_VERSION,
      description: config.description || '',
      baseUrl: config.baseUrl || '',
      servers: config.baseUrl ? [{ url: config.baseUrl, description: 'Base URL' }] : undefined,
      paths: {},
      components: {
        schemas: {},
        responses: {},
      },
    };
  }

  addPath(path: string, methods: APIPath): void {
    this.doc.paths[path] = methods;
    this.invalidateCache();
  }

  addSchema(name: string, schema: Schema): void {
    this.doc.components.schemas[name] = schema;
    this.invalidateCache();
  }

  addResponse(name: string, response: Response): void {
    this.doc.components.responses[name] = response;
    this.invalidateCache();
  }

  addTag(tag: string): void {
    if (!this.doc.tags) {
      this.doc.tags = [];
    }
    if (!this.doc.tags.includes(tag)) {
      this.doc.tags.push(tag);
    }
    this.invalidateCache();
  }

  addContact(name: string, email: string): void {
    this.doc.info.contact = { name, email };
    this.invalidateCache();
  }

  setSecurity(schemes: SecurityRequirement[]): void {
    this.doc.components.securitySchemes = schemes;
    this.invalidateCache();
  }

  generateOpenAPISpec(options?: DocGenerationOptions): APIDocumentation {
    const format = options?.format || 'json';
    const cacheKey = `${format}-${JSON.stringify(this.doc)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.spec;
    }

    const spec = { ...this.doc };
    this.cache.set(cacheKey, { spec, timestamp: Date.now() });

    return spec;
  }

  generateHTML(options?: DocGenerationOptions): string {
    const spec = this.generateOpenAPISpec(options);
    const specJson = JSON.stringify(spec, null, 2);
    const theme = options?.theme || DEFAULT_THEME;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.doc.title} - API Documentation</title>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
    }
    .redoc-wrap {
      height: 100vh;
    }
  </style>
</head>
<body>
  <redoc spec-url="data:application/json;base64,${btoa(specJson)}"></redoc>
</body>
</html>
    `;
  }

  generateMarkdown(_options?: DocGenerationOptions): string {
    const lines: string[] = [];

    lines.push(`# ${this.doc.title}`);
    lines.push(`\n**Version:** ${this.doc.info.version}`);
    lines.push(`\n${this.doc.info.description}\n`);
    lines.push(`**Base URL:** \`${this.doc.baseUrl}\`\n`);
    lines.push('---\n');

    if (this.doc.tags && this.doc.tags.length > 0) {
      lines.push('## Tags\n');
      for (const tag of this.doc.tags) {
        lines.push(`- \`${tag}\`\n`);
      }
      lines.push('\n');
    }

    for (const [path, methods] of Object.entries(this.doc.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const methodUpper = method.toUpperCase();
        lines.push(`## ${methodUpper} ${path}\n`);
        lines.push(`\n**${operation.summary}**\n`);
        lines.push(operation.description + '\n');

        if (operation.tags && operation.tags.length > 0) {
          lines.push(`**Tags:** ${operation.tags.join(', ')}\n`);
        }

        if (operation.deprecated) {
          lines.push(`⚠️ **Deprecated:** This endpoint is deprecated\n`);
        }

        if (operation.parameters && operation.parameters.length > 0) {
          lines.push('### Parameters\n');
          lines.push('| Name | In | Type | Required | Description |');
          lines.push('|------|----|----|----------|------------|');
          for (const param of operation.parameters) {
            const required = param.required ? 'Yes' : 'No';
            const type = param.schema.type || 'unknown';
            lines.push(
              `| \`${param.name}\` | ${param.in} | ${type} | ${required} | ${param.description} |`,
            );
          }
          lines.push('\n');
        }

        if (operation.requestBody) {
          lines.push('### Request Body\n');
          lines.push(`**Required:** ${operation.requestBody.required ? 'Yes' : 'No'}\n`);
          lines.push(operation.requestBody.description + '\n');

          for (const [contentType, media] of Object.entries(operation.requestBody.content)) {
            const mediaTyped: MediaType = media as MediaType;
            lines.push(`**Content-Type:** ${contentType}\n`);
            if (mediaTyped.schema && mediaTyped.schema.example) {
              lines.push('```json');
              lines.push(JSON.stringify(mediaTyped.schema.example, null, 2));
              lines.push('```');
            }
            lines.push('\n');
          }
        }

        if (operation.responses && Object.keys(operation.responses).length > 0) {
          lines.push('### Responses\n');
          for (const [statusCode, response] of Object.entries(operation.responses)) {
            const responseTyped: APIResponse = response as APIResponse;
            lines.push(`#### ${statusCode}\n`);
            lines.push(responseTyped.description + '\n');
            if (responseTyped.content) {
              for (const [contentType, media] of Object.entries(responseTyped.content)) {
                const mediaTyped: MediaType = media as MediaType;
                lines.push(`**Content-Type:** ${contentType}\n`);
                if (mediaTyped.schema) {
                  lines.push('```json');
                  lines.push(JSON.stringify(mediaTyped.schema, null, 2));
                  lines.push('```');
                }
                lines.push('\n');
              }
            }
          }
        }

        if (operation.security && operation.security.length > 0) {
          lines.push('### Security\n');
          for (const scheme of operation.security) {
            lines.push(
              `- ${Object.entries(scheme)
                .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
                .join('; ')}\n`,
            );
          }
        }
      }
    }

    return lines.join('');
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private invalidateCache(): void {
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries()) as [
        string,
        { spec: APIDocumentation; timestamp: number },
      ][];
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - 50);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }
}

let docGenerator: APIDocGenerator | null = null;

export function getAPIDocGenerator(): APIDocGenerator {
  if (!docGenerator) {
    docGenerator = new APIDocGenerator({
      title: 'Insight API',
      version: '1.0.0',
      description: 'API documentation for the Insight oracle monitoring platform',
      baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    });
  }
  return docGenerator;
}

export function generateAPIDoc(options?: DocGenerationOptions): {
  spec: APIDocumentation;
  html?: string;
  markdown?: string;
} {
  const generator = getAPIDocGenerator();
  const format = options?.format || 'json';
  const spec = generator.generateOpenAPISpec(options);

  const result: {
    spec: APIDocumentation;
    html?: string;
    markdown?: string;
  } = { spec };

  if (format === 'html') {
    result.html = generator.generateHTML(options);
  } else if (format === 'markdown') {
    result.markdown = generator.generateMarkdown(options);
  }

  return result;
}

export function clearAPIDocCache(): void {
  const generator = getAPIDocGenerator();
  generator.clearCache();
}

export function getAPIDocCacheSize(): number {
  const generator = getAPIDocGenerator();
  return generator.getCacheSize();
}
