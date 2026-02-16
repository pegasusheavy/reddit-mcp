import axios, { AxiosInstance, AxiosError } from 'axios';
import type { RedditConfig } from '../types/reddit.js';

export class RedditAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'RedditAPIError';
  }
}

export class RedditClient {
  private client: AxiosInstance;
  private config: RedditConfig;

  constructor(config: RedditConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: 'https://oauth.reddit.com',
      timeout: 30000,
      headers: {
        'User-Agent': config.userAgent,
      },
    });

    this.client.interceptors.request.use(async (reqConfig) => {
      const token = this.config.tokenManager
        ? await this.config.tokenManager.getToken()
        : this.config.accessToken;

      reqConfig.headers.Authorization = `Bearer ${token}`;
      return reqConfig;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          throw new RedditAPIError(
            error.response.data ? JSON.stringify(error.response.data) : 'Reddit API error',
            error.response.status,
            error.response.data
          );
        } else if (error.request) {
          throw new RedditAPIError('No response from Reddit API');
        } else {
          throw new RedditAPIError(`Request failed: ${error.message}`);
        }
      }
    );
  }

  // ── Read Operations ──

  async getPost(postId: string, commentLimit = 25, commentSort = 'confidence'): Promise<unknown> {
    const id = postId.startsWith('t3_') ? postId.slice(3) : postId;
    const response = await this.client.get(`/comments/${id}`, {
      params: { limit: commentLimit, sort: commentSort },
    });
    return response.data;
  }

  async getTopPosts(subreddit: string, time = 'day', limit = 10): Promise<unknown> {
    const response = await this.client.get(`/r/${subreddit}/top`, {
      params: { t: time, limit },
    });
    return response.data;
  }

  async search(
    query: string,
    options: { subreddit?: string; sort?: string; time?: string; limit?: number } = {}
  ): Promise<unknown> {
    const endpoint = options.subreddit ? `/r/${options.subreddit}/search` : '/search';

    const response = await this.client.get(endpoint, {
      params: {
        q: query,
        sort: options.sort || 'relevance',
        t: options.time || 'all',
        limit: options.limit || 10,
        restrict_sr: options.subreddit ? 'true' : undefined,
        type: 'link',
      },
    });
    return response.data;
  }

  async getSubredditInfo(subreddit: string): Promise<unknown> {
    const response = await this.client.get(`/r/${subreddit}/about`);
    return response.data;
  }

  async getUserInfo(username: string): Promise<unknown> {
    const response = await this.client.get(`/user/${username}/about`);
    return response.data;
  }

  // ── Write Operations ──

  async createPost(params: {
    subreddit: string;
    title: string;
    text?: string;
    url?: string;
    flair_id?: string;
    flair_text?: string;
    nsfw?: boolean;
    spoiler?: boolean;
  }): Promise<unknown> {
    const formData = new URLSearchParams({
      sr: params.subreddit,
      title: params.title,
      kind: params.url ? 'link' : 'self',
      api_type: 'json',
    });

    if (params.text) formData.set('text', params.text);
    if (params.url) formData.set('url', params.url);
    if (params.flair_id) formData.set('flair_id', params.flair_id);
    if (params.flair_text) formData.set('flair_text', params.flair_text);
    if (params.nsfw) formData.set('nsfw', 'true');
    if (params.spoiler) formData.set('spoiler', 'true');

    const response = await this.client.post('/api/submit', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  }

  async reply(thingId: string, text: string): Promise<unknown> {
    const formData = new URLSearchParams({
      thing_id: thingId,
      text,
      api_type: 'json',
    });

    const response = await this.client.post('/api/comment', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  }

  async edit(thingId: string, text: string): Promise<unknown> {
    const formData = new URLSearchParams({
      thing_id: thingId,
      text,
      api_type: 'json',
    });

    const response = await this.client.post('/api/editusertext', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  }

  async delete(thingId: string): Promise<unknown> {
    const formData = new URLSearchParams({
      id: thingId,
    });

    const response = await this.client.post('/api/del', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  }

  async vote(thingId: string, direction: string): Promise<unknown> {
    const formData = new URLSearchParams({
      id: thingId,
      dir: direction,
    });

    const response = await this.client.post('/api/vote', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  }
}
