# Ollama Provider + Pipeline Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing pipeline scripts/data into the folder structure `CLAUDE.md` documents, and add Ollama Cloud as a selectable LLM provider alongside Anthropic Claude for `summarize-changelog.mjs` and `group-feature-journeys.mjs`.

**Architecture:** Pure file relocation (no logic change) for the restructure; a new `scripts/llm-client.mjs` module centralizes the "call an LLM, parse the JSON response" concern behind one function (`callLLMJSON`) that dispatches to Claude or Ollama Cloud based on the `LLM_PROVIDER` env var. The two existing pipeline scripts stop calling `fetch()` directly and call `callLLMJSON` instead.

**Tech Stack:** Node.js (ESM, `.mjs`), no new runtime dependencies. Tests use Node's built-in `node:test` + `node:assert/strict` runner (no Jest/Vitest needed — avoids adding a test framework dependency for a project this small).

**Spec:** `docs/superpowers/specs/2026-08-29-ollama-provider-pipeline-restructure-design.md`

## Global Constraints

- Node >= 18 (existing `package.json` `engines` field — required for built-in `fetch` and `node:test`).
- No frontend work in this plan (explicitly out of scope — see spec).
- No real LLM API calls during automated verification unless a real key is explicitly provided by the user — verification of the Ollama/Anthropic wiring must prove itself via the "missing API key" fail-fast error, not a live call.
- Provider selection: `LLM_PROVIDER` env var, default `"anthropic"` (case-insensitive), other supported value `"ollama"`.
- Ollama Cloud defaults: `OLLAMA_MODEL` default `gpt-oss:120b-cloud`, `OLLAMA_BASE_URL` default `https://ollama.com`. Both overridable via env.
- Schema of `data/versions/{version}.json` and `data/feature-journeys/{id}.json` must not change.
- `run-backfill.mjs` resumability (skip steps whose output file already exists on disk) must not break.
- `data/parsed/`, `data/versions/`, `data/feature-journeys/` are committed to git; `data/raw/` and `.env` are not.

---

### Task 1: Restructure directories and add config scaffolding

**Files:**
- Move: `fetch-changelog.mjs` → `scripts/fetch-changelog.mjs`
- Move: `parse-changelog.mjs` → `scripts/parse-changelog.mjs`
- Move: `summarize-changelog.mjs` → `scripts/summarize-changelog.mjs`
- Move: `group-feature-journeys.mjs` → `scripts/group-feature-journeys.mjs`
- Move: `run-backfill.mjs` → `scripts/run-backfill.mjs`
- Move: `taxonomy.json` → `data/taxonomy.json`
- Create: `.gitignore`
- Create: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Produces: `scripts/` directory containing all 5 pipeline scripts (relative imports between them — e.g. `run-backfill.mjs`'s `import { fetchChangelog } from './fetch-changelog.mjs'` — stay correct unchanged, since all 5 files move together and keep the same relative layout).
- Produces: `data/taxonomy.json`, read by `summarize-changelog.mjs` via `path.resolve('data/taxonomy.json')` (already the correct path in the existing code — no code change needed, only the physical move).

- [ ] **Step 1: Create target directories and move the 5 scripts + taxonomy.json**

```bash
cd "d:/K8S_Changlog_Visualize"
mkdir -p scripts data
git mv fetch-changelog.mjs scripts/fetch-changelog.mjs
git mv parse-changelog.mjs scripts/parse-changelog.mjs
git mv summarize-changelog.mjs scripts/summarize-changelog.mjs
git mv group-feature-journeys.mjs scripts/group-feature-journeys.mjs
git mv run-backfill.mjs scripts/run-backfill.mjs
git mv taxonomy.json data/taxonomy.json
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.env
data/raw/
```

- [ ] **Step 3: Create `.env.example`**

```
# Chọn provider: anthropic (mặc định) | ollama
LLM_PROVIDER=anthropic

# Cần nếu LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Cần nếu LLM_PROVIDER=ollama (Ollama Cloud)
OLLAMA_API_KEY=
OLLAMA_MODEL=gpt-oss:120b-cloud
OLLAMA_BASE_URL=https://ollama.com
```

- [ ] **Step 4: Update `package.json`** — add `dotenv-cli` as a dev dependency (per `CLAUDE.md`'s documented `npx dotenv --` usage) and a `test` script for the `node:test` suite added in Task 2.

Current `package.json`:
```json
{
  "name": "k8s-changelog-viz",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "fetch": "node scripts/fetch-changelog.mjs",
    "parse": "node scripts/parse-changelog.mjs",
    "summarize": "node scripts/summarize-changelog.mjs",
    "journeys": "node scripts/group-feature-journeys.mjs",
    "backfill": "node scripts/run-backfill.mjs"
  },
  "engines": {
    "node": ">=18"
  }
}
```

New `package.json`:
```json
{
  "name": "k8s-changelog-viz",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "fetch": "node scripts/fetch-changelog.mjs",
    "parse": "node scripts/parse-changelog.mjs",
    "summarize": "node scripts/summarize-changelog.mjs",
    "journeys": "node scripts/group-feature-journeys.mjs",
    "backfill": "node scripts/run-backfill.mjs",
    "test": "node --test scripts/"
  },
  "engines": {
    "node": ">=18"
  },
  "devDependencies": {
    "dotenv-cli": "^7.4.2"
  }
}
```

- [ ] **Step 5: Install the new dev dependency**

Run: `npm install`
Expected: `node_modules/dotenv-cli` created, `package-lock.json` updated, no errors.

- [ ] **Step 6: Smoke-test the moved fetch + parse scripts (no API key needed)**

Run:
```bash
node scripts/fetch-changelog.mjs 1.29
node scripts/parse-changelog.mjs 1.29
```
Expected: `Saved .../data/raw/1.29.md (... bytes)` then `Parsed <N> entries -> .../data/parsed/1.29.json`, with `data/parsed/1.29.json` present and containing an `entries` array. This proves the directory move didn't break any relative path.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: restructure pipeline into scripts/ and data/ per CLAUDE.md layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `scripts/llm-client.mjs` — shared provider-dispatching LLM client

**Files:**
- Create: `scripts/llm-client.mjs`
- Test: `scripts/llm-client.test.mjs`

**Interfaces:**
- Consumes: `process.env.LLM_PROVIDER`, `process.env.ANTHROPIC_API_KEY`, `process.env.OLLAMA_API_KEY`, `process.env.OLLAMA_MODEL`, `process.env.OLLAMA_BASE_URL`. Global `fetch` (Node 18+ built-in).
- Produces (consumed by Task 3):
  - `async function callLLMJSON({ system, user, maxTokens = 4096 })` → `Promise<any>` (parsed JSON — array or object, whatever the LLM returned).
  - `function currentProviderLabel()` → `string`, e.g. `"anthropic (claude-sonnet-4-6)"` or `"ollama (gpt-oss:120b-cloud)"`, for the progress log line.
- Also exported (used only by this task's own tests): `stripJsonFence(text)`, `resolveProvider(env)`, `callAnthropic({system, user, maxTokens})`, `callOllama({system, user})`.

- [ ] **Step 1: Write the failing test file**

Create `scripts/llm-client.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `node --test scripts/llm-client.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/llm-client.mjs'` (module doesn't exist yet).

- [ ] **Step 3: Implement `scripts/llm-client.mjs`**

```js
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
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `node --test scripts/llm-client.test.mjs`
Expected: All tests pass (13 pass, 0 fail).

- [ ] **Step 5: Commit**

```bash
git add scripts/llm-client.mjs scripts/llm-client.test.mjs
git commit -m "feat: add llm-client.mjs with Anthropic/Ollama Cloud provider dispatch

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Wire `summarize-changelog.mjs` and `group-feature-journeys.mjs` to use `llm-client.mjs`

**Files:**
- Modify: `scripts/summarize-changelog.mjs` (imports, remove internal `callClaude`, batch-loop call site)
- Modify: `scripts/group-feature-journeys.mjs` (imports, remove internal `callClaude`, per-category call site)

**Interfaces:**
- Consumes: `callLLMJSON({ system, user, maxTokens })` and `currentProviderLabel()` from `./llm-client.mjs` (Task 2).

- [ ] **Step 1: Edit `scripts/summarize-changelog.mjs` imports**

Add after the existing imports (after `import path from 'node:path';`):

```js
import { callLLMJSON, currentProviderLabel } from './llm-client.mjs';
```

- [ ] **Step 2: Remove the internal `callClaude` function from `scripts/summarize-changelog.mjs`**

Delete this entire function (currently lines 71–96):

```js
async function callClaude(batch, categories) {
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
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(batch, categories) }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const cleaned = text.replace(/^```json\s*|```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}
```

- [ ] **Step 3: Update the batch-loop call site in `summarizeChangelog`**

Replace:
```js
  for (const [i, batch] of batches.entries()) {
    console.log(`Batch ${i + 1}/${batches.length} (${batch.length} entries)...`);
    const results = await callClaude(batch, taxonomy.categories);
```
With:
```js
  for (const [i, batch] of batches.entries()) {
    console.log(`Batch ${i + 1}/${batches.length} (${batch.length} entries)... [${currentProviderLabel()}]`);
    const results = await callLLMJSON({
      system: SYSTEM_PROMPT,
      user: buildUserMessage(batch, taxonomy.categories),
    });
```

- [ ] **Step 4: Verify `scripts/summarize-changelog.mjs` syntax**

Run: `node --check scripts/summarize-changelog.mjs`
Expected: no output, exit code 0.

- [ ] **Step 5: Edit `scripts/group-feature-journeys.mjs` imports**

Add after the existing imports (after `import path from 'node:path';`):

```js
import { callLLMJSON, currentProviderLabel } from './llm-client.mjs';
```

- [ ] **Step 6: Remove the internal `callClaude` function from `scripts/group-feature-journeys.mjs`**

Delete this entire function (currently lines 85–112):

```js
async function callClaude(candidates) {
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
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Danh sách change trong cùng 1 category (JSON array, ${candidates.length} phần tử):\n${JSON.stringify(candidates, null, 2)}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return JSON.parse(text.replace(/^```json\s*|```\s*$/g, '').trim());
}
```

- [ ] **Step 7: Update the per-category call site in `groupFeatureJourneys`**

Replace:
```js
    console.log(`Category "${category}": ${candidates.length} candidate changes...`);
    const journeys = await callClaude(candidates);
```
With:
```js
    console.log(`Category "${category}": ${candidates.length} candidate changes... [${currentProviderLabel()}]`);
    const journeys = await callLLMJSON({
      system: SYSTEM_PROMPT,
      user: `Danh sách change trong cùng 1 category (JSON array, ${candidates.length} phần tử):\n${JSON.stringify(candidates, null, 2)}`,
    });
```

- [ ] **Step 8: Verify `scripts/group-feature-journeys.mjs` syntax**

Run: `node --check scripts/group-feature-journeys.mjs`
Expected: no output, exit code 0.

- [ ] **Step 9: End-to-end wiring smoke test for `summarize-changelog.mjs` — no real API call**

Uses `data/parsed/1.29.json` produced in Task 1, Step 6. Run with `LLM_PROVIDER=ollama` and deliberately no `OLLAMA_API_KEY`, to prove the new code path is actually reached (import resolves, provider dispatch picks Ollama, fail-fast error fires) without spending any real API call:

```bash
LLM_PROVIDER=ollama node scripts/summarize-changelog.mjs 1.29
```
Expected: exits non-zero, prints `OLLAMA_API_KEY not set` (from `callOllama`, reached via `callLLMJSON` inside the batch loop). This confirms the import + dispatch wiring works end-to-end for the Ollama path without any network call.

Then confirm the Anthropic path is still reachable the same way:
```bash
LLM_PROVIDER=anthropic node scripts/summarize-changelog.mjs 1.29
```
Expected: exits non-zero, prints `ANTHROPIC_API_KEY not set`.

- [ ] **Step 10: End-to-end wiring smoke test for `group-feature-journeys.mjs` — no real API call**

`groupFeatureJourneys()` only calls the LLM for categories with ≥ 2 candidate changes, so create a throwaway fixture with 2 changes sharing a category, run the smoke test, then delete the fixture (it must not get committed — `data/versions/` is otherwise empty until a real `summarize` run populates it for real):

```bash
cat > data/versions/1.29.json << 'EOF'
{
  "version": "1.29",
  "release_date": null,
  "changes": [
    { "id": "fixture-a", "title": "Fixture A", "category": "networking", "summary": "s", "why_it_matters": "w", "breaking_change": false, "is_milestone": false, "feature_journey_id": null, "source_url": "https://example.com", "reviewed_by_human": false },
    { "id": "fixture-b", "title": "Fixture B", "category": "networking", "summary": "s", "why_it_matters": "w", "breaking_change": false, "is_milestone": false, "feature_journey_id": null, "source_url": "https://example.com", "reviewed_by_human": false }
  ]
}
EOF
LLM_PROVIDER=ollama node scripts/group-feature-journeys.mjs
```
Expected: exits non-zero, prints `OLLAMA_API_KEY not set`. Confirms the import + dispatch wiring works end-to-end for `group-feature-journeys.mjs` too.

Clean up the fixture immediately after (must not be committed as if it were real data):
```bash
rm data/versions/1.29.json
```

- [ ] **Step 11: Run the full test suite one more time to confirm nothing regressed**

Run: `npm test`
Expected: all `llm-client.test.mjs` tests still pass.

- [ ] **Step 12: Commit**

```bash
git add scripts/summarize-changelog.mjs scripts/group-feature-journeys.mjs
git commit -m "feat: wire summarize-changelog and group-feature-journeys to llm-client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## After this plan

- Real backfill run (`ANTHROPIC_API_KEY=... node scripts/run-backfill.mjs` or `LLM_PROVIDER=ollama OLLAMA_API_KEY=... node scripts/run-backfill.mjs`) is intentionally **not** part of this plan — per `CLAUDE.md`, test 1 version by hand first and review `data/versions/1.29.json` before trusting a full backfill.
- Frontend (Overview map / Timeline / Feature Journey) is a separate brainstorming pass, to happen after real data exists — see the design spec's "Ngoài phạm vi" section.
