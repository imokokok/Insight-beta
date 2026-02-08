// 这个文件会在所有测试之前加载，用于设置环境变量
// 必须在 vitest.setup.ts 之前执行

process.env.LOG_LEVEL = 'error'; // 使用有效的日志级别
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379';
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.INSIGHT_ADMIN_TOKEN = 'test-token';
process.env.INSIGHT_ADMIN_TOKEN_SALT = 'test-salt';
process.env.INSIGHT_RATE_LIMIT_STORE = 'memory';
process.env.LOG_SAMPLE_RATE = '1';
