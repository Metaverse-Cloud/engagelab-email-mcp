import { z } from 'zod';
import type { AgentEmailClient } from './client.js';
import { ApiError } from './client.js';

const addressSchema = z.array(z.string()).optional();

const attachmentSchema = z.object({
  filename: z.string().describe('File name shown to recipients'),
  content: z.string().describe('Base64-encoded file content'),
  disposition: z.enum(['attachment', 'inline']).default('attachment'),
  contentId: z.string().optional().describe('Content-ID, required for inline images'),
});

const messageContentSchema = {
  subject: z.string().optional().describe('Email subject'),
  text: z.string().optional().describe('Plain text body'),
  html: z.string().optional().describe('HTML body'),
  previewText: z.string().optional().describe('Preheader / preview text'),
  cc: addressSchema.describe('CC addresses'),
  bcc: addressSchema.describe('BCC addresses'),
  replyTo: addressSchema.describe('Reply-To addresses'),
  attachments: z.array(attachmentSchema).max(10).optional().describe('Up to 10 attachments, 10MB total'),
  sandbox: z.boolean().optional().describe('Send in sandbox mode without real delivery'),
};

const pagination = {
  pageNo: z.number().int().positive().optional().describe('Page number, starts at 1'),
  pageSize: z.number().int().positive().optional().describe('Page size'),
};

export interface RegisteredTool {
  name: string;
  description: string;
  inputShape: Record<string, z.ZodTypeAny>;
  handler: (args: any, client: AgentEmailClient) => Promise<unknown>;
}

function withErrorHandling(handler: RegisteredTool['handler']): RegisteredTool['handler'] {
  return async (args, client) => {
    try {
      return await handler(args, client);
    } catch (error) {
      const payload =
        error instanceof ApiError
          ? { error: error.message, code: error.code, httpStatus: error.httpStatus }
          : { error: error instanceof Error ? error.message : String(error) };
      throw new Error(JSON.stringify(payload, null, 2));
    }
  };
}

function tool(
  name: string,
  description: string,
  inputShape: Record<string, z.ZodTypeAny>,
  handler: RegisteredTool['handler'],
): RegisteredTool {
  return { name, description, inputShape, handler: withErrorHandling(handler) };
}

export const registeredTools: RegisteredTool[] = [
  tool(
    'list_mailboxes',
    'List all mailboxes available to the authenticated account. Each mailbox has its own address for sending and receiving email. Call this first to discover mailbox IDs used by other tools.',
    {},
    (_args, client) => client.listMailboxes(),
  ),
  tool(
    'send_email',
    'Send a new email from one of your EngageLab mailboxes. Provide either text or html body. Recipients are arrays of email addresses. Use sandbox=true for testing without real delivery.',
    {
      mailboxId: z.number().int().positive().describe('Mailbox ID to send from (see list_mailboxes)'),
      from: z.string().optional().describe('Sender email address'),
      to: z.array(z.string()).describe('Recipient email addresses'),
      ...messageContentSchema,
    },
    (args, client) => client.sendEmail(args),
  ),
  tool(
    'list_inbound_messages',
    'List inbound (received) email messages, newest first. Optionally filter by mailbox and keyword.',
    {
      mailboxId: z.number().int().positive().optional().describe('Filter by mailbox ID'),
      keyword: z.string().optional().describe('Search keyword'),
      ...pagination,
    },
    (args, client) => client.listInboundMessages(args),
  ),
  tool(
    'get_message',
    'Get full details of one inbound message by its UID, including body and attachments.',
    {
      messageUid: z.string().describe('Message UID from list_inbound_messages'),
    },
    (args, client) => client.getMessage(args.messageUid),
  ),
  tool(
    'check_new_messages',
    'Poll for new inbound messages received since the last check (one-shot; does not block). Use this to monitor an inbox for new email.',
    {
      mailboxId: z.number().int().positive().optional().describe('Filter by mailbox ID'),
      limit: z.number().int().positive().optional().describe('Max messages to return'),
    },
    (args, client) => client.listenMessages({ mailboxId: args.mailboxId, limit: args.limit }),
  ),
  tool(
    'list_threads',
    'List conversation threads. A thread groups messages exchanged with the same counterpart.',
    {
      mailboxId: z.number().int().positive().optional().describe('Filter by mailbox ID'),
      keyword: z.string().optional().describe('Search keyword'),
      ...pagination,
    },
    (args, client) => client.listThreads(args),
  ),
  tool(
    'get_thread',
    'Get details of one conversation thread.',
    {
      threadId: z.number().int().positive().describe('Thread ID from list_threads'),
    },
    (args, client) => client.getThread(args.threadId),
  ),
  tool(
    'list_thread_messages',
    'List all messages inside a conversation thread, oldest first.',
    {
      threadId: z.number().int().positive().describe('Thread ID from list_threads'),
      ...pagination,
    },
    (args, client) => client.listThreadMessages(args.threadId, args),
  ),
  tool(
    'reply_email',
    'Reply to an inbound message. Recipients are inferred from the original message; additional cc/bcc can be added. Provide either text or html body.',
    {
      messageUid: z.string().describe('UID of the message to reply to'),
      ...messageContentSchema,
    },
    ({ messageUid, ...body }, client) => client.replyMessage(messageUid, body),
  ),
];
