import { z } from 'zod';

// ── OAuth Token Schemas ──

export const RedditTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
});

export type RedditTokenResponse = z.infer<typeof RedditTokenResponseSchema>;

export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

// ── Reddit API Response Schemas ──

export const RedditThingSchema = z.object({
  kind: z.string(),
  data: z.record(z.unknown()),
});

export const RedditListingSchema = z.object({
  kind: z.literal('Listing'),
  data: z.object({
    after: z.string().nullable(),
    before: z.string().nullable(),
    children: z.array(RedditThingSchema),
  }),
});

export type RedditListing = z.infer<typeof RedditListingSchema>;

// ── Tool Parameter Schemas ──

export const GetPostSchema = z.object({
  postId: z.string().min(1).describe('The post ID (with or without t3_ prefix)'),
  commentLimit: z
    .number()
    .min(0)
    .max(500)
    .optional()
    .describe('Max comments to return (default: 25)'),
  commentSort: z
    .enum(['confidence', 'top', 'new', 'controversial', 'old', 'qa'])
    .optional()
    .describe('Comment sort order'),
});

export const GetTopPostsSchema = z.object({
  subreddit: z.string().min(1).describe('Subreddit name (without r/ prefix)'),
  time: z
    .enum(['hour', 'day', 'week', 'month', 'year', 'all'])
    .optional()
    .describe('Time period (default: day)'),
  limit: z.number().min(1).max(100).optional().describe('Number of posts (default: 10)'),
});

export const SearchSchema = z.object({
  query: z.string().min(1).describe('Search query'),
  subreddit: z.string().optional().describe('Limit search to a subreddit'),
  sort: z.enum(['relevance', 'hot', 'top', 'new', 'comments']).optional().describe('Sort order'),
  time: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional().describe('Time period'),
  limit: z.number().min(1).max(100).optional().describe('Number of results (default: 10)'),
});

export const GetSubredditInfoSchema = z.object({
  subreddit: z.string().min(1).describe('Subreddit name (without r/ prefix)'),
});

export const GetUserInfoSchema = z.object({
  username: z.string().min(1).describe('Reddit username (without u/ prefix)'),
});

export const CreatePostSchema = z.object({
  subreddit: z.string().min(1).describe('Subreddit to post in (without r/ prefix)'),
  title: z.string().min(1).describe('Post title'),
  text: z.string().optional().describe('Post body text (for self posts)'),
  url: z.string().url().optional().describe('URL (for link posts)'),
  flair_id: z.string().optional().describe('Flair template ID'),
  flair_text: z.string().optional().describe('Flair text'),
  nsfw: z.boolean().optional().describe('Mark as NSFW'),
  spoiler: z.boolean().optional().describe('Mark as spoiler'),
});

export const ReplySchema = z.object({
  thingId: z
    .string()
    .min(1)
    .describe('Full name of the post or comment to reply to (e.g. t3_abc123 or t1_xyz789)'),
  text: z.string().min(1).describe('Reply text (markdown supported)'),
});

export const EditSchema = z.object({
  thingId: z
    .string()
    .min(1)
    .describe('Full name of the post or comment to edit (e.g. t3_abc123 or t1_xyz789)'),
  text: z.string().min(1).describe('New text content (markdown supported)'),
});

export const DeleteSchema = z.object({
  thingId: z
    .string()
    .min(1)
    .describe('Full name of the post or comment to delete (e.g. t3_abc123 or t1_xyz789)'),
});

export const VoteSchema = z.object({
  thingId: z
    .string()
    .min(1)
    .describe('Full name of the post or comment to vote on (e.g. t3_abc123 or t1_xyz789)'),
  direction: z.enum(['1', '0', '-1']).describe('Vote direction: 1=upvote, 0=unvote, -1=downvote'),
});

// ── Config Types ──

export interface RedditConfig {
  accessToken: string;
  userAgent: string;
  tokenManager?: {
    getToken: () => Promise<string>;
  };
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
