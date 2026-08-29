#!/usr/bin/env node
/**
 * Shared LLM client used by summarize-changelog.mjs and
 * group-feature-journeys.mjs. Picks a provider via the LLM_PROVIDER env var:
 *   - "anthropic" (default): Claude API, requires ANTHROPIC_API_KEY
 *   - "ollama": Ollama Cloud, requires OLLAMA_API_KEY
 *
 * Both providers are expected to return a JSON array/object as text
 * (optionally wrapped in a ```json fence, which is stripped here) — callers
 * pass a system prompt that already instructs the model to respond that way.
 */

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const OLLAMA_DEFAULT_MODEL = 'gpt-oss:120b-cloud';
const OLLAMA_DEFAULT_BASE_URL = 'https://ollama.com';

export function stripJsonFence(text) {
  return text.replace(/^```json\s*|```\s*$/g, '').trim();
}

export function resolveProvider(env = process.env) {
  return (env.LLM_PROVIDER || 'anthropic').toLowerCase();
}

export async function callAnthropic({ system, user, maxTokens = 4096 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

export async function callOllama({ system, user }) {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error('OLLAMA_API_KEY not set');

  const model = process.env.OLLAMA_MODEL || OLLAMA_DEFAULT_MODEL;
  const baseUrl = process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL;

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      format: 'json',
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.message.content;
}

export function currentProviderLabel() {
  const provider = resolveProvider();
  if (provider === 'ollama') {
    const model = process.env.OLLAMA_MODEL || OLLAMA_DEFAULT_MODEL;
    return `ollama (${model})`;
  }
  return `anthropic (${ANTHROPIC_MODEL})`;
}

export async function callLLMJSON({ system, user, maxTokens = 4096 }) {
  const provider = resolveProvider();
  const text =
    provider === 'ollama'
      ? await callOllama({ system, user, maxTokens })
      : await callAnthropic({ system, user, maxTokens });
  return JSON.parse(stripJsonFence(text));
}
