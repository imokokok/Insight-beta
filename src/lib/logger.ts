const isProd = process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProd) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (!isProd) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (!isProd) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  }
};

