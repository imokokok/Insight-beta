export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username: string;
  iconEmoji: string;
  isActive: boolean;
  mentionUsers: string[];
  mentionRole: string;
}

export interface DiscordConfig {
  webhookUrl: string;
  username: string;
  avatarUrl: string;
  isActive: boolean;
  mentionEveryone: boolean;
}

export interface NotificationMessage {
  title: string;
  description: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: string;
  timestamp?: string;
  url?: string;
}

export interface NotificationResult {
  success: boolean;
  platform: 'slack' | 'discord';
  messageId?: string;
  error?: string;
}

export class NotificationIntegrator {
  private slackConfigs: Map<string, SlackConfig> = new Map();
  private discordConfigs: Map<string, DiscordConfig> = new Map();

  private readonly SLACK_COLORS = {
    success: 0x36a64f,
    warning: 0xffa500,
    error: 0xff0000,
    info: 0x3498db,
    purple: 0x9b59b6,
  };

  // DISCORD_COLORS reserved for future Discord webhook integration
  // private static readonly DISCORD_COLORS = {
  //   success: 5763714,
  //   warning: 16776960,
  //   error: 15548997,
  //   info: 3447003,
  //   purple: 10115547,
  // };

  configureSlack(userId: string, config: SlackConfig): void {
    this.slackConfigs.set(userId, config);
  }

  configureDiscord(userId: string, config: DiscordConfig): void {
    this.discordConfigs.set(userId, config);
  }

  removeSlackConfig(userId: string): boolean {
    return this.slackConfigs.delete(userId);
  }

  removeDiscordConfig(userId: string): boolean {
    return this.discordConfigs.delete(userId);
  }

  getSlackConfig(userId: string): SlackConfig | null {
    return this.slackConfigs.get(userId) || null;
  }

  getDiscordConfig(userId: string): DiscordConfig | null {
    return this.discordConfigs.get(userId) || null;
  }

  async sendSlackNotification(
    userId: string,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const config = this.slackConfigs.get(userId);
    if (!config || !config.isActive) {
      return {
        success: false,
        platform: 'slack',
        error: 'Slack not configured or inactive',
      };
    }

    const slackPayload = this.buildSlackPayload(config, message);

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });

      if (response.ok) {
        return { success: true, platform: 'slack' };
      } else {
        const error = await response.text();
        return {
          success: false,
          platform: 'slack',
          error: `Slack API error: ${error}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        platform: 'slack',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendDiscordNotification(
    userId: string,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const config = this.discordConfigs.get(userId);
    if (!config || !config.isActive) {
      return {
        success: false,
        platform: 'discord',
        error: 'Discord not configured or inactive',
      };
    }

    const discordPayload = this.buildDiscordPayload(config, message);

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      if (response.ok) {
        return { success: true, platform: 'discord' };
      } else {
        const error = await response.text();
        return {
          success: false,
          platform: 'discord',
          error: `Discord API error: ${error}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        platform: 'discord',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendDualNotification(
    userId: string,
    message: NotificationMessage,
  ): Promise<NotificationResult[]> {
    const [slackResult, discordResult] = await Promise.allSettled([
      this.sendSlackNotification(userId, message),
      this.sendDiscordNotification(userId, message),
    ]);

    const results: NotificationResult[] = [];

    if (slackResult.status === 'fulfilled') {
      results.push(slackResult.value);
    }

    if (discordResult.status === 'fulfilled') {
      results.push(discordResult.value);
    }

    return results;
  }

  private buildSlackPayload(config: SlackConfig, message: NotificationMessage): object {
    const blocks: object[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: message.title,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.description,
        },
      },
    ];

    if (message.fields && message.fields.length > 0) {
      const fields = message.fields.map((field) => ({
        type: 'mrkdwn',
        text: `*${field.name}*\n${field.value}`,
      }));

      blocks.push({
        type: 'section',
        fields,
      });
    }

    if (message.footer) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: message.footer,
          },
        ],
      });
    }

    if (config.mentionUsers.length > 0 || config.mentionRole) {
      const mentions: string[] = [];

      if (config.mentionRole) {
        mentions.push(`<@&${config.mentionRole}>`);
      }

      config.mentionUsers.forEach((userId) => {
        mentions.push(`<@${userId}>`);
      });

      blocks.unshift({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: mentions.join(' '),
        },
      });
    }

    return {
      channel: config.channel,
      username: config.username,
      icon_emoji: config.iconEmoji,
      blocks,
      attachments: [
        {
          color: `#${message.color.toString(16).padStart(6, '0')}`,
          footer: message.footer,
          ts: message.timestamp
            ? Math.floor(new Date(message.timestamp).getTime() / 1000)
            : undefined,
        },
      ],
    };
  }

  private buildDiscordPayload(config: DiscordConfig, message: NotificationMessage): object {
    const embeds = [
      {
        title: message.title,
        description: message.description,
        color: message.color,
        fields: message.fields,
        footer: message.footer ? { text: message.footer } : undefined,
        timestamp: message.timestamp || new Date().toISOString(),
        url: message.url,
      },
    ];

    const content = config.mentionEveryone ? '@everyone' : '';

    return {
      username: config.username,
      avatar_url: config.avatarUrl,
      content,
      embeds,
    };
  }

  createAssertionNotification(
    assertionId: string,
    asserter: string,
    market: string,
    bondUsd: number,
  ): NotificationMessage {
    return {
      title: '🆕 New Assertion Created',
      description: `A new assertion has been submitted for *${market}*`,
      color: this.SLACK_COLORS.info,
      fields: [
        {
          name: 'Assertion ID',
          value: `\`${assertionId.slice(0, 16)}...\``,
          inline: true,
        },
        {
          name: 'Asserter',
          value: `\`${asserter.slice(0, 8)}...${asserter.slice(-6)}\``,
          inline: true,
        },
        { name: 'Bond', value: `$${bondUsd.toLocaleString()}`, inline: true },
      ],
      footer: 'OracleMonitor',
      timestamp: new Date().toISOString(),
      url: `https://oracle-monitor.foresight.build/oracle/${assertionId}`,
    };
  }

  createDisputeNotification(
    assertionId: string,
    disputer: string,
    reason: string,
    bondUsd: number,
  ): NotificationMessage {
    return {
      title: '⚠️ Assertion Disputed',
      description: `An assertion has been disputed: *${reason}*`,
      color: this.SLACK_COLORS.warning,
      fields: [
        {
          name: 'Assertion ID',
          value: `\`${assertionId.slice(0, 16)}...\``,
          inline: true,
        },
        {
          name: 'Disputer',
          value: `\`${disputer.slice(0, 8)}...${disputer.slice(-6)}\``,
          inline: true,
        },
        {
          name: 'Bond at Risk',
          value: `$${bondUsd.toLocaleString()}`,
          inline: true,
        },
      ],
      footer: 'OracleMonitor',
      timestamp: new Date().toISOString(),
      url: `https://oracle-monitor.foresight.build/disputes/${assertionId}`,
    };
  }

  createAlertNotification(
    alertType: string,
    severity: 'critical' | 'warning' | 'info',
    message: string,
    recommendedAction: string,
  ): NotificationMessage {
    const color =
      severity === 'critical'
        ? this.SLACK_COLORS.error
        : severity === 'warning'
          ? this.SLACK_COLORS.warning
          : this.SLACK_COLORS.info;

    return {
      title:
        severity === 'critical'
          ? '🚨 Critical Alert'
          : severity === 'warning'
            ? '⚠️ Warning Alert'
            : 'ℹ️ Info Alert',
      description: `*${alertType}*: ${message}`,
      color,
      fields: [
        { name: 'Severity', value: severity.toUpperCase(), inline: true },
        { name: 'Recommended Action', value: recommendedAction, inline: false },
      ],
      footer: 'OracleMonitor',
      timestamp: new Date().toISOString(),
      url: 'https://oracle-monitor.foresight.build/alerts',
    };
  }

  createHealthNotification(score: number, issues: string[]): NotificationMessage {
    return {
      title:
        score >= 90
          ? '✅ Oracle Health Check Passed'
          : score >= 70
            ? '⚠️ Oracle Health Degraded'
            : '🚨 Oracle Health Critical',
      description:
        score >= 90
          ? 'All systems operating normally'
          : `Health score: **${score}/100**\n\nIssues detected:\n${issues.map((i) => `• ${i}`).join('\n')}`,
      color:
        score >= 90
          ? this.SLACK_COLORS.success
          : score >= 70
            ? this.SLACK_COLORS.warning
            : this.SLACK_COLORS.error,
      fields: [
        { name: 'Health Score', value: `${score}/100`, inline: true },
        { name: 'Issues Found', value: issues.length.toString(), inline: true },
      ],
      footer: 'OracleMonitor',
      timestamp: new Date().toISOString(),
      url: 'https://oracle-monitor.foresight.build/oracle',
    };
  }

  async testSlackConnection(userId: string): Promise<boolean> {
    const config = this.slackConfigs.get(userId);
    if (!config) return false;

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '🔔 OracleMonitor - Test notification' }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async testDiscordConnection(userId: string): Promise<boolean> {
    const config = this.discordConfigs.get(userId);
    if (!config) return false;

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.username,
          avatar_url: config.avatarUrl,
          content: '🔔 OracleMonitor - Test notification',
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getIntegrationStats(userId: string): {
    slackConfigured: boolean;
    discordConfigured: boolean;
    slackActive: boolean;
    discordActive: boolean;
  } {
    const slackConfig = this.slackConfigs.get(userId);
    const discordConfig = this.discordConfigs.get(userId);

    return {
      slackConfigured: !!slackConfig,
      discordConfigured: !!discordConfig,
      slackActive: slackConfig?.isActive || false,
      discordActive: discordConfig?.isActive || false,
    };
  }
}

export const notificationIntegrator = new NotificationIntegrator();

export function createSlackConfig(
  webhookUrl: string,
  channel: string = '#oracle-alerts',
): SlackConfig {
  return {
    webhookUrl,
    channel,
    username: 'OracleMonitor',
    iconEmoji: ':owl:',
    isActive: true,
    mentionUsers: [],
    mentionRole: '',
  };
}

export function createDiscordConfig(webhookUrl: string): DiscordConfig {
  return {
    webhookUrl,
    username: 'OracleMonitor',
    avatarUrl: 'https://oracle-monitor.foresight.build/logo-owl.png',
    isActive: true,
    mentionEveryone: false,
  };
}
