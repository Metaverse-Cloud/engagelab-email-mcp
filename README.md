# EngageLab Agent Email MCP Server

[![npm](https://img.shields.io/npm/v/@engagelabemail/mcp)](https://www.npmjs.com/package/@engagelabemail/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green)](https://nodejs.org)

**English** | [简体中文](README.zh-CN.md)

**Send, receive, and reply to email from AI agents** — through the [Model Context Protocol](https://modelcontextprotocol.io).

Each agent gets its **own mailbox**: a real address that sends *and* receives, with conversations grouped into threads so your agent has context. Works with Claude Desktop, Claude Code, Cursor, Cowork, and any MCP-compatible client.

```json
{
  "mcpServers": {
    "engagelab-email": {
      "command": "npx",
      "args": ["-y", "@engagelabemail/mcp"],
      "env": { "ENGAGELAB_EMAIL_SECRET_KEY": "sk_sg_your_key" }
    }
  }
}
```

## Why

Most email APIs are send-only. Agents that need to *have a conversation* over email — support, scheduling, approvals — need an inbox.

- **Send & receive** — the agent owns a dedicated mailbox, not a bolted-on parse webhook
- **Thread-aware** — replies group into conversations, so the agent sees full history
- **Sandbox mode** — test agent flows without emailing real humans
- **One env var** — no OAuth dance for local use; region inferred from the key

## Tools

| | Tool | What it does |
|---|---|---|
| **Discover** | `list_mailboxes` | List mailboxes; call this first to get IDs |
| **Send** | `send_email` | New email (text/html, cc/bcc, attachments, sandbox) |
| | `reply_email` | Reply to a message — recipients & thread inferred |
| **Receive** | `list_inbound_messages` | Inbound mail, filter by mailbox/keyword |
| | `get_message` | Full message details by UID |
| | `check_new_messages` | One-shot poll for new mail |
| **Threads** | `list_threads` / `get_thread` / `list_thread_messages` | Browse conversations |

## Quickstart

### Smithery / MCPB

For local stdio distribution, build an MCPB bundle:

```bash
npm run build:mcpb
```

The bundle is generated at `dist/engagelab-agent-email.mcpb` and can be uploaded through [Smithery publishing](https://smithery.ai/new).

**1. Get a Secret Key.** Create an EngageLab account and generate a key from the console (format `sk_sg_xxx` — the prefix selects the region). Or use the [CLI](https://github.com/Metaverse-Cloud/engagelab-email-cli): `engagelab-email-cli login` creates one via browser.

**2. Create a mailbox.** In the console, create a mailbox for your agent (shared subdomain is instant; custom domains need DNS verification). Programmatic mailbox creation is on the roadmap — see [Troubleshooting](#troubleshooting) if `list_mailboxes` returns empty.

**3. Register the server.**

Claude Desktop — add the JSON block above to `claude_desktop_config.json`.

Claude Code:

```bash
claude mcp add engagelab-email \
  -e ENGAGELAB_EMAIL_SECRET_KEY=sk_sg_your_key \
  -- npx -y @engagelabemail/mcp
```

Then ask your agent:

> List my mailboxes, then send an email from the first one to bob@example.com saying the invoice is approved.

A typical agent loop for a support bot:

```
check_new_messages()            → [messageUids]
get_message(uid)                → body, attachments
list_thread_messages(threadId)  → full conversation context
reply_email(uid, { text: ... }) → response lands in the same thread
```

## Configuration

| Environment variable | Required | Description |
|---|---|---|
| `ENGAGELAB_EMAIL_SECRET_KEY` | Yes | Secret Key starting with `sk_` |
| `ENGAGELAB_EMAIL_BASE_URL` | No | Override the API base URL. Inferred from the key region: `sg` → Singapore, `tr` → Türkiye |

Limits: up to 10 attachments / 10MB total per message (base64-encoded in the tool schema).

## Troubleshooting

- **`list_mailboxes` returns an empty list** — your account has no mailbox yet. Create one in the EngageLab console (see Quickstart step 2). Agents cannot self-provision mailboxes yet.
- **401 / `code 100101`** — the Secret Key is wrong or revoked. Check `ENGAGELAB_EMAIL_SECRET_KEY` and that the key's region prefix (`sk_sg_` / `sk_tr_`) matches the endpoint you use.
- **Could not determine API base URL** — the key's region prefix isn't recognized. Set `ENGAGELAB_EMAIL_BASE_URL` explicitly.
- **Reply shows up as a new conversation** — use `reply_email` (not `send_email`) so In-Reply-To headers and threading stay intact.

## Roadmap

- [ ] Hosted MCP (OAuth) for zero-config remote use
- [ ] Programmatic mailbox creation via Secret Key
- [ ] Webhook push (no polling) for `check_new_messages`
- [ ] URL-based attachment references (no base64 in context)

## Run from source

```bash
git clone https://github.com/Metaverse-Cloud/engagelab-email-mcp
cd engagelab-email-mcp
npm install && npm run build
ENGAGELAB_EMAIL_SECRET_KEY=sk_sg_xxx node dist/index.cjs
```

## Related

- [EngageLab Agent Email CLI](https://github.com/Metaverse-Cloud/engagelab-email-cli) — same mailboxes from the terminal, `--json` output for agents
- [EngageLab Node SDK](https://github.com/Metaverse-Cloud/engagelab-email-node) / [Python SDK](https://github.com/Metaverse-Cloud/engagelab-email-python) — send email from code

## License

[MIT](LICENSE)
