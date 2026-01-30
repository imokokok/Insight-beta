import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Insight Oracle API',
        version: '1.0.0',
        description: '预言机监控和争议解决系统的 REST API 文档',
        contact: {
          name: 'Insight Team',
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
          description: 'API 服务器',
        },
      ],
      tags: [
        { name: 'Oracle', description: '预言机核心功能' },
        { name: 'Assertions', description: '断言管理' },
        { name: 'Disputes', description: '争议管理' },
        { name: 'Alerts', description: '告警管理' },
        { name: 'Config', description: '配置管理' },
        { name: 'UMA', description: 'UMA 协议集成' },
        { name: 'Admin', description: '管理接口' },
        { name: 'Health', description: '健康检查' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Admin Token 认证',
          },
        },
        schemas: {
          Assertion: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '断言唯一标识' },
              claim: { type: 'string', description: '断言声明内容' },
              asserter: { type: 'string', description: '断言者地址' },
              bond: { type: 'string', description: '质押金额' },
              expirationTime: { type: 'string', format: 'date-time', description: '过期时间' },
              status: {
                type: 'string',
                enum: ['pending', 'expired', 'disputed', 'settled'],
                description: '断言状态',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'claim', 'asserter', 'status'],
          },
          Dispute: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '争议唯一标识' },
              assertionId: { type: 'string', description: '关联断言ID' },
              disputer: { type: 'string', description: '争议者地址' },
              bond: { type: 'string', description: '争议质押金额' },
              status: {
                type: 'string',
                enum: ['active', 'resolved', 'rejected'],
                description: '争议状态',
              },
              createdAt: { type: 'string', format: 'date-time' },
              resolvedAt: { type: 'string', format: 'date-time', nullable: true },
            },
            required: ['id', 'assertionId', 'disputer', 'status'],
          },
          Alert: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '告警唯一标识' },
              type: {
                type: 'string',
                enum: ['assertion', 'dispute', 'system'],
                description: '告警类型',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: '严重程度',
              },
              message: { type: 'string', description: '告警消息' },
              metadata: { type: 'object', description: '附加元数据' },
              acknowledged: { type: 'boolean', description: '是否已确认' },
              createdAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'type', 'severity', 'message'],
          },
          OracleConfig: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              key: { type: 'string', description: '配置键' },
              value: { type: 'object', description: '配置值' },
              description: { type: 'string', description: '配置说明' },
              updatedBy: { type: 'string', description: '更新者地址' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'key', 'value'],
          },
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', description: '请求是否成功' },
              data: { type: 'object', description: '响应数据' },
              error: { type: 'string', description: '错误信息', nullable: true },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: '当前页码' },
                  limit: { type: 'integer', description: '每页数量' },
                  total: { type: 'integer', description: '总记录数' },
                  totalPages: { type: 'integer', description: '总页数' },
                },
              },
            },
            required: ['success'],
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', description: '错误描述' },
              code: { type: 'string', description: '错误代码' },
              details: { type: 'object', description: '详细错误信息', nullable: true },
            },
            required: ['success', 'error'],
          },
          OracleStats: {
            type: 'object',
            properties: {
              tvsUsd: { type: 'number', description: '总质押价值（美元）' },
              activeDisputes: { type: 'number', description: '活跃争议数' },
              resolved24h: { type: 'number', description: '24小时内解决的争议数' },
              avgResolutionMinutes: { type: 'number', description: '平均解决时间（分钟）' },
            },
            required: ['tvsUsd', 'activeDisputes', 'resolved24h', 'avgResolutionMinutes'],
          },
          AuditLogEntry: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '日志唯一标识' },
              timestamp: { type: 'string', format: 'date-time', description: '日志时间' },
              action: { type: 'string', description: '操作类型' },
              actor: { type: 'string', description: '操作者' },
              actorType: {
                type: 'string',
                enum: ['user', 'admin', 'system', 'anonymous'],
                description: '操作者类型',
              },
              severity: {
                type: 'string',
                enum: ['info', 'warning', 'critical'],
                description: '严重程度',
              },
              details: { type: 'object', description: '详细内容' },
              ip: { type: 'string', description: 'IP地址' },
              userAgent: { type: 'string', description: '用户代理' },
              success: { type: 'boolean', description: '是否成功' },
              errorMessage: { type: 'string', description: '错误信息', nullable: true },
            },
            required: ['id', 'timestamp', 'action', 'actor', 'severity', 'success'],
          },
          PaginationMeta: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: '总记录数' },
              limit: { type: 'integer', description: '每页数量' },
              offset: { type: 'integer', description: '偏移量' },
              nextCursor: { type: 'integer', description: '下一页游标', nullable: true },
            },
            required: ['total', 'limit', 'offset'],
          },
        },
      },
    },
  });
  return spec;
};
