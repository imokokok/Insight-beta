import { createLogger } from '../utils/logger';
import type { SyncConfig, PriceData, ServiceHealth } from '../types';
export interface SyncServiceOptions {
    serviceName: string;
    protocol: string;
}
export declare abstract class BaseSyncService {
    protected logger: ReturnType<typeof createLogger>;
    protected config: SyncConfig | null;
    protected isRunning: boolean;
    protected syncInterval?: NodeJS.Timeout;
    protected health: ServiceHealth;
    private readonly serviceName;
    private readonly protocol;
    private errorWindow;
    constructor(options: SyncServiceOptions);
    /**
     * Initialize the service with configuration
     */
    initialize(config: SyncConfig): Promise<void>;
    /**
     * Start the sync service
     */
    start(): Promise<void>;
    /**
     * Stop the sync service
     */
    stop(): Promise<void>;
    /**
     * Get current health status
     */
    getHealth(): ServiceHealth;
    /**
     * Force a sync operation
     */
    forceSync(): Promise<void>;
    /**
     * Abstract method to fetch prices - must be implemented by subclasses
     */
    protected abstract fetchPrices(): Promise<PriceData[]>;
    /**
     * Perform a single sync operation
     */
    private performSync;
    /**
     * Update error rate based on sliding window
     */
    private updateErrorRate;
    /**
     * Update overall health status
     */
    private updateHealthStatus;
}
//# sourceMappingURL=BaseSyncService.d.ts.map