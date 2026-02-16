#!/usr/bin/env node

import { RedditMCPServer } from './server.js';
import { RedditClient } from './client/reddit-client.js';
import { OAuthServer } from './auth/oauth-server.js';

const DEFAULT_USER_AGENT = 'linux:@pegasusheavy/reddit-mcp:v1.0.0 by PegasusHeavy';

async function main(): Promise<void> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const manualToken = process.env.REDDIT_ACCESS_TOKEN;
  const userAgent = process.env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT;

  let client: RedditClient;

  if (clientId && clientSecret) {
    console.error('Reddit MCP Server - OAuth Authentication');

    const oauthServer = new OAuthServer({ clientId, clientSecret });
    const tokenManager = await oauthServer.getTokenManager();

    client = new RedditClient({
      accessToken: '',
      userAgent,
      tokenManager,
    });

    console.error('Authentication successful.');
  } else if (manualToken) {
    console.error('Reddit MCP Server - Manual Token');

    client = new RedditClient({
      accessToken: manualToken,
      userAgent,
    });
  } else {
    console.error('Error: Missing authentication credentials');
    console.error('');
    console.error('Option 1 (Recommended): OAuth Authentication');
    console.error('  REDDIT_CLIENT_ID="your-client-id"');
    console.error('  REDDIT_CLIENT_SECRET="your-client-secret"');
    console.error('');
    console.error('  Create an app at: https://www.reddit.com/prefs/apps');
    console.error('');
    console.error('Option 2: Manual Token');
    console.error('  REDDIT_ACCESS_TOKEN="your-token"');
    console.error('');
    process.exit(1);
  }

  const server = new RedditMCPServer();
  server.setClient(client);

  console.error('Reddit MCP Server starting...');
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
