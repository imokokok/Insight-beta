"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageQueue = exports.MessageQueue = void 0;
const redis_1 = require("./redis");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)({ serviceName: 'message-queue' });
class MessageQueue {
    prefix = 'oracle:queue';
    async publishPriceUpdate(serviceId, payload) {
        const message = {
            type: 'price_update',
            payload,
            timestamp: Date.now(),
            serviceId,
        };
        await redis_1.redisManager.publish(`${this.prefix}:price`, JSON.stringify(message));
        logger.debug('Published price update', { serviceId });
    }
    async publishHealthCheck(serviceId, payload) {
        const message = {
            type: 'health_check',
            payload,
            timestamp: Date.now(),
            serviceId,
        };
        await redis_1.redisManager.publish(`${this.prefix}:health`, JSON.stringify(message));
    }
    async subscribeToPrices(callback) {
        await redis_1.redisManager.subscribe(`${this.prefix}:price`, (msg) => {
            try {
                const parsed = JSON.parse(msg);
                callback(parsed);
            }
            catch (error) {
                logger.error('Failed to parse price message', { error });
            }
        });
    }
    async subscribeToHealth(callback) {
        await redis_1.redisManager.subscribe(`${this.prefix}:health`, (msg) => {
            try {
                const parsed = JSON.parse(msg);
                callback(parsed);
            }
            catch (error) {
                logger.error('Failed to parse health message', { error });
            }
        });
    }
}
exports.MessageQueue = MessageQueue;
exports.messageQueue = new MessageQueue();
//# sourceMappingURL=messageQueue.js.map