#!/usr/bin/env node
/**
 * Shared LLM client for the summarize/group pipeline stages. Picks a
 * provider from environment variables so switching providers is a config
 * change, not a code change:
 *
 *   OLLAMA_API_KEY set  -> Ollama Cloud (https://ollama.com/api/chat)
 *   ANTHROPIC_API_KEY set -> Claude API (fallback if no Ollama key)
 *
 * Both providers are called with a system prompt + user message and are
 * expected to return a JSON array as plain text (no markdown fence) — the
 * calling script is responsible for parsing/validating that JSON, this
 * module only returns the raw text.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://ollama.com';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:120b';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

async function callOllama(systemPrompt, userMessage) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
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

async function callClaude(systemPrompt, userMessage) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

/**
 * Call whichever provider is configured. Returns parsed JSON (array or
 * object, per the prompt's contract) — throws if the response isn't valid
 * JSON so callers fail loudly instead of silently skipping a batch.
 */
export async function callLLM(systemPrompt, userMessage) {
  let text;
  if (process.env.OLLAMA_API_KEY) {
    text = await callOllama(systemPrompt, userMessage);
  } else if (process.env.ANTHROPIC_API_KEY) {
    text = await callClaude(systemPrompt, userMessage);
  } else {
    throw new Error('No LLM provider configured — set OLLAMA_API_KEY or ANTHROPIC_API_KEY');
  }
  const cleaned = text.replace(/^```json\s*|```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}
