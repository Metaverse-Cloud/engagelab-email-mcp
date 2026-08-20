# EngageLab Agent Email MCP Server

[![npm](https://img.shields.io/npm/v/@engagelabemail/mcp)](https://www.npmjs.com/package/@engagelabemail/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Give your AI agents the ability to **send, receive, monitor, and reply to email** — through the [Model Context Protocol](https://modelcontextprotocol.io).

Works with Claude Desktop, Claude Code, Cursor, Cowork, and any MCP-compatible client.

## Why

Most email APIs only send. EngageLab Agent Email gives each agent its **own mailbox** — a real address that can send *and* receive — with threads, polling, replies, and attachments built in. This MCP server exposes all of it to your agent.

- **Send & receive** — agents get a dedicated inbox, not just an API key
- **Thread-aware** — conversations grouped automatically, so agents have context
- **5-minute setup** — one Secret Key, one MCP config entry
- **Sandbox mode** — test agent flows without sending real email

## Tools

| Tool | What it does |
|---|---|
| `list_mailboxes` | List mailboxes; call this first to get mailbox IDs |
| `send_email` | Send a new email (text/html, cc/bcc, attachments, sandbox) |
| `list_inbound_messages` | List received messages, filter by mailbox/keyword |
| `get_message` | Full message details by UID |
| `check_new_messages` | One-shot poll for new inbound mail |
| `list_threads` | List conversation threads |
| `get_thread` | Thread details |
| `list_thread_messages` | All messages in a thread |
| `reply_email` | Reply to a message (recipients inferred) |

## Setup

### 1. Get a Secret Key

Create an EngageLab account, then generate a Secret Key from the console. Keys look like `sk_sg_xxx` — the region prefix selects the data center automatically.

Or install the [EngageLab Email CLI](https://github.com/Metaverse-Cloud/engagelab-email-cli) and run `engagelab-email-cli login` to create one via browser.

### 2. Configure your MCP client

Add to `claude_desktop_config.json` (Claude Desktop) or your client's MCP settings:

```json
{
  "mcpServers": {
    "engagelab-email": {
      "command": "npx",
      "args": ["-y", "@engagelabemail/mcp"],
      "env": {
        "ENGAGELAB_EMAIL_SECRET_KEY": "sk_sg_your_key"
      }
    }
  }
}
```

For Claude Code:

```bash
claude mcp add engagelab-email -e ENGAGELAB_EMAIL_SECRET_KEY=sk_sg_your_key -- npx -y @engagelabemail/mcp
```

### 3. Use it

Ask your agent:

> "List my mailboxes, then send an email from the first one to bob@example.com saying the invoice is approved."

## Configuration

| Environment variable | Required | Description |
|---|---|---|
| `ENGAGELAB_EMAIL_SECRET_KEY` | Yes | Secret Key starting with `sk_` |
| `ENGAGELAB_EMAIL_BASE_URL` | No | Override the API base URL (inferred from key region: `sg` → Singapore, `tr` → Türkiye) |

## Run from source

```bash
git clone https://github.com/Metaverse-Cloud/engagelab-email-mcp
cd engagelab-email-mcp
npm install && npm run build
ENGAGELAB_EMAIL_SECRET_KEY=sk_sg_xxx node dist/index.cjs
```

## Related

- [EngageLab Agent Email CLI](https://github.com/Metaverse-Cloud/engagelab-email-cli) — command-line access to the same mailboxes
- [EngageLab Node SDK](https://github.com/Metaverse-Cloud/engagelab-email-node) — send email from Node.js code
- [EngageLab Python SDK](https://github.com/Metaverse-Cloud/engagelab-email-python) — send email from Python code

## License

[MIT](LICENSE)
