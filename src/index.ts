#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentEmailClient, resolveConfig } from './client.js';
import { registeredTools } from './tools.js';

async function main() {
  let client: AgentEmailClient;
  try {
    client = new AgentEmailClient(resolveConfig());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const server = new McpServer(
    { name: 'engagelab-agent-email', version: '0.1.0' },
    {
      instructions:
        'EngageLab Agent Email: send, receive, monitor and reply to email. Start with list_mailboxes to discover mailbox IDs. Auth is handled via the ENGAGELAB_EMAIL_SECRET_KEY environment variable.',
    },
  );

  for (const { name, description, inputShape, handler } of registeredTools) {
    server.tool(name, description, inputShape, async (args) => {
      const result = await handler(args, client);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    });
  }

  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
