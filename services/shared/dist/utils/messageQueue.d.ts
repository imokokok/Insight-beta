import type { ProtocolMessage } from '../types';
export declare class MessageQueue {
    private readonly prefix;
    publishPriceUpdate(serviceId: string, payload: unknown): Promise<void>;
    publishHealthCheck(serviceId: string, payload: unknown): Promise<void>;
    subscribeToPrices(callback: (message: ProtocolMessage) => void): Promise<void>;
    subscribeToHealth(callback: (message: ProtocolMessage) => void): Promise<void>;
}
export declare const messageQueue: MessageQueue;
//# sourceMappingURL=messageQueue.d.ts.map