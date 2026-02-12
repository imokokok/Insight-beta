/**
 * OpenAPI/Swagger 文档生成器
 * 自动生成 API 文档，支持 Swagger UI 展示
 *
 * @deprecated 请使用 '@/lib/api/openapi' 模块导入
 */

export {
  apiRegistry,
  APIRegistry,
  zodToOpenAPISchema,
  generateOpenAPISpec,
  generateSwaggerUI,
  type OpenAPISpec,
  type PathItem,
  type Operation,
  type Parameter,
  type RequestBody,
  type Response,
  type Schema,
  type SecurityScheme,
} from './openapi/index';
