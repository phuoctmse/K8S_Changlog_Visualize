import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripJsonFence,
  resolveProvider,
  callAnthropic,
  callOllama,
  callLLMJSON,
} from './llm-client.mjs';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OLLAMA_API_KEY;
  delete process.env.OLLAMA_MODEL;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.LLM_PROVIDER;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

test('stripJsonFence removes ```json fences', () => {
  const wrapped = '```json\n[{"a":1}]\n```';
  assert.equal(stripJsonFence(wrapped), '[{"a":1}]');
});

test('stripJsonFence leaves plain JSON untouched', () => {
  assert.equal(stripJsonFence('[{"a":1}]'), '[{"a":1}]');
});

test('resolveProvider defaults to anthropic when LLM_PROVIDER unset', () => {
  assert.equal(resolveProvider({}), 'anthropic');
});

test('resolveProvider respects LLM_PROVIDER=ollama (case-insensitive)', () => {
  assert.equal(resolveProvider({ LLM_PROVIDER: 'Ollama' }), 'ollama');
});

test('callAnthropic throws when ANTHROPIC_API_KEY missing', async () => {
  await assert.rejects(
    () => callAnthropic({ system: 's', user: 'u' }),
    /ANTHROPIC_API_KEY not set/
  );
});

test('callOllama throws when OLLAMA_API_KEY missing', async () => {
  await assert.rejects(
    () => callOllama({ system: 's', user: 'u' }),
    /OLLAMA_API_KEY not set/
  );
});

test('callAnthropic sends correct request shape and parses response text', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let capturedUrl, capturedOpts;
  globalThis.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedOpts = opts;
    return {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'hello' }] }),
    };
  };
  const text = await callAnthropic({ system: 'sys', user: 'usr' });
  assert.equal(text, 'hello');
  assert.equal(capturedUrl, 'https://api.anthropic.com/v1/messages');
  assert.equal(capturedOpts.headers['x-api-key'], 'test-key');
  const body = JSON.parse(capturedOpts.body);
  assert.equal(body.system, 'sys');
  assert.equal(body.messages[0].content, 'usr');
});

test('callAnthropic throws with status and body text on HTTP error', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => 'server exploded',
  });
  await assert.rejects(
    () => callAnthropic({ system: 's', user: 'u' }),
    /Anthropic API error: 500 server exploded/
  );
});

test('callOllama sends correct request shape (cloud defaults) and parses response text', async () => {
  process.env.OLLAMA_API_KEY = 'test-key';
  let capturedUrl, capturedOpts;
  globalThis.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedOpts = opts;
    return {
      ok: true,
      json: async () => ({ message: { content: '{"ok":true}' } }),
    };
  };
  const text = await callOllama({ system: 'sys', user: 'usr' });
  assert.equal(text, '{"ok":true}');
  assert.equal(capturedUrl, 'https://ollama.com/api/chat');
  assert.equal(capturedOpts.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(capturedOpts.body);
  assert.equal(body.model, 'gpt-oss:120b-cloud');
  assert.equal(body.format, 'json');
  assert.deepEqual(body.messages, [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'usr' },
  ]);
});

test('callOllama respects OLLAMA_MODEL and OLLAMA_BASE_URL overrides', async () => {
  process.env.OLLAMA_API_KEY = 'test-key';
  process.env.OLLAMA_MODEL = 'qwen3:235b-cloud';
  process.env.OLLAMA_BASE_URL = 'https://custom.example.com';
  let capturedUrl, capturedBody;
  globalThis.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ message: { content: '{}' } }) };
  };
  await callOllama({ system: 's', user: 'u' });
  assert.equal(capturedUrl, 'https://custom.example.com/api/chat');
  assert.equal(capturedBody.model, 'qwen3:235b-cloud');
});

test('callLLMJSON dispatches to anthropic by default and returns parsed JSON', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text: '```json\n[{"id":1}]\n```' }],
    }),
  });
  const result = await callLLMJSON({ system: 's', user: 'u' });
  assert.deepEqual(result, [{ id: 1 }]);
});

test('callLLMJSON dispatches to ollama when LLM_PROVIDER=ollama', async () => {
  process.env.LLM_PROVIDER = 'ollama';
  process.env.OLLAMA_API_KEY = 'test-key';
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ message: { content: '[{"id":2}]' } }),
  });
  const result = await callLLMJSON({ system: 's', user: 'u' });
  assert.deepEqual(result, [{ id: 2 }]);
});
