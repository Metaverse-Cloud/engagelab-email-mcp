import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

await mkdir('mcpb/server', { recursive: true });
await copyFile('dist/index.cjs', 'mcpb/server/index.js');

await execFileAsync(
  'npx',
  ['--yes', '@anthropic-ai/mcpb@latest', 'pack', 'mcpb', 'dist/engagelab-agent-email.mcpb'],
  { stdio: 'inherit' },
);

// Smithery expects inputSchema on static tools, while MCPB 0.3 rejects that
// field in manifest.json. Pack with the MCPB-valid manifest first, then replace
// the manifest entry in the ZIP with the Smithery-compatible metadata.
const objectSchema = (properties, required = []) => ({
  type: 'object',
  properties,
  ...(required.length > 0 ? { required } : {}),
  additionalProperties: false,
});

const stringArray = { type: 'array', items: { type: 'string' } };
const positiveInteger = { type: 'integer', minimum: 1 };
const attachment = {
  type: 'object',
  properties: {
    filename: { type: 'string' },
    content: { type: 'string', description: 'Base64-encoded file content' },
    disposition: { type: 'string', enum: ['attachment', 'inline'], default: 'attachment' },
    contentId: { type: 'string' },
  },
  required: ['filename', 'content'],
  additionalProperties: false,
};
const messageProperties = {
  subject: { type: 'string' },
  text: { type: 'string' },
  html: { type: 'string' },
  previewText: { type: 'string' },
  cc: stringArray,
  bcc: stringArray,
  replyTo: stringArray,
  attachments: { type: 'array', items: attachment, maxItems: 10 },
  sandbox: { type: 'boolean' },
};

const toolSchemas = [
  ['list_mailboxes', objectSchema({})],
  [
    'send_email',
    objectSchema(
      {
        mailboxId: positiveInteger,
        from: { type: 'string' },
        to: stringArray,
        ...messageProperties,
      },
      ['mailboxId', 'to'],
    ),
  ],
  [
    'reply_email',
    objectSchema({ messageUid: { type: 'string' }, ...messageProperties }, ['messageUid']),
  ],
  [
    'list_inbound_messages',
    objectSchema({ mailboxId: positiveInteger, keyword: { type: 'string' }, pageNo: positiveInteger, pageSize: positiveInteger }),
  ],
  ['get_message', objectSchema({ messageUid: { type: 'string' } }, ['messageUid'])],
  ['check_new_messages', objectSchema({ mailboxId: positiveInteger, limit: positiveInteger })],
  [
    'list_threads',
    objectSchema({ mailboxId: positiveInteger, keyword: { type: 'string' }, pageNo: positiveInteger, pageSize: positiveInteger }),
  ],
  ['get_thread', objectSchema({ threadId: positiveInteger }, ['threadId'])],
  [
    'list_thread_messages',
    objectSchema({ threadId: positiveInteger, pageNo: positiveInteger, pageSize: positiveInteger }, ['threadId']),
  ],
];

const manifest = JSON.parse(await readFile('mcpb/manifest.json', 'utf8'));
const smitheryManifest = {
  ...manifest,
  tools: manifest.tools.map((tool) => ({
    ...tool,
    inputSchema: toolSchemas.find(([name]) => name === tool.name)[1],
  })),
};
const tempDir = await mkdtemp(join(tmpdir(), 'engagelab-mcpb-'));
const smitheryManifestPath = join(tempDir, 'manifest.json');
await writeFile(smitheryManifestPath, `${JSON.stringify(smitheryManifest, null, 2)}\n`);

await execFileAsync('zip', ['-d', 'dist/engagelab-agent-email.mcpb', 'manifest.json']);
await execFileAsync('zip', ['-j', 'dist/engagelab-agent-email.mcpb', smitheryManifestPath]);
await rm(tempDir, { recursive: true, force: true });
