/**
 * SSO (Single Sign-On) Integration
 *
 * SSO 单点登录集成
 * 支持 OAuth2、SAML、OIDC 等多种协议
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export type SSOProvider = 'oauth2' | 'saml' | 'oidc' | 'ldap';

export interface SSOConfig {
  id: string;
  provider: SSOProvider;
  name: string;
  enabled: boolean;

  // OAuth2/OIDC 配置
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string[];

  // SAML 配置
  samlMetadataUrl?: string;
  samlEntityId?: string;
  samlCertificate?: string;

  // LDAP 配置
  ldapUrl?: string;
  ldapBindDn?: string;
  ldapBindPassword?: string;
  ldapBaseDn?: string;
  ldapUserFilter?: string;

  // 通用配置
  allowedDomains?: string[];
  autoProvision: boolean;
  defaultTier: 'free' | 'basic' | 'pro' | 'enterprise';

  createdAt: Date;
  updatedAt: Date;
}

export interface SSOUser {
  email: string;
  name: string;
  organization?: string;
  avatarUrl?: string;
  externalId: string;
  provider: SSOProvider;
  rawAttributes?: Record<string, unknown>;
}

export interface SSOSession {
  id: string;
  developerId: string;
  provider: SSOProvider;
  externalId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt: Date;
}

// ============================================================================
// OAuth2/OIDC Provider
// ============================================================================

export class OAuth2Provider {
  private config: SSOConfig;

  constructor(config: SSOConfig) {
    this.config = config;
  }

  /**
   * 生成授权 URL
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: this.config.scopes?.join(' ') || 'openid email profile',
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * 交换授权码获取令牌
   */
  async exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    idToken?: string;
  } | null> {
    try {
      const response = await fetch(this.config.tokenUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId!,
          client_secret: this.config.clientSecret!,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        idToken: data.id_token,
      };
    } catch (error) {
      logger.error('OAuth2 code exchange failed', { error, provider: this.config.name });
      return null;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<SSOUser | null> {
    try {
      const response = await fetch(this.config.userInfoUrl!, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`User info fetch failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        email: data.email,
        name: data.name || data.display_name || data.email,
        organization: data.organization || data.company,
        avatarUrl: data.picture || data.avatar_url,
        externalId: data.sub || data.id || data.user_id,
        provider: 'oauth2',
        rawAttributes: data,
      };
    } catch (error) {
      logger.error('Failed to get OAuth2 user info', { error, provider: this.config.name });
      return null;
    }
  }
}

// ============================================================================
// SAML Provider (简化实现)
// ============================================================================

export class SAMLProvider {
  private config: SSOConfig;

  constructor(config: SSOConfig) {
    this.config = config;
  }

  /**
   * 生成 SAML 请求
   */
  generateAuthRequest(): string {
    // 简化实现，实际需要使用 SAML 库如 samlify
    const requestId = crypto.randomUUID();
    const issueInstant = new Date().toISOString();

    const samlRequest = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="_${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${this.config.authorizationUrl}">
        <saml:Issuer>${this.config.samlEntityId}</saml:Issuer>
        <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"/>
      </samlp:AuthnRequest>
    `;

    // Base64 编码并 URL 编码
    return Buffer.from(samlRequest).toString('base64');
  }

  /**
   * 处理 SAML 响应
   */
  async processResponse(samlResponse: string): Promise<SSOUser | null> {
    try {
      // 解码 SAML 响应
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      // 简化解析，实际需要使用 SAML 库验证签名和解密
      logger.warn('SAML response processing not fully implemented', {
        provider: this.config.name,
      });

      // 返回模拟用户数据
      return {
        email: 'user@example.com',
        name: 'SAML User',
        externalId: 'saml-user-id',
        provider: 'saml',
      };
    } catch (error) {
      logger.error('Failed to process SAML response', { error, provider: this.config.name });
      return null;
    }
  }
}

// ============================================================================
// SSO Manager
// ============================================================================

export class SSOManager {
  private providers: Map<string, SSOConfig> = new Map();

  /**
   * 加载所有 SSO 配置
   */
  async loadConfigs(): Promise<void> {
    try {
      const result = await query(`
        SELECT * FROM sso_configs WHERE enabled = true
      `);

      this.providers.clear();

      for (const row of result.rows) {
        const config: SSOConfig = {
          id: row.id,
          provider: row.provider,
          name: row.name,
          enabled: row.enabled,
          clientId: row.client_id,
          clientSecret: row.client_secret,
          authorizationUrl: row.authorization_url,
          tokenUrl: row.token_url,
          userInfoUrl: row.user_info_url,
          scopes: row.scopes,
          samlMetadataUrl: row.saml_metadata_url,
          samlEntityId: row.saml_entity_id,
          ldapUrl: row.ldap_url,
          ldapBindDn: row.ldap_bind_dn,
          ldapBaseDn: row.ldap_base_dn,
          allowedDomains: row.allowed_domains,
          autoProvision: row.auto_provision,
          defaultTier: row.default_tier,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };

        this.providers.set(config.id, config);
      }

      logger.info(`Loaded ${this.providers.size} SSO configurations`);
    } catch (error) {
      logger.error('Failed to load SSO configs', { error });
    }
  }

  /**
   * 获取 SSO 登录 URL
   */
  getLoginUrl(providerId: string, redirectUri: string): string | null {
    const config = this.providers.get(providerId);
    if (!config) {
      return null;
    }

    const state = this.generateState(providerId);

    switch (config.provider) {
      case 'oauth2':
      case 'oidc': {
        const oauth2 = new OAuth2Provider(config);
        return oauth2.getAuthorizationUrl(redirectUri, state);
      }
      case 'saml': {
        const saml = new SAMLProvider(config);
        const samlRequest = saml.generateAuthRequest();
        return `${config.authorizationUrl}?SAMLRequest=${encodeURIComponent(samlRequest)}`;
      }
      default:
        return null;
    }
  }

  /**
   * 处理 SSO 回调
   */
  async handleCallback(
    providerId: string,
    code: string,
    redirectUri: string,
  ): Promise<{
    success: boolean;
    developerId?: string;
    error?: string;
  }> {
    const config = this.providers.get(providerId);
    if (!config) {
      return { success: false, error: 'SSO provider not found' };
    }

    try {
      let ssoUser: SSOUser | null = null;

      switch (config.provider) {
        case 'oauth2':
        case 'oidc': {
          const oauth2 = new OAuth2Provider(config);
          const tokens = await oauth2.exchangeCode(code, redirectUri);

          if (!tokens) {
            return { success: false, error: 'Failed to exchange code for tokens' };
          }

          ssoUser = await oauth2.getUserInfo(tokens.accessToken);
          break;
        }
        case 'saml':
          // SAML 处理逻辑
          return { success: false, error: 'SAML not fully implemented' };
        default:
          return { success: false, error: 'Unsupported provider type' };
      }

      if (!ssoUser) {
        return { success: false, error: 'Failed to get user info' };
      }

      // 验证域名
      if (config.allowedDomains && config.allowedDomains.length > 0) {
        const domain = ssoUser.email.split('@')[1];
        if (!domain || !config.allowedDomains.includes(domain)) {
          return { success: false, error: 'Email domain not allowed' };
        }
      }

      // 查找或创建开发者
      const developerId = await this.findOrCreateDeveloper(ssoUser, config);

      // 创建 SSO 会话
      await this.createSSOSession(developerId, ssoUser, providerId);

      return { success: true, developerId };
    } catch (error) {
      logger.error('SSO callback handling failed', { error, providerId });
      return { success: false, error: 'SSO authentication failed' };
    }
  }

  /**
   * 查找或创建开发者
   */
  private async findOrCreateDeveloper(
    ssoUser: SSOUser,
    config: SSOConfig,
  ): Promise<string> {
    // 先查找现有开发者
    const existing = await query(
      `SELECT developer_id FROM sso_sessions WHERE external_id = $1 AND provider = $2`,
      [ssoUser.externalId, ssoUser.provider],
    );

    if (existing.rows.length > 0) {
      return existing.rows[0]!.developer_id;
    }

    // 检查邮箱是否已注册
    const byEmail = await query(
      `SELECT id FROM developers WHERE email = $1`,
      [ssoUser.email],
    );

    if (byEmail.rows.length > 0) {
      return byEmail.rows[0]!.id;
    }

    // 自动创建新开发者
    if (config.autoProvision) {
      const developerId = crypto.randomUUID();
      const now = new Date();

      await query(
        `
        INSERT INTO developers (
          id, email, name, organization, status, tier, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          developerId,
          ssoUser.email,
          ssoUser.name,
          ssoUser.organization || null,
          'active',
          config.defaultTier,
          now,
          now,
        ],
      );

      logger.info(`Auto-provisioned developer via SSO`, {
        email: ssoUser.email,
        provider: config.name,
      });

      return developerId;
    }

    throw new Error('Developer not found and auto-provisioning is disabled');
  }

  /**
   * 创建 SSO 会话
   */
  private async createSSOSession(
    developerId: string,
    ssoUser: SSOUser,
    providerId: string,
  ): Promise<void> {
    const sessionId = crypto.randomUUID();
    const now = new Date();

    await query(
      `
      INSERT INTO sso_sessions (
        id, developer_id, provider, external_id, created_at, last_used_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (developer_id, provider)
      DO UPDATE SET
        external_id = EXCLUDED.external_id,
        last_used_at = EXCLUDED.last_used_at
    `,
      [sessionId, developerId, providerId, ssoUser.externalId, now, now],
    );
  }

  /**
   * 生成 state 参数
   */
  private generateState(providerId: string): string {
    const nonce = crypto.randomUUID();
    return Buffer.from(JSON.stringify({ providerId, nonce })).toString('base64');
  }

  /**
   * 添加 SSO 配置
   */
  async addConfig(config: Omit<SSOConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSOConfig> {
    const id = crypto.randomUUID();
    const now = new Date();

    const newConfig: SSOConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await query(
      `
      INSERT INTO sso_configs (
        id, provider, name, enabled, client_id, client_secret,
        authorization_url, token_url, user_info_url, scopes,
        saml_metadata_url, saml_entity_id,
        ldap_url, ldap_bind_dn, ldap_base_dn,
        allowed_domains, auto_provision, default_tier,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `,
      [
        newConfig.id,
        newConfig.provider,
        newConfig.name,
        newConfig.enabled,
        newConfig.clientId || null,
        newConfig.clientSecret || null,
        newConfig.authorizationUrl || null,
        newConfig.tokenUrl || null,
        newConfig.userInfoUrl || null,
        newConfig.scopes || null,
        newConfig.samlMetadataUrl || null,
        newConfig.samlEntityId || null,
        newConfig.ldapUrl || null,
        newConfig.ldapBindDn || null,
        newConfig.ldapBaseDn || null,
        newConfig.allowedDomains || null,
        newConfig.autoProvision,
        newConfig.defaultTier,
        newConfig.createdAt,
        newConfig.updatedAt,
      ],
    );

    this.providers.set(newConfig.id, newConfig);

    logger.info(`Added SSO config: ${newConfig.name}`);

    return newConfig;
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): SSOConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取单个配置
   */
  getConfig(id: string): SSOConfig | undefined {
    return this.providers.get(id);
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const ssoManager = new SSOManager();
