#!/usr/bin/env node
/**
 * Stage 3 of the pipeline: take data/parsed/{version}.json (raw, unlabeled
 * changelog entries) and call an LLM (via scripts/llm-client.mjs) to produce
 * data/versions/{version}.json matching the project's committed schema:
 * category, summary, why_it_matters, breaking_change, is_milestone.
 *
 * feature_journey_id is intentionally left null here — that's pass 2
 * (a separate script, cross-version linking) and out of scope for this file.
 *
 * Usage: OLLAMA_API_KEY=... node summarize-changelog.mjs 1.29
 *        ANTHROPIC_API_KEY=... node summarize-changelog.mjs 1.29   (fallback provider)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { callLLM } from './llm-client.mjs';

const PARSED_DIR = path.resolve('data/parsed');
const OUT_DIR = path.resolve('data/versions');
const TAXONOMY_PATH = path.resolve('data/taxonomy.json');

// Batch size: gom nhiều entry vào 1 call để tối ưu chi phí, thay vì
// 1 call/entry. 15 là điểm cân bằng giữa context length và số lượng call.
const BATCH_SIZE = 15;

const SYSTEM_PROMPT = `Bạn là biên tập viên kỹ thuật cho một trang web dạy Kubernetes qua lịch sử changelog.

Nhiệm vụ: với mỗi entry changelog thô được cung cấp, sinh ra 1 object JSON theo đúng schema bên dưới. CHỈ được dùng thông tin có trong "raw_text", "source_section", và "sigs" của entry đó — KHÔNG được bổ sung chi tiết kỹ thuật, số liệu, hay ngữ cảnh nào không xuất hiện trong text gốc. Nếu không đủ thông tin để viết why_it_matters có ý nghĩa, hãy trả về why_it_matters ngắn gọn dựa sát nội dung raw_text, không suy diễn.

Schema mỗi object:
{
  "id": string,              // slug ngắn gọn, kebab-case, duy nhất trong batch, dựa trên nội dung chính (vd "gateway-api-ga")
  "title": string,           // tiêu đề ngắn gọn (tối đa ~10 từ), tóm tắt đúng raw_text, tiếng Việt hoặc giữ thuật ngữ kỹ thuật tiếng Anh nếu là tên riêng (Gateway API, CRD, RBAC...)
  "category": string,        // BẮT BUỘC chọn đúng 1 giá trị trong danh sách category hợp lệ được cung cấp — không tự bịa category mới
  "summary": string,         // 2-3 câu, diễn giải lại raw_text bằng ngôn ngữ dễ hiểu hơn cho người học, không thêm chi tiết ngoài raw_text
  "why_it_matters": string,  // 1-2 câu giải thích tại sao thay đổi này quan trọng — chỉ suy luận hợp lý trực tiếp từ raw_text, không suy diễn xa
  "breaking_change": boolean,  // true nếu raw_text đề cập tới removal, migration bắt buộc, thay đổi hành vi mặc định, hoặc "since v1.29" kiểu removal
  "is_milestone": boolean,     // true CHỈ KHI raw_text nói rõ về GA (general availability), stable graduation, hoặc ra mắt 1 feature lớn mới — không đánh dấu milestone cho bugfix nhỏ
  "source_pr_number": number   // copy lại pr_number của entry gốc, dùng để đối chiếu ngược
}

Nếu 1 entry chỉ là bugfix nhỏ, không đáng đưa vào 1 trang học K8s (vd fix log message, fix flaky test), trả về null thay vì object cho entry đó — không phải mọi entry raw đều cần xuất hiện trên site.

Trả về JSON array, đúng thứ tự với input, độ dài bằng số entry đầu vào (bao gồm cả null). Không thêm text nào ngoài JSON array. Không dùng markdown code fence.`;

async function loadTaxonomy() {
  const raw = await fs.readFile(TAXONOMY_PATH, 'utf-8');
  return JSON.parse(raw);
}

function buildUserMessage(batch, categories) {
  const categoryList = categories.map((c) => `- ${c.id}: ${c.label}`).join('\n');
  const entriesPayload = batch.map((e, i) => ({
    index: i,
    source_section: e.source_section,
    raw_text: e.raw_text,
    sigs: e.sigs,
    pr_number: e.pr_number,
  }));
  return `Danh sách category hợp lệ (chỉ được chọn từ đây):
${categoryList}

Entries cần xử lý (JSON array, ${batch.length} phần tử):
${JSON.stringify(entriesPayload, null, 2)}`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function callLLMForBatch(batch, categories) {
  return callLLM(SYSTEM_PROMPT, buildUserMessage(batch, categories));
}

const CATEGORY_IDS_CACHE = { value: null };

function validateEntry(entry, categoryIds, sourceEntry, version) {
  if (entry === null) return null;
  const errors = [];
  if (!entry.id || typeof entry.id !== 'string') errors.push('missing id');
  if (!entry.title) errors.push('missing title');
  if (!categoryIds.has(entry.category)) errors.push(`invalid category "${entry.category}"`);
  if (!entry.summary) errors.push('missing summary');
  if (typeof entry.breaking_change !== 'boolean') errors.push('breaking_change not boolean');
  if (typeof entry.is_milestone !== 'boolean') errors.push('is_milestone not boolean');
  if (errors.length) {
    console.warn(`  [skip] PR #${sourceEntry.pr_number}: ${errors.join(', ')}`);
    return null;
  }
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    summary: entry.summary,
    why_it_matters: entry.why_it_matters ?? '',
    breaking_change: entry.breaking_change,
    is_milestone: entry.is_milestone,
    feature_journey_id: null, // filled in by pass 2 (group-feature-journeys.mjs)
    source_url: sourceEntry.pr_url ?? `https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-${version}.md`,
    reviewed_by_human: false,
  };
}

export async function summarizeChangelog(version) {
  const parsedPath = path.join(PARSED_DIR, `${version}.json`);
  const parsed = JSON.parse(await fs.readFile(parsedPath, 'utf-8'));
  const taxonomy = await loadTaxonomy();
  const categoryIds = new Set(taxonomy.categories.map((c) => c.id));

  const batches = chunk(parsed.entries, BATCH_SIZE);
  const changes = [];
  const seenIds = new Set();

  for (const [i, batch] of batches.entries()) {
    console.log(`Batch ${i + 1}/${batches.length} (${batch.length} entries)...`);
    const results = await callLLMForBatch(batch, taxonomy.categories);
    if (results.length !== batch.length) {
      console.warn(`  [warn] batch returned ${results.length} results for ${batch.length} entries — skipping mismatched batch`);
      continue;
    }
    results.forEach((r, idx) => {
      const validated = validateEntry(r, categoryIds, batch[idx], version);
      if (!validated) return;
      // De-dupe id collisions across batches by suffixing.
      let id = validated.id;
      let suffix = 2;
      while (seenIds.has(id)) id = `${validated.id}-${suffix++}`;
      seenIds.add(id);
      changes.push({ ...validated, id });
    });
  }

  const releaseDate = null; // TODO: derive from GitHub release metadata in a later step
  const result = { version, release_date: releaseDate, changes };

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${version}.json`);
  await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Wrote ${changes.length} changes -> ${outPath} (from ${parsed.entries.length} raw entries)`);
  return result;
}

// CLI entry
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: OLLAMA_API_KEY=... node summarize-changelog.mjs <minor-version>');
    process.exit(1);
  }
  summarizeChangelog(version).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
