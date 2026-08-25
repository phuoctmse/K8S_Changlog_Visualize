# Kubernetes Changelog Visualizer — Proposal

> Tài liệu này được dựng lại từ những gì đã có sẵn trong code (`scripts/*.mjs`,
> `data/taxonomy.json`) tại thời điểm bắt đầu dự án — CLAUDE.md tham chiếu tới
> file này nhưng nó chưa tồn tại trong repo. Phần **Pipeline** và **Schema dữ
> liệu** dưới đây là ghi lại đúng những gì code đang làm (không phải quyết định
> mới). Phần **Frontend / UI** vẫn còn TBD — chưa có quyết định nào được chốt,
> cần thảo luận thêm trước khi implement.

## 1. Mục tiêu

Website tổng hợp toàn bộ thay đổi Kubernetes từ v1.0 đến hiện tại, giúp người
học hiểu **cái gì đã thay đổi** và **tại sao nó quan trọng**, thay vì đọc raw
changelog khô khan.

Phase 1 (đang làm): Overview map + Timeline mode + Feature Journey.
Không làm Learn mode ở phase này.

## 2. Kiến trúc pipeline dữ liệu

4 bước tuần tự, mỗi bước đọc output của bước trước, ghi ra `data/`:

```
fetch-changelog.mjs        (1) tải CHANGELOG-x.y.md raw từ kubernetes/kubernetes
      ↓
parse-changelog.mjs        (2) parse thô thành entries theo section, KHÔNG gọi LLM API
      ↓
summarize-changelog.mjs    (3) LLM API — category / summary / why_it_matters / breaking_change / is_milestone
      ↓
group-feature-journeys.mjs (4) LLM API — nối các change cùng 1 mạch tiến hoá xuyên version
```

Bước 3 và 4 gọi qua `scripts/llm-client.mjs` — provider được chọn bằng biến môi
trường, không hard-code trong từng script:

- `OLLAMA_API_KEY` set → Ollama Cloud (`https://ollama.com/api/chat`), model
  mặc định `gpt-oss:120b` (đổi qua `OLLAMA_MODEL`).
- Không có `OLLAMA_API_KEY` nhưng có `ANTHROPIC_API_KEY` → fallback sang Claude
  API (`claude-sonnet-4-6`).

Model open-weight (qua Ollama) có độ chính xác JSON/structured-output và chất
lượng tiếng Việt kém ổn định hơn Claude — luôn test 1 version bằng tay
(mục "Lệnh chạy cơ bản" trong README) và đọc kỹ `data/versions/{version}.json`
trước khi tin tưởng chạy `run-backfill.mjs` cho cả 33+ version.

`run-backfill.mjs` là orchestrator chạy (1)→(2)→(3) tuần tự cho tất cả version
(v1.0 → v1.36), sau đó chạy (4) một lần. Resumable: mỗi bước skip nếu file
output đã tồn tại trên disk.

### 2.1. Bước 1 — fetch

Tải `CHANGELOG/CHANGELOG-{version}.md` từ nhánh `master` của
`kubernetes/kubernetes`, lưu nguyên văn vào `data/raw/{version}.md`
(không commit — quá to, không cần thiết).

Version < ~1.3 không có file changelog ở path này (repo layout thời đó khác) —
orchestrator coi 404 là "not applicable", skip version đó chứ không fail cứng.

### 2.2. Bước 2 — parse

Lấy đúng section "## Changelog since v{x}.{y-1}.0" **cuối cùng** trong file
(section gốc của cả minor release — các section "since vX.Y.Z" khác là patch
release, nằm phía trên do bị prepend theo thời gian).

Chỉ giữ lại các sub-section có giá trị cho một trang học K8s:
`Deprecation`, `API Change`, `Feature`, `Bug or Regression`, `Documentation`,
`Urgent Upgrade Notes`. Bỏ qua `Downloads`, `Dependencies`, `Container Images`,
`Failing Test`, `Other/Cleanup`, `Uncategorized`.

Mỗi bullet top-level (`- `) là 1 entry; sub-bullet/indented line thuộc về entry
cha, không tách riêng. Trailing marker `([#PR](url), [@author](url)) [SIG ...]`
được bóc ra thành metadata riêng.

Output: `data/parsed/{version}.json`, KHÔNG chứa category/summary — thuần parse.

### 2.3. Bước 3 — summarize (LLM API)

Gom entries thành batch (15 entry/batch) để tiết kiệm số lượng API call. Với
mỗi entry, model chỉ được dùng thông tin có sẵn trong `raw_text` /
`source_section` / `sigs` — không được bịa thêm chi tiết kỹ thuật không có
trong text gốc. Entry là bugfix nhỏ không đáng lên site (fix log message, fix
flaky test...) → model trả `null`, bị loại khỏi output.

Output: `data/versions/{version}.json` — schema ở mục 4.1.

`feature_journey_id` để `null` ở bước này — được bước 4 back-fill sau.

### 2.4. Bước 4 — group feature journeys (LLM API)

Đọc toàn bộ `data/versions/*.json`, pre-filter theo category (một journey
không bao giờ nhảy category), rồi hỏi Claude trong từng category: những change
nào thực sự thuộc cùng 1 mạch tiến hoá (vd "Ingress annotation rời rạc →
Gateway API alpha → Gateway API GA")? Chỉ nhóm theo mạch chuyện cụ thể, KHÔNG
nhóm chỉ vì trùng category.

Output: `data/feature-journeys/{id}.json` (mỗi journey ≥ 2 milestone) — schema
ở mục 4.2. Đồng thời back-fill `feature_journey_id` vào các file
`data/versions/{version}.json` tương ứng.

## 3. Taxonomy category (`data/taxonomy.json`)

Danh sách category cố định, sửa ở đây nếu cần thêm/bớt (và phải cập nhật cả
`SYSTEM_PROMPT` trong `summarize-changelog.mjs` nếu category list đổi nhiều):

| id | label |
|---|---|
| networking | Networking |
| security | Security / RBAC |
| storage | Storage |
| scheduling | Scheduling |
| container-runtime | Container runtime |
| observability | Observability |
| api-extensibility | API / Extensibility |

## 4. Schema dữ liệu chi tiết

### 4.1. `data/versions/{version}.json`

```jsonc
{
  "version": "1.29",
  "release_date": null,        // TODO: chưa derive từ GitHub release metadata
  "changes": [
    {
      "id": "gateway-api-ga",          // slug, duy nhất trong version
      "title": "Gateway API graduates to GA",
      "category": "networking",         // phải khớp id trong taxonomy.json
      "summary": "...",                 // 2-3 câu
      "why_it_matters": "...",          // 1-2 câu
      "breaking_change": false,
      "is_milestone": false,
      "feature_journey_id": null,       // back-fill bởi group-feature-journeys.mjs
      "source_url": "https://github.com/kubernetes/kubernetes/pull/...",
      "reviewed_by_human": false        // xem mục 5 — bắt buộc review trước publish
    }
  ]
}
```

### 4.2. `data/feature-journeys/{id}.json`

```jsonc
{
  "id": "ingress-to-gateway-api",
  "title": "Ingress → Gateway API",
  "category": "networking",
  "description": "...",             // 1 câu mô tả cả hành trình
  "milestones": [
    {
      "version": "1.21",
      "stage": "alpha",              // alpha | problem | solution | ga | deprecated
      "narrative": "...",            // 1-2 câu, dựa trên summary/why_it_matters gốc
      "change_id": "gateway-api-alpha" // phải khớp id trong data/versions/{version}.json
    }
  ]
}
```

## 5. Review / publish

Không tự động publish thẳng data mới chạy pipeline. Trước khi publish:

1. Spot-check các node ở Concept view.
2. Xác nhận `is_milestone: true` cho các milestone lớn — set
   `reviewed_by_human: true` sau khi người thật xem qua.
3. Không có cam kết 0% sai sót — pipeline dùng LLM, luôn cần review thủ công
   trước khi lên production.

## 6. Frontend / UI — TBD

Chưa có quyết định chi tiết nào được chốt cho phần frontend. Theo CLAUDE.md,
scope Phase 1 gồm 3 view:

- **Overview map**: có toggle Concept view / Changes view (chi tiết UI/UX
  chưa thiết kế).
- **Timeline mode**: duyệt theo version, filter theo category
  (`data/taxonomy.json`).
- **Feature Journey**: hiển thị `data/feature-journeys/{id}.json` dạng
  narrative xuyên version.

Stack, routing, component structure, v.v. chưa được quyết định — cần thảo
luận và chốt trước khi implement, rồi cập nhật lại mục này.
