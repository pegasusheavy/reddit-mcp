import axios, { AxiosInstance } from 'axios';
import { RedditTokenResponseSchema, type StoredToken } from '../types/reddit.js';
import type { OAuthConfig } from '../types/reddit.js';

export class RedditOAuth {
  private client: AxiosInstance;
  private config: OAuthConfig;
  private readonly authUrl = 'https://www.reddit.com/api/v1/authorize';
  private readonly tokenUrl = 'https://www.reddit.com/api/v1/access_token';
  private readonly scopes = 'identity read submit edit vote history';

  constructor(config: OAuthConfig) {
    this.config = config;
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
        username: config.clientId,
        password: config.clientSecret,
      },
    });
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      state,
      redirect_uri: this.config.redirectUri,
      duration: 'permanent',
      scope: this.scopes,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<StoredToken> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    });

    const response = await this.client.post(this.tokenUrl, params.toString());
    const data = RedditTokenResponseSchema.parse(response.data);

    if (!data.refresh_token) {
      throw new Error('No refresh token received. Ensure duration=permanent in auth request.');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<StoredToken> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await this.client.post(this.tokenUrl, params.toString());
    const data = RedditTokenResponseSchema.parse(response.data);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }
}

export class TokenManager {
  private oauth: RedditOAuth;
  private token: StoredToken;
  private refreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry
  private onTokenUpdate?: (token: StoredToken) => void;

  constructor(oauth: RedditOAuth, token: StoredToken, onTokenUpdate?: (token: StoredToken) => void) {
    this.oauth = oauth;
    this.token = token;
    this.onTokenUpdate = onTokenUpdate;
  }

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token.expiresAt - now < this.refreshBuffer) {
      await this.refresh();
    }
    return this.token.accessToken;
  }

  private async refresh(): Promise<void> {
    this.token = await this.oauth.refreshAccessToken(this.token.refreshToken);
    this.onTokenUpdate?.(this.token);
  }
}
