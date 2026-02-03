import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  console?: boolean;
}

export function createLogger(config: LoggerConfig): winston.Logger {
  const transports: winston.transport[] = [];

  if (config.console !== false) {
    transports.push(
      new winston.transports.Console({
        format: combine(timestamp(), json(), errors({ stack: true })),
      }),
    );
  }

  return winston.createLogger({
    level: config.level || 'info',
    defaultMeta: { service: config.serviceName },
    transports,
  });
}

export { winston };
