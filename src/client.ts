const SECRET_KEY_BASE_URL_MAP: Record<string, string> = {
  sg: 'https://email.api.engagelab.cc',
  tr: 'https://emailapi-tr.engagelab.com',
};

export interface AgentEmailConfig {
  baseUrl: string;
  secretKey: string;
}

export function inferBaseUrlFromSecretKey(secretKey: string): string | undefined {
  if (!secretKey.startsWith('sk_')) return undefined;
  const region = secretKey.split('_')[1]?.toLowerCase();
  return SECRET_KEY_BASE_URL_MAP[region];
}

export function resolveConfig(env: NodeJS.ProcessEnv = process.env): AgentEmailConfig {
  const secretKey = env.ENGAGELAB_EMAIL_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'Missing Secret Key. Set the ENGAGELAB_EMAIL_SECRET_KEY environment variable with a key from the EngageLab console (starts with sk_).',
    );
  }
  if (!secretKey.startsWith('sk_')) {
    throw new Error('Secret Key must start with sk_');
  }

  const baseUrl =
    env.ENGAGELAB_EMAIL_BASE_URL || inferBaseUrlFromSecretKey(secretKey);
  if (!baseUrl) {
    throw new Error(
      'Could not determine API base URL from the Secret Key region. Set ENGAGELAB_EMAIL_BASE_URL explicitly.',
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ''), secretKey };
}

const API_PREFIX = '/api/email/agent/v1';
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly httpStatus: number,
    readonly data: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ResultEnvelope {
  code: number;
  message?: string;
  [key: string]: unknown;
}

export class AgentEmailClient {
  constructor(private readonly config: AgentEmailConfig) {}

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    options: { searchParams?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(this.config.baseUrl + API_PREFIX + path);
    for (const [key, value] of Object.entries(options.searchParams ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    let data: ResultEnvelope;
    try {
      data = (await response.json()) as ResultEnvelope;
    } catch {
      throw new ApiError(
        `Invalid server response (HTTP ${response.status})`,
        response.status,
        response.status,
        null,
      );
    }

    if (data.code !== 0) {
      throw new ApiError(data.message || `Request failed (code ${data.code})`, data.code, response.status, data);
    }

    return data as unknown as T;
  }

  listMailboxes(query: Record<string, string | number | undefined> = {}) {
    return this.request('GET', '/mailbox/list', { searchParams: query });
  }

  listThreads(query: Record<string, string | number | undefined> = {}) {
    return this.request('GET', '/thread/list', { searchParams: query });
  }

  getThread(threadId: number | string) {
    return this.request('GET', '/thread/get', { searchParams: { threadId } });
  }

  listThreadMessages(threadId: number | string, query: Record<string, string | number | undefined> = {}) {
    return this.request('GET', '/thread/messages', { searchParams: { threadId, ...query } });
  }

  listInboundMessages(query: Record<string, string | number | undefined> = {}) {
    return this.request('GET', '/message/list', { searchParams: query });
  }

  getMessage(messageUid: string) {
    return this.request('GET', '/message/get', { searchParams: { messageUid } });
  }

  listenMessages(query: Record<string, string | number | undefined> = {}) {
    return this.request('GET', '/message/listen', { searchParams: query });
  }

  replyMessage(messageUid: string, body: unknown) {
    return this.request('POST', '/message/reply', { searchParams: { messageUid }, body });
  }

  sendEmail(body: unknown) {
    return this.request('POST', '/mail/send', { body });
  }
}
