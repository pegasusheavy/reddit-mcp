# Reddit MCP Server

An MCP server for the Reddit API with full read/write support via OAuth refresh tokens. No username or password required — uses Reddit's standard OAuth 2.0 web app flow.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

## Why This Exists

Existing Reddit MCP servers require username/password for write operations. This one uses Reddit's OAuth refresh token flow — authorize once in the browser, and the server handles token refresh automatically.

## Available Tools

### Read

| Tool | Description |
|------|-------------|
| `reddit_get_post` | Get a post with its comments |
| `reddit_get_top_posts` | Top posts from a subreddit |
| `reddit_search` | Search Reddit |
| `reddit_get_subreddit_info` | Subreddit metadata |
| `reddit_get_user_info` | User profile info |

### Write

| Tool | Description |
|------|-------------|
| `reddit_create_post` | Create a text or link post |
| `reddit_reply` | Reply to a post or comment |
| `reddit_edit` | Edit your own post or comment |
| `reddit_delete` | Delete your own post or comment |
| `reddit_vote` | Upvote, downvote, or unvote |

## Prerequisites

1. **Node.js 18+**
2. **A Reddit "web app"** — create one at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
   - Type: **web app**
   - Redirect URI: `http://localhost:48820/callback`
   - Note your **client ID** (under the app name) and **client secret**

## Setup

### Option 1: OAuth (Recommended)

Add to your MCP client config (e.g. Claude Desktop):

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["-y", "@pegasusheavy/reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "your-client-id",
        "REDDIT_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

On first run, a browser opens for Reddit authorization. After you approve, the refresh token is saved to `.reddit-token.json` and automatically refreshed on subsequent starts.

### Option 2: Manual Token

If you already have an OAuth access token:

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["-y", "@pegasusheavy/reddit-mcp-server"],
      "env": {
        "REDDIT_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDDIT_CLIENT_ID` | Yes* | Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | Yes* | Reddit app client secret |
| `REDDIT_ACCESS_TOKEN` | No | Manual token fallback (alternative to OAuth) |
| `REDDIT_USER_AGENT` | No | Custom User-Agent (defaults to `linux:@pegasusheavy/reddit-mcp:v1.0.0 by PegasusHeavy`) |

\* Required unless using `REDDIT_ACCESS_TOKEN`.

## Example Tool Calls

### Search Reddit

```json
{
  "name": "reddit_search",
  "arguments": {
    "query": "rust programming",
    "subreddit": "programming",
    "sort": "top",
    "time": "week",
    "limit": 5
  }
}
```

### Create a Post

```json
{
  "name": "reddit_create_post",
  "arguments": {
    "subreddit": "test",
    "title": "Hello from MCP",
    "text": "Posted via the Reddit MCP server."
  }
}
```

### Reply to a Comment

```json
{
  "name": "reddit_reply",
  "arguments": {
    "thingId": "t1_abc123",
    "text": "Great point! Here's my take..."
  }
}
```

## Development

```bash
git clone https://github.com/pegasusheavy/reddit-mcp.git
cd reddit-mcp
pnpm install
pnpm build
pnpm test
```

### Scripts

```bash
pnpm build          # Compile TypeScript
pnpm dev            # Run from source with tsx
pnpm test           # Run tests
pnpm lint           # ESLint
pnpm format:check   # Prettier check
```

### Project Structure

```
src/
├── index.ts              # Entry point — env check, auth, server launch
├── server.ts             # MCP server with tool registration
├── auth/
│   ├── oauth.ts          # RedditOAuth + TokenManager classes
│   └── oauth-server.ts   # Local HTTP callback server (port 48820)
├── client/
│   └── reddit-client.ts  # Axios-based Reddit API client
└── types/
    └── reddit.ts         # Zod schemas and TypeScript types
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature` off `develop`)
3. Commit with conventional commits (`feat:`, `fix:`, `chore:`, etc.)
4. Open a PR against `develop`

## License

MIT — see [LICENSE](LICENSE) for details.

Copyright (c) 2025 Pegasus Heavy Industries LLC
