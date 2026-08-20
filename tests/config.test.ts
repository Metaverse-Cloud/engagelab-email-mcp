import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferBaseUrlFromSecretKey, resolveConfig } from '../src/client.js';
import { registeredTools } from '../src/tools.js';

test('infers base URL from secret key region', () => {
  assert.equal(inferBaseUrlFromSecretKey('sk_sg_abc'), 'https://email.api.engagelab.cc');
  assert.equal(inferBaseUrlFromSecretKey('sk_TR_abc'), 'https://emailapi-tr.engagelab.com');
  assert.equal(inferBaseUrlFromSecretKey('sk_eu_abc'), undefined);
  assert.equal(inferBaseUrlFromSecretKey('not-a-key'), undefined);
});

test('resolveConfig requires a secret key', () => {
  assert.throws(() => resolveConfig({}), /Missing Secret Key/);
  assert.throws(() => resolveConfig({ ENGAGELAB_EMAIL_SECRET_KEY: 'bad' }), /must start with sk_/);
});

test('resolveConfig rejects unknown region without explicit base URL', () => {
  assert.throws(
    () => resolveConfig({ ENGAGELAB_EMAIL_SECRET_KEY: 'sk_eu_abc' }),
    /base URL/i,
  );
});

test('resolveConfig honors explicit base URL and trims trailing slash', () => {
  const config = resolveConfig({
    ENGAGELAB_EMAIL_SECRET_KEY: 'sk_sg_abc',
    ENGAGELAB_EMAIL_BASE_URL: 'https://example.com/',
  });
  assert.equal(config.baseUrl, 'https://example.com');
});

test('registers all nine tools with unique names', () => {
  const names = registeredTools.map((tool) => tool.name);
  assert.equal(names.length, 9);
  assert.equal(new Set(names).size, 9);
  for (const name of ['list_mailboxes', 'send_email', 'list_inbound_messages', 'get_message', 'check_new_messages', 'list_threads', 'get_thread', 'list_thread_messages', 'reply_email']) {
    assert.ok(names.includes(name), `missing tool: ${name}`);
  }
});
