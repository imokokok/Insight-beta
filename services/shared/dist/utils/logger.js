"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.winston = void 0;
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
exports.winston = winston_1.default;
const { combine, timestamp, json, errors } = winston_1.default.format;
function createLogger(config) {
    const transports = [];
    if (config.console !== false) {
        transports.push(new winston_1.default.transports.Console({
            format: combine(timestamp(), json(), errors({ stack: true })),
        }));
    }
    return winston_1.default.createLogger({
        level: config.level || 'info',
        defaultMeta: { service: config.serviceName },
        transports,
    });
}
//# sourceMappingURL=logger.js.map