import type { RedisClientType } from 'redis';
export interface RedisConfig {
    url?: string;
    password?: string;
    db?: number;
}
declare class RedisManager {
    private client;
    private config;
    constructor(config?: RedisConfig);
    connect(): Promise<RedisClientType>;
    disconnect(): Promise<void>;
    getClient(): RedisClientType;
    publish(channel: string, message: unknown): Promise<void>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
}
export declare const redisManager: RedisManager;
export { RedisManager };
//# sourceMappingURL=redis.d.ts.map