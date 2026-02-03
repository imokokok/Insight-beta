import winston from 'winston';
export interface LoggerConfig {
    serviceName: string;
    level?: string;
    console?: boolean;
}
export declare function createLogger(config: LoggerConfig): winston.Logger;
export { winston };
//# sourceMappingURL=logger.d.ts.map