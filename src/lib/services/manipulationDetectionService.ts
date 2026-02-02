import { ManipulationDetector } from '@/lib/security/manipulationDetector';
import { AlertService } from '@/lib/services/alertService';
import { WebhookService } from '@/lib/services/webhookService';
import { createSupabaseClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import type {
  ManipulationDetection,
  ManipulationDetectionConfig,
  DetectionMetrics,
  DetectionRule,
  PriceDataPoint,
  TransactionData,
} from '@/lib/types/security/manipulation';
import type { OracleProtocol, SupportedChain } from '@/lib/types';

export interface DetectionServiceConfig {
  detection: ManipulationDetectionConfig;
  alertChannels: {
    email?: boolean;
    webhook?: boolean;
    slack?: boolean;
    telegram?: boolean;
  };
  autoBlockSuspiciousFeeds: boolean;
  notificationCooldownMs: number;
}

const DEFAULT_SERVICE_CONFIG: DetectionServiceConfig = {
  detection: {
    zScoreThreshold: 3,
    minConfidenceScore: 0.7,
    timeWindowMs: 300000,
    minDataPoints: 10,
    flashLoanMinAmountUsd: 100000,
    sandwichProfitThresholdUsd: 1000,
    liquidityChangeThreshold: 0.3,
    maxPriceDeviationPercent: 5,
    correlationThreshold: 0.8,
    enabledRules: [
      'statistical_anomaly',
      'flash_loan_attack',
      'sandwich_attack',
      'liquidity_manipulation',
    ],
  },
  alertChannels: {
    email: true,
    webhook: true,
    slack: false,
    telegram: false,
  },
  autoBlockSuspiciousFeeds: false,
  notificationCooldownMs: 300000,
};

export class ManipulationDetectionService {
  private detector: ManipulationDetector;
  private alertService: AlertService;
  private webhookService: WebhookService;
  private supabase = createSupabaseClient();
  private config: DetectionServiceConfig;
  private isRunning = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private metrics: DetectionMetrics = {
    totalDetections: 0,
    detectionsByType: {},
    detectionsBySeverity: {},
    falsePositives: 0,
    averageConfidence: 0,
    lastDetectionTime: undefined,
  };

  constructor(config: Partial<DetectionServiceConfig> = {}) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
    this.detector = new ManipulationDetector(this.config.detection);
    this.alertService = new AlertService();
    this.webhookService = new WebhookService();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Manipulation Detection Service...');
    await this.loadHistoricalMetrics();
    logger.info('Manipulation Detection Service initialized');
  }

  async startMonitoring(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
    intervalMs: number = 10000,
  ): Promise<void> {
    const feedKey = `${protocol}:${chain}:${symbol}`;

    if (this.monitoringIntervals.has(feedKey)) {
      logger.warn(`Already monitoring ${feedKey}`);
      return;
    }

    logger.info(`Starting manipulation monitoring for ${feedKey}`);

    const interval = setInterval(async () => {
      try {
        await this.analyzeFeed(protocol, symbol, chain);
      } catch (error) {
        logger.error(`Error analyzing ${feedKey}:`, error);
      }
    }, intervalMs);

    this.monitoringIntervals.set(feedKey, interval);
    this.isRunning = true;

    await this.logMonitoringEvent('started', protocol, symbol, chain);
  }

  stopMonitoring(protocol: OracleProtocol, symbol: string, chain: SupportedChain): void {
    const feedKey = `${protocol}:${chain}:${symbol}`;
    const interval = this.monitoringIntervals.get(feedKey);

    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(feedKey);
      logger.info(`Stopped monitoring ${feedKey}`);
    }

    if (this.monitoringIntervals.size === 0) {
      this.isRunning = false;
    }
  }

  stopAllMonitoring(): void {
    for (const [feedKey, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      logger.info(`Stopped monitoring ${feedKey}`);
    }
    this.monitoringIntervals.clear();
    this.isRunning = false;
  }

  private async analyzeFeed(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<void> {
    try {
      const historicalData = await this.fetchHistoricalPriceData(protocol, symbol, chain);
      const recentTransactions = await this.fetchRecentTransactions(protocol, symbol, chain);
      const currentPrice = await this.fetchCurrentPrice(protocol, symbol, chain);

      if (!currentPrice || historicalData.length < this.config.detection.minDataPoints) {
        return;
      }

      const detection = await this.detector.analyzePriceFeed(
        protocol,
        symbol,
        chain,
        currentPrice,
        historicalData,
        recentTransactions,
      );

      if (detection) {
        await this.handleDetection(detection);
      }
    } catch (error) {
      logger.error(`Error in analyzeFeed for ${protocol}:${chain}:${symbol}:`, error);
    }
  }

  private async handleDetection(detection: ManipulationDetection): Promise<void> {
    logger.warn(`Manipulation detected: ${detection.type} (${detection.severity})`, {
      protocol: detection.protocol,
      symbol: detection.symbol,
      confidence: detection.confidenceScore,
    });

    await this.saveDetection(detection);
    await this.updateMetrics(detection);

    if (this.shouldSendAlert(detection)) {
      await this.sendAlerts(detection);
    }

    if (this.config.autoBlockSuspiciousFeeds && detection.severity === 'critical') {
      await this.blockSuspiciousFeed(detection);
    }
  }

  private shouldSendAlert(detection: ManipulationDetection): boolean {
    const lastAlert = this.detector['lastAlertTime'].get(detection.feedKey);
    const now = Date.now();

    if (lastAlert && now - lastAlert < this.config.notificationCooldownMs) {
      return false;
    }

    return detection.severity === 'high' || detection.severity === 'critical';
  }

  private async sendAlerts(detection: ManipulationDetection): Promise<void> {
    const alertPromises: Promise<void>[] = [];

    if (this.config.alertChannels.email) {
      alertPromises.push(this.sendEmailAlert(detection));
    }

    if (this.config.alertChannels.webhook) {
      alertPromises.push(this.sendWebhookAlert(detection));
    }

    if (this.config.alertChannels.slack) {
      alertPromises.push(this.sendSlackAlert(detection));
    }

    if (this.config.alertChannels.telegram) {
      alertPromises.push(this.sendTelegramAlert(detection));
    }

    await Promise.allSettled(alertPromises);
  }

  private async sendEmailAlert(detection: ManipulationDetection): Promise<void> {
    try {
      const subject = `[${detection.severity.toUpperCase()}] Price Manipulation Detected - ${detection.symbol}`;
      const body = this.formatAlertMessage(detection);

      await this.alertService.sendEmail({
        to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        subject,
        body,
        priority: detection.severity === 'critical' ? 'high' : 'normal',
      });
    } catch (error) {
      logger.error('Failed to send email alert:', error);
    }
  }

  private async sendWebhookAlert(detection: ManipulationDetection): Promise<void> {
    try {
      await this.webhookService.send({
        event: 'manipulation_detected',
        data: detection,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to send webhook alert:', error);
    }
  }

  private async sendSlackAlert(detection: ManipulationDetection): Promise<void> {
    try {
      const color = detection.severity === 'critical' ? '#FF0000' : '#FFA500';
      const message = {
        attachments: [
          {
            color,
            title: `🚨 Price Manipulation Detected - ${detection.type}`,
            fields: [
              { title: 'Protocol', value: detection.protocol, short: true },
              { title: 'Symbol', value: detection.symbol, short: true },
              { title: 'Chain', value: detection.chain, short: true },
              { title: 'Severity', value: detection.severity, short: true },
              { title: 'Confidence', value: `${(detection.confidenceScore * 100).toFixed(1)}%`, short: true },
              { title: 'Detected At', value: new Date(detection.detectedAt).toLocaleString(), short: true },
            ],
            footer: 'Oracle Monitor Security',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
      }
    } catch (error) {
      logger.error('Failed to send Slack alert:', error);
    }
  }

  private async sendTelegramAlert(detection: ManipulationDetection): Promise<void> {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) return;

      const emoji = detection.severity === 'critical' ? '🔴' : '🟠';
      const message = `${emoji} *Price Manipulation Detected*\n\n` +
        `*Type:* ${detection.type}\n` +
        `*Protocol:* ${detection.protocol}\n` +
        `*Symbol:* ${detection.symbol}\n` +
        `*Chain:* ${detection.chain}\n` +
        `*Severity:* ${detection.severity}\n` +
        `*Confidence:* ${(detection.confidenceScore * 100).toFixed(1)}%\n` +
        `*Time:* ${new Date(detection.detectedAt).toLocaleString()}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
    } catch (error) {
      logger.error('Failed to send Telegram alert:', error);
    }
  }

  private formatAlertMessage(detection: ManipulationDetection): string {
    return `
Price Manipulation Alert
========================

Type: ${detection.type}
Severity: ${detection.severity.toUpperCase()}
Protocol: ${detection.protocol}
Symbol: ${detection.symbol}
Chain: ${detection.chain}
Confidence: ${(detection.confidenceScore * 100).toFixed(1)}%

Evidence:
${detection.evidence.map((e, i) => `${i + 1}. ${e.type}: ${e.description} (Confidence: ${(e.confidence * 100).toFixed(1)}%)`).join('\n')}

Suspicious Transactions:
${detection.suspiciousTransactions.map((tx, i) => `${i + 1}. ${tx.hash} - ${tx.type} (${tx.valueUsd ? `$${tx.valueUsd.toLocaleString()}` : 'N/A'})`).join('\n')}

Detected At: ${new Date(detection.detectedAt).toLocaleString()}
    `.trim();
  }

  private async saveDetection(detection: ManipulationDetection): Promise<void> {
    try {
      const { error } = await this.supabase.from('manipulation_detections').insert({
        id: detection.id,
        protocol: detection.protocol,
        symbol: detection.symbol,
        chain: detection.chain,
        feed_key: detection.feedKey,
        type: detection.type,
        severity: detection.severity,
        confidence_score: detection.confidenceScore,
        detected_at: detection.detectedAt,
        evidence: detection.evidence,
        suspicious_transactions: detection.suspiciousTransactions,
        related_blocks: detection.relatedBlocks,
        price_impact: detection.priceImpact,
        financial_impact_usd: detection.financialImpactUsd,
        affected_addresses: detection.affectedAddresses,
        status: detection.status,
        reviewed_by: detection.reviewedBy,
        reviewed_at: detection.reviewedAt,
        notes: detection.notes,
      });

      if (error) {
        logger.error('Failed to save detection to database:', error);
      }
    } catch (error) {
      logger.error('Error saving detection:', error);
    }
  }

  private async updateMetrics(detection: ManipulationDetection): Promise<void> {
    this.metrics.totalDetections++;
    this.metrics.detectionsByType[detection.type] = (this.metrics.detectionsByType[detection.type] || 0) + 1;
    this.metrics.detectionsBySeverity[detection.severity] = (this.metrics.detectionsBySeverity[detection.severity] || 0) + 1;
    this.metrics.lastDetectionTime = detection.detectedAt;

    const totalConfidence = Object.values(this.metrics.detectionsByType).reduce((sum, count) => {
      return sum + detection.confidenceScore * count;
    }, 0);
    this.metrics.averageConfidence = totalConfidence / this.metrics.totalDetections;

    await this.saveMetrics();
  }

  private async loadHistoricalMetrics(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('detection_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        this.metrics = {
          totalDetections: data.total_detections,
          detectionsByType: data.detections_by_type,
          detectionsBySeverity: data.detections_by_severity,
          falsePositives: data.false_positives,
          averageConfidence: data.average_confidence,
          lastDetectionTime: data.last_detection_time,
        };
      }
    } catch (error) {
      logger.error('Failed to load historical metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await this.supabase.from('detection_metrics').insert({
        total_detections: this.metrics.totalDetections,
        detections_by_type: this.metrics.detectionsByType,
        detections_by_severity: this.metrics.detectionsBySeverity,
        false_positives: this.metrics.falsePositives,
        average_confidence: this.metrics.averageConfidence,
        last_detection_time: this.metrics.lastDetectionTime,
      });
    } catch (error) {
      logger.error('Failed to save metrics:', error);
    }
  }

  private async blockSuspiciousFeed(detection: ManipulationDetection): Promise<void> {
    logger.warn(`Auto-blocking suspicious feed: ${detection.feedKey}`);

    try {
      await this.supabase.from('blocked_feeds').insert({
        feed_key: detection.feedKey,
        protocol: detection.protocol,
        symbol: detection.symbol,
        chain: detection.chain,
        reason: `Auto-blocked due to ${detection.type} detection`,
        detection_id: detection.id,
        blocked_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to block suspicious feed:', error);
    }
  }

  private async logMonitoringEvent(
    event: string,
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<void> {
    try {
      await this.supabase.from('monitoring_logs').insert({
        event,
        protocol,
        symbol,
        chain,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to log monitoring event:', error);
    }
  }

  private async fetchHistoricalPriceData(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<PriceDataPoint[]> {
    const { data, error } = await this.supabase
      .from('price_history')
      .select('*')
      .eq('protocol', protocol)
      .eq('symbol', symbol)
      .eq('chain', chain)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      logger.error('Failed to fetch historical price data:', error);
      return [];
    }

    return data.map((row) => ({
      timestamp: new Date(row.timestamp).getTime(),
      price: row.price,
      volume: row.volume,
      source: row.source,
    }));
  }

  private async fetchRecentTransactions(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<TransactionData[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('protocol', protocol)
      .eq('symbol', symbol)
      .eq('chain', chain)
      .gte('timestamp', new Date(Date.now() - 300000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Failed to fetch recent transactions:', error);
      return [];
    }

    return data.map((row) => ({
      hash: row.hash,
      timestamp: new Date(row.timestamp).getTime(),
      from: row.from_address,
      to: row.to_address,
      value: row.value,
      gasPrice: row.gas_price,
      gasUsed: row.gas_used,
      method: row.method,
      input: row.input_data,
    }));
  }

  private async fetchCurrentPrice(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
  ): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('price_feeds')
      .select('price')
      .eq('protocol', protocol)
      .eq('symbol', symbol)
      .eq('chain', chain)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.price;
  }

  getMetrics(): DetectionMetrics {
    return { ...this.metrics };
  }

  getActiveMonitors(): string[] {
    return Array.from(this.monitoringIntervals.keys());
  }

  isMonitoring(): boolean {
    return this.isRunning;
  }

  updateConfig(newConfig: Partial<DetectionServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.detector = new ManipulationDetector(this.config.detection);
    logger.info('Detection service configuration updated');
  }

  async getDetections(
    filters?: {
      protocol?: OracleProtocol;
      symbol?: string;
      chain?: SupportedChain;
      type?: string;
      severity?: string;
      startTime?: number;
      endTime?: number;
    },
    limit: number = 100,
    offset: number = 0,
  ): Promise<ManipulationDetection[]> {
    let query = this.supabase
      .from('manipulation_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (filters?.protocol) query = query.eq('protocol', filters.protocol);
    if (filters?.symbol) query = query.eq('symbol', filters.symbol);
    if (filters?.chain) query = query.eq('chain', filters.chain);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.startTime) query = query.gte('detected_at', new Date(filters.startTime).toISOString());
    if (filters?.endTime) query = query.lte('detected_at', new Date(filters.endTime).toISOString());

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch detections:', error);
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      protocol: row.protocol,
      symbol: row.symbol,
      chain: row.chain,
      feedKey: row.feed_key,
      type: row.type,
      severity: row.severity,
      confidenceScore: row.confidence_score,
      detectedAt: new Date(row.detected_at).getTime(),
      evidence: row.evidence,
      suspiciousTransactions: row.suspicious_transactions,
      relatedBlocks: row.related_blocks,
      priceImpact: row.price_impact,
      financialImpactUsd: row.financial_impact_usd,
      affectedAddresses: row.affected_addresses,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
      notes: row.notes,
    }));
  }

  async reviewDetection(
    detectionId: string,
    status: 'confirmed' | 'false_positive' | 'under_investigation',
    reviewer: string,
    notes?: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('manipulation_detections')
      .update({
        status,
        reviewed_by: reviewer,
        reviewed_at: new Date().toISOString(),
        notes,
      })
      .eq('id', detectionId);

    if (error) {
      logger.error('Failed to update detection review:', error);
      throw error;
    }

    if (status === 'false_positive') {
      this.metrics.falsePositives++;
      await this.saveMetrics();
    }
  }
}

export const manipulationDetectionService = new ManipulationDetectionService();
