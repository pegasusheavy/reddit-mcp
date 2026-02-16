# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build          # Compile TypeScript to dist/
pnpm test           # Run all tests (vitest)
pnpm test:watch     # Run tests in watch mode
pnpm dev            # Run from source with tsx (requires REDDIT_CLIENT_ID+REDDIT_CLIENT_SECRET or REDDIT_ACCESS_TOKEN)
```

## Architecture

MCP server for Reddit's API, published as `@pegasusheavy/reddit-mcp-server`. Follows the same architecture as `@pegasusheavy/threads-mcp`.

**Data flow:** `index.ts` (env/auth bootstrap) → `RedditMCPServer` (tool dispatch) → `RedditClient` (API calls)

### Auth layer (`src/auth/`)
Two-class design: `RedditOAuth` handles raw token operations (auth URL generation, code exchange, refresh) using HTTP Basic Auth against Reddit's `/api/v1/access_token`. `TokenManager` wraps a `StoredToken` and auto-refreshes 5 minutes before expiry, calling an `onTokenUpdate` callback to persist to disk.

`OAuthServer` orchestrates first-time setup: spins up HTTP server on port 48820 for the OAuth callback, opens browser, exchanges code, saves `.reddit-token.json`. On subsequent starts, it loads the persisted token and refreshes if expired.

### Client (`src/client/reddit-client.ts`)
Axios instance targeting `https://oauth.reddit.com`. Request interceptor injects Bearer token (from `TokenManager.getToken()` or static `accessToken`). Response interceptor wraps errors in `RedditAPIError`. All Reddit write endpoints use `application/x-www-form-urlencoded`.

### Server (`src/server.ts`)
`RedditMCPServer` registers 10 MCP tools (5 read, 5 write). Each tool handler validates input with a Zod schema from `types/reddit.ts`, calls the corresponding `RedditClient` method, and returns JSON. The client is injected via `setClient()` after auth completes.

### Types (`src/types/reddit.ts`)
All Zod schemas live here: OAuth token responses, Reddit API response types (Thing/Listing), and tool parameter schemas. Config interfaces (`RedditConfig`, `OAuthConfig`) are also defined here.

## Conventions

- ES modules (`"type": "module"`) — all imports use `.js` extension
- All user-facing output goes to `stderr` (stdout reserved for MCP stdio transport)
- Reddit "fullnames" use type prefixes: `t1_` (comment), `t3_` (post), `t5_` (subreddit)
- Tool names are prefixed `reddit_` with snake_case

## Deployment

Runs as a systemd user service (`mcp-reddit.service`) behind `mcp-proxy` on port 3012. Credentials in `~/.config/mcp-env/reddit.env`. MCP config entry in `~/.cursor/mcp.json` points to `http://localhost:3012/mcp`.
