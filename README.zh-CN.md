# EngageLab Agent Email MCP Server

[![npm](https://img.shields.io/npm/v/@engagelabemail/mcp)](https://www.npmjs.com/package/@engagelabemail/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green)](https://nodejs.org)

[English](README.md) | **简体中文**

> EngageLab Email 官方项目。

**让 AI Agent 收发邮件、监控收件箱并回复** —— 基于 [Model Context Protocol](https://modelcontextprotocol.io)。

每个 agent 拥有**自己的邮箱**：一个真实地址，既能发信也能收信，往来邮件自动归入会话线程（thread），agent 始终有完整上下文。支持 Claude Desktop、Claude Code、Cursor、Cowork 及任何兼容 MCP 的客户端。

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

## 为什么

多数邮件 API 只能发信。需要"用邮件**对话**"的 agent —— 客服、日程协调、审批流转 —— 需要的是一个收件箱。

- **收发一体** —— agent 拥有专属邮箱，而非外挂一个解析 webhook
- **线程感知** —— 回复自动归入会话，agent 能看到完整历史
- **沙箱模式** —— 不给真人发信也能测试 agent 流程
- **一个环境变量** —— 本地使用无需 OAuth，区域由密钥前缀自动推断

## 工具

| | 工具 | 功能 |
|---|---|---|
| **发现** | `list_mailboxes` | 列出邮箱；先调用它拿到邮箱 ID |
| **发信** | `send_email` | 发新邮件（text/html、cc/bcc、附件、沙箱） |
| | `reply_email` | 回复邮件 —— 收件人与线程自动推断 |
| **收信** | `list_inbound_messages` | 收件列表，可按邮箱/关键词过滤 |
| | `get_message` | 按 UID 取邮件完整详情 |
| | `check_new_messages` | 一次性轮询新邮件 |
| **线程** | `list_threads` / `get_thread` / `list_thread_messages` | 浏览会话 |

## 快速开始

### Smithery / MCPB

本服务支持以 MCPB Bundle 形式发布到 Smithery。生成 bundle：

```bash
npm run build:mcpb
```

生成文件位于 `dist/engagelab-agent-email.mcpb`，可通过 [Smithery 发布页面](https://smithery.ai/new)上传。

**1. 获取 Secret Key。** 注册 EngageLab 账号，在控制台生成密钥（格式 `sk_sg_xxx` —— 前缀即区域）。也可用 [CLI](https://github.com/Metaverse-Cloud/engagelab-email-cli)：`engagelab-email-cli login` 通过浏览器登录自动生成。

**2. 创建邮箱。** 在控制台为 agent 创建一个邮箱（共享子域名即时可用；自定义域名需 DNS 验证）。程序化创建邮箱已在规划中 —— 若 `list_mailboxes` 返回空，见[故障排查](#故障排查)。

**3. 注册 server。**

Claude Desktop —— 把上方 JSON 块加入 `claude_desktop_config.json`。

Claude Code：

```bash
claude mcp add engagelab-email \
  -e ENGAGELAB_EMAIL_SECRET_KEY=sk_sg_your_key \
  -- npx -y @engagelabemail/mcp
```

然后对 agent 说：

> 列出我的邮箱，然后用第一个给 bob@example.com 发一封邮件，内容是发票已审批通过。

一个典型的客服 agent 循环：

```
check_new_messages()            → [messageUids]
get_message(uid)                → 正文、附件
list_thread_messages(threadId)  → 完整会话上下文
reply_email(uid, { text: ... }) → 回复进入同一线程
```

## 配置

| 环境变量 | 必填 | 说明 |
|---|---|---|
| `ENGAGELAB_EMAIL_SECRET_KEY` | 是 | 以 `sk_` 开头的 Secret Key |
| `ENGAGELAB_EMAIL_BASE_URL` | 否 | 覆盖 API 地址。默认由密钥区域推断：`sg` → 新加坡，`tr` → 土耳其 |

限制：每封邮件最多 10 个附件、共 10MB（在工具入参中以 base64 编码）。

## 故障排查

- **`list_mailboxes` 返回空列表** —— 账号下还没有邮箱。请到 EngageLab 控制台创建（见快速开始第 2 步）。目前 agent 还不能自建邮箱。
- **401 / `code 100101`** —— Secret Key 错误或已吊销。检查 `ENGAGELAB_EMAIL_SECRET_KEY`，并确认密钥区域前缀（`sk_sg_` / `sk_tr_`）与所用节点一致。
- **无法确定 API 地址** —— 密钥区域前缀无法识别。请显式设置 `ENGAGELAB_EMAIL_BASE_URL`。
- **回复显示成了新会话** —— 请用 `reply_email`（而非 `send_email`），以保住 In-Reply-To 头和线程关系。

## Roadmap

- [ ] Hosted MCP（OAuth），远程零配置使用
- [ ] 通过 Secret Key 程序化创建邮箱
- [ ] Webhook 推送（替代轮询）
- [ ] URL 形式的附件引用（上下文不再放 base64）

## 从源码运行

```bash
git clone https://github.com/Metaverse-Cloud/engagelab-email-mcp
cd engagelab-email-mcp
npm install && npm run build
ENGAGELAB_EMAIL_SECRET_KEY=sk_sg_xxx node dist/index.cjs
```

## 相关项目

- [EngageLab Agent Email CLI](https://github.com/Metaverse-Cloud/engagelab-email-cli) —— 同一套邮箱的命令行入口，`--json` 输出面向 agent
- [EngageLab Node SDK](https://github.com/Metaverse-Cloud/engagelab-email-node) / [Python SDK](https://github.com/Metaverse-Cloud/engagelab-email-python) —— 在代码中发信

## 许可证

[MIT](LICENSE)
