import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedditMCPServer } from './server.js';
import { RedditClient } from './client/reddit-client.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the RedditClient
function createMockClient(): RedditClient {
  return {
    getPost: vi.fn().mockResolvedValue({ kind: 'Listing', data: { children: [] } }),
    getTopPosts: vi.fn().mockResolvedValue({ kind: 'Listing', data: { children: [] } }),
    search: vi.fn().mockResolvedValue({ kind: 'Listing', data: { children: [] } }),
    getSubredditInfo: vi.fn().mockResolvedValue({ kind: 't5', data: { display_name: 'test' } }),
    getUserInfo: vi.fn().mockResolvedValue({ kind: 't2', data: { name: 'testuser' } }),
    createPost: vi.fn().mockResolvedValue({ json: { data: { id: 'abc123', url: 'https://reddit.com/r/test/abc123' } } }),
    reply: vi.fn().mockResolvedValue({ json: { data: { things: [{ data: { id: 'xyz789' } }] } } }),
    edit: vi.fn().mockResolvedValue({ json: { data: { things: [{ data: { id: 'xyz789' } }] } } }),
    delete: vi.fn().mockResolvedValue({}),
    vote: vi.fn().mockResolvedValue({}),
  } as unknown as RedditClient;
}

describe('RedditMCPServer', () => {
  let server: RedditMCPServer;
  let mockClient: RedditClient;

  beforeEach(() => {
    server = new RedditMCPServer();
    mockClient = createMockClient();
    server.setClient(mockClient);
  });

  it('should create server instance', () => {
    expect(server).toBeDefined();
  });

  it('should list all tools', async () => {
    // Access the internal server to call handlers directly
    const internalServer = (server as unknown as { server: Server }).server;

    // Use the server's request handler via the internal _requestHandlers map
    const handlers = (internalServer as unknown as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');

    expect(listToolsHandler).toBeDefined();

    const result = await listToolsHandler!({
      method: 'tools/list',
    }) as { tools: { name: string }[] };

    expect(result.tools).toHaveLength(10);

    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('reddit_get_post');
    expect(toolNames).toContain('reddit_get_top_posts');
    expect(toolNames).toContain('reddit_search');
    expect(toolNames).toContain('reddit_get_subreddit_info');
    expect(toolNames).toContain('reddit_get_user_info');
    expect(toolNames).toContain('reddit_create_post');
    expect(toolNames).toContain('reddit_reply');
    expect(toolNames).toContain('reddit_edit');
    expect(toolNames).toContain('reddit_delete');
    expect(toolNames).toContain('reddit_vote');
  });

  it('should handle reddit_get_post tool call', async () => {
    const internalServer = (server as unknown as { server: Server }).server;
    const handlers = (internalServer as unknown as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })._requestHandlers;
    const callToolHandler = handlers.get('tools/call');

    const result = await callToolHandler!({
      method: 'tools/call',
      params: {
        name: 'reddit_get_post',
        arguments: { postId: 'abc123' },
      },
    }) as { content: { type: string; text: string }[] };

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(mockClient.getPost).toHaveBeenCalledWith('abc123', undefined, undefined);
  });

  it('should handle reddit_search tool call', async () => {
    const internalServer = (server as unknown as { server: Server }).server;
    const handlers = (internalServer as unknown as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })._requestHandlers;
    const callToolHandler = handlers.get('tools/call');

    await callToolHandler!({
      method: 'tools/call',
      params: {
        name: 'reddit_search',
        arguments: { query: 'test query', subreddit: 'programming', limit: 5 },
      },
    });

    expect(mockClient.search).toHaveBeenCalledWith('test query', {
      subreddit: 'programming',
      sort: undefined,
      time: undefined,
      limit: 5,
    });
  });

  it('should handle reddit_create_post tool call', async () => {
    const internalServer = (server as unknown as { server: Server }).server;
    const handlers = (internalServer as unknown as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })._requestHandlers;
    const callToolHandler = handlers.get('tools/call');

    await callToolHandler!({
      method: 'tools/call',
      params: {
        name: 'reddit_create_post',
        arguments: {
          subreddit: 'test',
          title: 'Test Post',
          text: 'Hello world',
        },
      },
    });

    expect(mockClient.createPost).toHaveBeenCalledWith({
      subreddit: 'test',
      title: 'Test Post',
      text: 'Hello world',
    });
  });

  it('should handle reddit_vote tool call', async () => {
    const internalServer = (server as unknown as { server: Server }).server;
    const handlers = (internalServer as unknown as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })._requestHandlers;
    const callToolHandler = handlers.get('tools/call');

    await callToolHandler!({
      method: 'tools/call',
      params: {
        name: 'reddit_vote',
        arguments: { thingId: 't3_abc123', direction: '1' },
      },
    });

    expect(mockClient.vote).toHaveBeenCalledWith('t3_abc123', '1');
  });

  it('should reject invalid parameters', async () => {
    const internalServer = (server as unknown as { server: Server }).server;
    const handlers = (internalServer as unknown as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })._requestHandlers;
    const callToolHandler = handlers.get('tools/call');

    await expect(
      callToolHandler!({
        method: 'tools/call',
        params: {
          name: 'reddit_get_post',
          arguments: {},
        },
      }),
    ).rejects.toThrow('Invalid parameters');
  });

  it('should throw on unknown tool', async () => {
    const internalServer = (server as unknown as { server: Server }).server;
    const handlers = (internalServer as unknown as { _requestHandlers: Map<string, (req: unknown) => Promise<unknown>> })._requestHandlers;
    const callToolHandler = handlers.get('tools/call');

    await expect(
      callToolHandler!({
        method: 'tools/call',
        params: {
          name: 'reddit_nonexistent',
          arguments: {},
        },
      }),
    ).rejects.toThrow('Unknown tool');
  });
});
