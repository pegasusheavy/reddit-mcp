import * as http from 'http';
import { URL } from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RedditOAuth, TokenManager } from './oauth.js';
import type { StoredToken } from '../types/reddit.js';

export interface OAuthServerConfig {
  clientId: string;
  clientSecret: string;
  port?: number;
  tokenStorePath?: string;
}

export class OAuthServer {
  private oauth: RedditOAuth;
  private port: number;
  private tokenStorePath: string;

  constructor(config: OAuthServerConfig) {
    this.port = config.port || 48820;
    this.tokenStorePath = config.tokenStorePath || path.join(process.cwd(), '.reddit-token.json');

    this.oauth = new RedditOAuth({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: `http://localhost:${this.port}/callback`,
    });
  }

  async getTokenManager(): Promise<TokenManager> {
    const token = await this.authenticate();
    return new TokenManager(this.oauth, token, (updated) => {
      this.saveToken(updated).catch((err) => {
        console.error('Failed to persist refreshed token:', err);
      });
    });
  }

  private async authenticate(): Promise<StoredToken> {
    const existing = await this.loadToken();
    if (existing) {
      if (existing.expiresAt > Date.now()) {
        console.error('Found existing valid token.');
        return existing;
      }
      // Token expired but we have a refresh token
      console.error('Token expired, refreshing...');
      try {
        const refreshed = await this.oauth.refreshAccessToken(existing.refreshToken);
        await this.saveToken(refreshed);
        console.error('Token refreshed successfully.');
        return refreshed;
      } catch {
        console.error('Refresh failed, starting new OAuth flow...');
      }
    }

    return this.startOAuthFlow();
  }

  private startOAuthFlow(): Promise<StoredToken> {
    return new Promise((resolve, reject) => {
      const state = Math.random().toString(36).substring(2, 15);

      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '', `http://localhost:${this.port}`);

        if (url.pathname !== '/callback') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        const error = url.searchParams.get('error');
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(this.errorPage(error));
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (!code || returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(this.errorPage('Invalid callback parameters'));
          server.close();
          reject(new Error('Invalid callback parameters'));
          return;
        }

        try {
          console.error('Exchanging authorization code for tokens...');
          const token = await this.oauth.exchangeCodeForToken(code);
          await this.saveToken(token);

          console.error('Authorization successful!');
          console.error(`Token saved to: ${this.tokenStorePath}`);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.successPage());
          server.close();
          resolve(token);
        } catch (err) {
          console.error('Token exchange failed:', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(this.errorPage((err as Error).message));
          server.close();
          reject(err);
        }
      });

      server.listen(this.port, async () => {
        const authUrl = this.oauth.getAuthorizationUrl(state);

        console.error('');
        console.error('Reddit OAuth Authorization');
        console.error('');
        console.error('Open this URL in your browser:');
        console.error(`  ${authUrl}`);
        console.error('');
        console.error('Waiting for authorization...');

        try {
          await this.openBrowser(authUrl);
        } catch {
          // User will copy URL manually
        }
      });

      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timeout after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  private async openBrowser(url: string): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const platform = process.platform;
    if (platform === 'darwin') {
      await execAsync(`open "${url}"`);
    } else if (platform === 'win32') {
      await execAsync(`start "" "${url}"`);
    } else {
      await execAsync(`xdg-open "${url}"`);
    }
  }

  private async saveToken(token: StoredToken): Promise<void> {
    await fs.writeFile(this.tokenStorePath, JSON.stringify(token, null, 2), 'utf-8');
  }

  private async loadToken(): Promise<StoredToken | null> {
    try {
      const data = await fs.readFile(this.tokenStorePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private successPage(): string {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reddit Auth Success</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#1a1a2e;color:#e0e0e0}.c{background:#16213e;padding:3rem;border-radius:16px;text-align:center;max-width:450px;box-shadow:0 8px 32px rgba(0,0,0,.4)}h1{color:#4ade80;margin:0 0 1rem}p{color:#94a3b8;line-height:1.6}</style>
</head><body><div class="c"><h1>Authorization Successful</h1><p>Your Reddit account has been connected. You can close this window.</p></div>
<script>setTimeout(()=>window.close(),5000)</script></body></html>`;
  }

  private errorPage(error: string): string {
    const safe = error.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] || c);
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reddit Auth Failed</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#1a1a2e;color:#e0e0e0}.c{background:#16213e;padding:3rem;border-radius:16px;text-align:center;max-width:450px;box-shadow:0 8px 32px rgba(0,0,0,.4)}h1{color:#f87171;margin:0 0 1rem}p{color:#94a3b8;line-height:1.6}.e{background:#991b1b33;color:#fca5a5;padding:1rem;border-radius:8px;margin:1rem 0;font-family:monospace;font-size:.9rem}</style>
</head><body><div class="c"><h1>Authorization Failed</h1><p>There was an error connecting your Reddit account.</p><div class="e">${safe}</div><p>Close this window and try again.</p></div></body></html>`;
  }
}
