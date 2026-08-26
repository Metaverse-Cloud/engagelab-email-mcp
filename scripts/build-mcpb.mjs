import { copyFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

await mkdir('mcpb/server', { recursive: true });
await copyFile('dist/index.cjs', 'mcpb/server/index.js');

await execFileAsync(
  'npx',
  ['--yes', '@anthropic-ai/mcpb@latest', 'pack', 'mcpb', 'dist/engagelab-agent-email.mcpb'],
  { stdio: 'inherit' },
);
