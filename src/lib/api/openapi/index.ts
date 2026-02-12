/**
 * OpenAPI Module - OpenAPI/Swagger 文档生成器
 *
 * 自动生成 API 文档，支持 Swagger UI 展示
 */

export type {
  OpenAPISpec,
  PathItem,
  Operation,
  Parameter,
  RequestBody,
  Response,
  Schema,
  SecurityScheme,
} from './types';

export { zodToOpenAPISchema } from './zodConverter';
export { apiRegistry, APIRegistry } from './registry';
export { commonSchemas, securitySchemes } from './schemas';
export { apiRoutes } from './routes';
export { generateOpenAPISpec, generateSwaggerUI } from './utils';
