/**
 * OpenAPI Types - OpenAPI 规范类型定义
 */

export type OpenAPISpec = {
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
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
};

export type PathItem = {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  head?: Operation;
};

export type Operation = {
  summary: string;
  description?: string;
  tags: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: Array<Record<string, string[]>>;
};

export type Parameter = {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: Schema;
  description?: string;
};

export type RequestBody = {
  required?: boolean;
  content: {
    'application/json': {
      schema: Schema;
    };
  };
};

export type Response = {
  description: string;
  content?: {
    'application/json': {
      schema: Schema;
    };
  };
};

export type Schema =
  | {
      type: 'string';
      enum?: string[];
      description?: string;
      example?: string;
      format?: string;
      nullable?: boolean;
      pattern?: string;
    }
  | { type: 'number'; description?: string; example?: number; nullable?: boolean }
  | { type: 'integer'; description?: string; example?: number; nullable?: boolean }
  | { type: 'boolean'; description?: string; example?: boolean }
  | { type: 'array'; items: Schema; description?: string }
  | {
      type: 'object';
      properties?: Record<string, Schema>;
      required?: string[];
      description?: string;
    }
  | { $ref: string };

export type SecurityScheme =
  | { type: 'http'; scheme: 'bearer'; bearerFormat?: string }
  | { type: 'apiKey'; in: 'header'; name: string };
