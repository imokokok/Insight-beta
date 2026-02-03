import { redisManager } from './redis';
import { createLogger } from './logger';
import type { ProtocolMessage } from '../types';

const logger = createLogger({ serviceName: 'message-queue' });

export class MessageQueue {
  private readonly prefix = 'oracle:queue';

  async publishPriceUpdate(serviceId: string, payload: unknown): Promise<void> {
    const message: ProtocolMessage = {
      type: 'price_update',
      payload,
      timestamp: Date.now(),
      serviceId,
    };

    await redisManager.publish(`${this.prefix}:price`, JSON.stringify(message));
    logger.debug('Published price update', { serviceId });
  }

  async publishHealthCheck(serviceId: string, payload: unknown): Promise<void> {
    const message: ProtocolMessage = {
      type: 'health_check',
      payload,
      timestamp: Date.now(),
      serviceId,
    };

    await redisManager.publish(`${this.prefix}:health`, JSON.stringify(message));
  }

  async subscribeToPrices(callback: (message: ProtocolMessage) => void): Promise<void> {
    await redisManager.subscribe(`${this.prefix}:price`, (msg) => {
      try {
        const parsed = JSON.parse(msg) as ProtocolMessage;
        callback(parsed);
      } catch (error) {
        logger.error('Failed to parse price message', { error });
      }
    });
  }

  async subscribeToHealth(callback: (message: ProtocolMessage) => void): Promise<void> {
    await redisManager.subscribe(`${this.prefix}:health`, (msg) => {
      try {
        const parsed = JSON.parse(msg) as ProtocolMessage;
        callback(parsed);
      } catch (error) {
        logger.error('Failed to parse health message', { error });
      }
    });
  }
}

export const messageQueue = new MessageQueue();
