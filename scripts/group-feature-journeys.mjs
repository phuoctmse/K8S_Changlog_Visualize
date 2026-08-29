#!/usr/bin/env node
/**
 * Stage 4 of the pipeline: read ALL data/versions/{version}.json files
 * (output of stage 3 / summarize-changelog.mjs), ask the Claude API to
 * identify changes that belong to the same underlying feature across
 * multiple versions, and write data/feature-journeys/{id}.json per the
 * committed schema (id, title, category, description, milestones[]).
 *
 * Also back-fills feature_journey_id into the source version files so
 * Timeline mode can link a single change to its full journey.
 *
 * Why Claude API instead of keyword matching: feature names drift across
 * versions ("Ingress" -> "Gateway API", "PodSecurityPolicy" -> "Pod
 * Security Standards") so naive string matching on title/summary misses
 * the connections that make Feature Journey worth building at all.
 * Keyword overlap is used only as a pre-filter to keep each API call's
 * candidate set small, not as the final grouping decision.
 *
 * Usage: ANTHROPIC_API_KEY=... node group-feature-journeys.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callLLMJSON, currentProviderLabel } from './llm-client.mjs';

const VERSIONS_DIR = path.resolve('data/versions');
const JOURNEYS_DIR = path.resolve('data/feature-journeys');

const VALID_STAGES = ['alpha', 'problem', 'solution', 'ga', 'deprecated'];

const SYSTEM_PROMPT = `Bạn là biên tập viên kỹ thuật, nhiệm vụ: tìm các change (đến từ nhiều version Kubernetes khác nhau) cùng thuộc về MỘT feature/mạch chuyện xuyên suốt, rồi viết narrative "problem -> solution -> outcome" cho từng mốc.

Chỉ nhóm các change khi chúng THỰC SỰ nói về cùng 1 feature đang tiến hoá (vd Ingress annotation rời rạc -> Gateway API alpha -> Gateway API GA). KHÔNG nhóm chỉ vì cùng category (vd đừng nhóm mọi thứ "networking" lại làm 1 journey — chỉ nhóm khi cùng 1 mạch tiến hoá cụ thể).

Với mỗi group tìm được, output object theo schema:
{
  "id": string,              // slug, vd "ingress-to-gateway-api"
  "title": string,           // vd "Ingress → Gateway API"
  "category": string,        // category chung của journey (lấy từ category của các change thành viên)
  "description": string,     // 1 câu mô tả cả hành trình
  "milestones": [
    {
      "version": string,           // vd "1.21"
      "stage": "alpha" | "problem" | "solution" | "ga" | "deprecated",
      "narrative": string,         // 1-2 câu: vấn đề gì / giải quyết ra sao / kết quả gì tại mốc này — CHỈ dựa trên summary/why_it_matters của change gốc, không suy diễn thêm
      "change_id": string          // id của change gốc tương ứng (bắt buộc phải khớp đúng id đã cho trong input)
    }
  ]
}

Chỉ trả về group có từ 2 mốc trở lên (1 change đơn lẻ không phải là "journey"). Không tự bịa version hay change_id không có trong input. Trả về JSON array các journey object. Không thêm text ngoài JSON, không dùng markdown fence.`;

async function loadAllChanges() {
  const files = (await fs.readdir(VERSIONS_DIR)).filter((f) => f.endsWith('.json'));
  const all = [];
  for (const file of files) {
    const data = JSON.parse(await fs.readFile(path.join(VERSIONS_DIR, file), 'utf-8'));
    for (const c of data.changes) {
      all.push({
        version: data.version,
        change_id: c.id,
        category: c.category,
        title: c.title,
        summary: c.summary,
        why_it_matters: c.why_it_matters,
      });
    }
  }
  return all;
}

/**
 * Cheap pre-filter so each Claude API call only sees a plausible candidate
 * set instead of every change ever recorded. Groups by category first
 * (a journey never spans categories), then relies on the model itself to
 * decide which same-category changes actually belong to one journey.
 */
function groupByCategory(changes) {
  const byCategory = new Map();
  for (const c of changes) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category).push(c);
  }
  return byCategory;
}

function validateJourney(journey, validChangeIds) {
  const errors = [];
  if (!journey.id) errors.push('missing id');
  if (!journey.title) errors.push('missing title');
  if (!Array.isArray(journey.milestones) || journey.milestones.length < 2) {
    errors.push('needs >= 2 milestones');
  } else {
    for (const m of journey.milestones) {
      if (!VALID_STAGES.includes(m.stage)) errors.push(`invalid stage "${m.stage}"`);
      if (!validChangeIds.has(m.change_id)) errors.push(`unknown change_id "${m.change_id}"`);
    }
  }
  if (errors.length) {
    console.warn(`  [skip] journey "${journey.id ?? '?'}": ${errors.join(', ')}`);
    return false;
  }
  return true;
}

export async function groupFeatureJourneys() {
  const changes = await loadAllChanges();
  const validChangeIds = new Set(changes.map((c) => c.change_id));
  const byCategory = groupByCategory(changes);

  const allJourneys = [];
  for (const [category, candidates] of byCategory) {
    if (candidates.length < 2) continue; // can't form a journey from 1 change
    console.log(`Category "${category}": ${candidates.length} candidate changes... [${currentProviderLabel()}]`);
    const journeys = await callLLMJSON({
      system: SYSTEM_PROMPT,
      user: `Danh sách change trong cùng 1 category (JSON array, ${candidates.length} phần tử):\n${JSON.stringify(candidates, null, 2)}`,
    });
    for (const j of journeys) {
      if (validateJourney(j, validChangeIds)) allJourneys.push(j);
    }
  }

  await fs.mkdir(JOURNEYS_DIR, { recursive: true });
  for (const journey of allJourneys) {
    const outPath = path.join(JOURNEYS_DIR, `${journey.id}.json`);
    await fs.writeFile(outPath, JSON.stringify(journey, null, 2), 'utf-8');
  }
  console.log(`Wrote ${allJourneys.length} feature journeys -> ${JOURNEYS_DIR}`);

  // Back-fill feature_journey_id into the source version files.
  const changeToJourney = new Map();
  for (const j of allJourneys) {
    for (const m of j.milestones) changeToJourney.set(m.change_id, j.id);
  }
  const versionFiles = (await fs.readdir(VERSIONS_DIR)).filter((f) => f.endsWith('.json'));
  for (const file of versionFiles) {
    const filePath = path.join(VERSIONS_DIR, file);
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    let touched = false;
    for (const c of data.changes) {
      const jid = changeToJourney.get(c.id);
      if (jid && c.feature_journey_id !== jid) {
        c.feature_journey_id = jid;
        touched = true;
      }
    }
    if (touched) await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
  console.log('Back-filled feature_journey_id into version files.');

  return allJourneys;
}

// CLI entry
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  groupFeatureJourneys().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
