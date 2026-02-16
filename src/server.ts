import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { RedditClient } from './client/reddit-client.js';
import {
  GetPostSchema,
  GetTopPostsSchema,
  SearchSchema,
  GetSubredditInfoSchema,
  GetUserInfoSchema,
  CreatePostSchema,
  ReplySchema,
  EditSchema,
  DeleteSchema,
  VoteSchema,
} from './types/reddit.js';

export class RedditMCPServer {
  private server: Server;
  private client: RedditClient | null = null;

  constructor() {
    this.server = new Server(
      { name: 'reddit-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupHandlers();
  }

  setClient(client: RedditClient): void {
    this.client = client;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        // ── Read Operations ──
        {
          name: 'reddit_get_post',
          description: 'Get a Reddit post with its comments',
          inputSchema: {
            type: 'object',
            properties: {
              postId: { type: 'string', description: 'The post ID (with or without t3_ prefix)' },
              commentLimit: {
                type: 'number',
                description: 'Max comments to return (default: 25)',
                minimum: 0,
                maximum: 500,
              },
              commentSort: {
                type: 'string',
                enum: ['confidence', 'top', 'new', 'controversial', 'old', 'qa'],
                description: 'Comment sort order',
              },
            },
            required: ['postId'],
          },
        },
        {
          name: 'reddit_get_top_posts',
          description: 'Get top posts from a subreddit',
          inputSchema: {
            type: 'object',
            properties: {
              subreddit: { type: 'string', description: 'Subreddit name (without r/ prefix)' },
              time: {
                type: 'string',
                enum: ['hour', 'day', 'week', 'month', 'year', 'all'],
                description: 'Time period (default: day)',
              },
              limit: {
                type: 'number',
                description: 'Number of posts (default: 10)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['subreddit'],
          },
        },
        {
          name: 'reddit_search',
          description: 'Search Reddit for posts',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              subreddit: { type: 'string', description: 'Limit search to a subreddit' },
              sort: {
                type: 'string',
                enum: ['relevance', 'hot', 'top', 'new', 'comments'],
                description: 'Sort order',
              },
              time: {
                type: 'string',
                enum: ['hour', 'day', 'week', 'month', 'year', 'all'],
                description: 'Time period',
              },
              limit: {
                type: 'number',
                description: 'Number of results (default: 10)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'reddit_get_subreddit_info',
          description: 'Get information about a subreddit',
          inputSchema: {
            type: 'object',
            properties: {
              subreddit: { type: 'string', description: 'Subreddit name (without r/ prefix)' },
            },
            required: ['subreddit'],
          },
        },
        {
          name: 'reddit_get_user_info',
          description: 'Get information about a Reddit user',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', description: 'Reddit username (without u/ prefix)' },
            },
            required: ['username'],
          },
        },

        // ── Write Operations ──
        {
          name: 'reddit_create_post',
          description: 'Create a new text or link post on a subreddit',
          inputSchema: {
            type: 'object',
            properties: {
              subreddit: {
                type: 'string',
                description: 'Subreddit to post in (without r/ prefix)',
              },
              title: { type: 'string', description: 'Post title' },
              text: { type: 'string', description: 'Post body text (for self posts)' },
              url: { type: 'string', description: 'URL (for link posts)' },
              flair_id: { type: 'string', description: 'Flair template ID' },
              flair_text: { type: 'string', description: 'Flair text' },
              nsfw: { type: 'boolean', description: 'Mark as NSFW' },
              spoiler: { type: 'boolean', description: 'Mark as spoiler' },
            },
            required: ['subreddit', 'title'],
          },
        },
        {
          name: 'reddit_reply',
          description: 'Reply to a post or comment',
          inputSchema: {
            type: 'object',
            properties: {
              thingId: {
                type: 'string',
                description: 'Full name of the post or comment (e.g. t3_abc123 or t1_xyz789)',
              },
              text: { type: 'string', description: 'Reply text (markdown supported)' },
            },
            required: ['thingId', 'text'],
          },
        },
        {
          name: 'reddit_edit',
          description: 'Edit your own post or comment',
          inputSchema: {
            type: 'object',
            properties: {
              thingId: {
                type: 'string',
                description: 'Full name of the post or comment (e.g. t3_abc123 or t1_xyz789)',
              },
              text: { type: 'string', description: 'New text content (markdown supported)' },
            },
            required: ['thingId', 'text'],
          },
        },
        {
          name: 'reddit_delete',
          description: 'Delete your own post or comment',
          inputSchema: {
            type: 'object',
            properties: {
              thingId: {
                type: 'string',
                description: 'Full name of the post or comment (e.g. t3_abc123 or t1_xyz789)',
              },
            },
            required: ['thingId'],
          },
        },
        {
          name: 'reddit_vote',
          description: 'Upvote, downvote, or unvote a post or comment',
          inputSchema: {
            type: 'object',
            properties: {
              thingId: {
                type: 'string',
                description: 'Full name of the post or comment (e.g. t3_abc123 or t1_xyz789)',
              },
              direction: {
                type: 'string',
                enum: ['1', '0', '-1'],
                description: 'Vote direction: 1=upvote, 0=unvote, -1=downvote',
              },
            },
            required: ['thingId', 'direction'],
          },
        },
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.client) {
        throw new Error('Reddit client not initialized.');
      }

      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'reddit_get_post': {
            const params = GetPostSchema.parse(args);
            const result = await this.client.getPost(
              params.postId,
              params.commentLimit,
              params.commentSort
            );
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_get_top_posts': {
            const params = GetTopPostsSchema.parse(args);
            const result = await this.client.getTopPosts(
              params.subreddit,
              params.time,
              params.limit
            );
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_search': {
            const params = SearchSchema.parse(args);
            const result = await this.client.search(params.query, {
              subreddit: params.subreddit,
              sort: params.sort,
              time: params.time,
              limit: params.limit,
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_get_subreddit_info': {
            const params = GetSubredditInfoSchema.parse(args);
            const result = await this.client.getSubredditInfo(params.subreddit);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_get_user_info': {
            const params = GetUserInfoSchema.parse(args);
            const result = await this.client.getUserInfo(params.username);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_create_post': {
            const params = CreatePostSchema.parse(args);
            const result = await this.client.createPost(params);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_reply': {
            const params = ReplySchema.parse(args);
            const result = await this.client.reply(params.thingId, params.text);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_edit': {
            const params = EditSchema.parse(args);
            const result = await this.client.edit(params.thingId, params.text);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_delete': {
            const params = DeleteSchema.parse(args);
            const result = await this.client.delete(params.thingId);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          case 'reddit_vote': {
            const params = VoteSchema.parse(args);
            const result = await this.client.vote(params.thingId, params.direction);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid parameters: ${JSON.stringify(error.errors)}`);
        }
        throw error;
      }
    });
  }
}
