# CLAUDE.md — hướng dẫn cho Claude Code CLI

## Bối cảnh dự án
Website tổng hợp toàn bộ thay đổi Kubernetes (v1.0 → hiện tại), có Overview map
(Concept + Changes toggle), Timeline mode, Feature Journey. Data pipeline tự động
fetch changelog chính thức từ `kubernetes/kubernetes`, dùng LLM API (mặc định
Ollama Cloud, xem `scripts/llm-client.mjs`) để summarize/categorize/group. Xem
`docs/proposal.md` để hiểu đầy đủ kiến trúc,
schema, và các quyết định đã chốt (đừng đổi hướng những gì đã quyết định ở đó
mà không hỏi lại).

Phase 1 (đang làm): Overview map + Timeline + Feature Journey — KHÔNG làm Learn mode.

## Cấu trúc thư mục
```
k8s-changelog-viz/
├── docs/
│   └── proposal.md          # bản thảo đầy đủ — đọc trước khi sửa gì lớn
├── scripts/
│   ├── llm-client.mjs             # LLM provider client dùng chung — Ollama Cloud (mặc định) / Claude API (fallback)
│   ├── fetch-changelog.mjs       # bước 1: tải CHANGELOG-x.y.md từ GitHub
│   ├── parse-changelog.mjs       # bước 2: parse thô, chưa gọi LLM API
│   ├── summarize-changelog.mjs   # bước 3: LLM API — category/summary/why_it_matters
│   ├── group-feature-journeys.mjs # bước 4: LLM API — nối change qua nhiều version
│   └── run-backfill.mjs          # orchestrator: chạy tuần tự cả 33+ version
├── data/
│   ├── taxonomy.json         # category cố định — SỬA Ở ĐÂY nếu cần thêm category
│   ├── raw/{version}.md      # output bước 1
│   ├── parsed/{version}.json # output bước 2
│   ├── versions/{version}.json # output bước 3 (schema chính, dùng cho frontend)
│   └── feature-journeys/{id}.json # output bước 4
├── web/                       # frontend Next.js — đọc trực tiếp từ ../data (xem docs/proposal.md mục 6)
│   └── src/
│       ├── app/               # route: / (Overview), /timeline, /journeys, /journeys/[id]
│       ├── components/
│       └── lib/                # data.ts (đọc fs), types.ts (khớp schema), colors.ts (taxonomy color -> Tailwind class)
├── package.json               # pipeline scripts — KHÔNG chung package.json với web/
└── .env                       # KHÔNG commit — chứa OLLAMA_API_KEY (hoặc ANTHROPIC_API_KEY)
```

## Setup lần đầu
```bash
cd k8s-changelog-viz
npm init -y   # nếu package.json chưa có, đã kèm sẵn ở đây rồi thì bỏ qua
echo "OLLAMA_API_KEY=..." > .env
echo "OLLAMA_MODEL=gpt-oss:120b" >> .env   # optional, đây là default nếu không set
echo ".env" >> .gitignore
echo "data/raw/" >> .gitignore   # raw markdown to, không cần commit
```

Các script đọc `OLLAMA_API_KEY` (hoặc `ANTHROPIC_API_KEY` nếu không set
`OLLAMA_API_KEY` — xem `scripts/llm-client.mjs`) từ biến môi trường, không đọc
`.env` tự động — export trước khi chạy hoặc dùng `dotenv-cli`:
```bash
npm install -D dotenv-cli
# rồi chạy: npx dotenv -- node scripts/run-backfill.mjs
```
Hoặc đơn giản hơn: `export $(cat .env | xargs)` trước khi chạy.

## Lệnh chạy cơ bản
```bash
# Test 1 version trước khi backfill hàng loạt (khuyến nghị luôn làm bước này)
node scripts/fetch-changelog.mjs 1.29
node scripts/parse-changelog.mjs 1.29
OLLAMA_API_KEY=... node scripts/summarize-changelog.mjs 1.29
# -> kiểm tra data/versions/1.29.json bằng tay trước khi tin tưởng chạy hàng loạt

# Backfill toàn bộ 33+ version (v1.0 -> v1.36) + group feature journeys
OLLAMA_API_KEY=... node scripts/run-backfill.mjs

# Backfill 1 khoảng version cụ thể (đỡ tốn nếu chỉ muốn test 1 dải)
OLLAMA_API_KEY=... node scripts/run-backfill.mjs --from 1.20 --to 1.25

# Backfill nhưng bỏ qua bước group feature journey (chạy riêng sau)
OLLAMA_API_KEY=... node scripts/run-backfill.mjs --skip-journeys
OLLAMA_API_KEY=... node scripts/group-feature-journeys.mjs
```

Script `run-backfill.mjs` **resumable** — nếu bị dừng giữa chừng (rate limit,
mất mạng), chạy lại y hệt lệnh cũ, nó tự skip version/bước đã xong (dựa vào file
đã tồn tại trên disk), không tốn lại API call.

## Cách dùng Claude Code CLI hiệu quả cho dự án này

**1. Luôn để Claude Code đọc `docs/proposal.md` trước khi giao việc mới:**
```
claude "Đọc docs/proposal.md rồi giúp t build phần frontend Timeline mode theo đúng schema đã chốt"
```

**2. Khi sửa prompt trong summarize-changelog.mjs hoặc group-feature-journeys.mjs:**
Luôn test lại với 1 version trước, đừng để Claude Code tự chạy `run-backfill.mjs`
ngay sau khi sửa prompt — vì mỗi lần backfill tốn nhiều API call thật, sửa sai
prompt mà chạy full 33 version thì tốn tiền + phải review lại toàn bộ.
```
claude "Sửa xong prompt trong summarize-changelog.mjs, giờ chạy test với version 1.29 và cho t xem output data/versions/1.29.json"
```

**3. Khi build frontend (Next.js), nhắc rõ ràng lấy data từ đâu:**
```
claude "Dựng trang Timeline mode trong Next.js, đọc data từ data/versions/*.json,
filter theo category từ data/taxonomy.json, đúng UI đã mô tả trong docs/proposal.md mục 3"
```

**4. Đừng để Claude Code tự ý đổi schema.** Nếu cần đổi field trong
`data/versions/{version}.json` hay `data/feature-journeys/{id}.json`, sửa
`docs/proposal.md` mục 4 (Schema dữ liệu chi tiết) trước, rồi mới sửa code —
để tài liệu và code không bị lệch nhau.

**5. Review việc AI generate là bắt buộc, không phải tuỳ chọn.** Trước khi
publish, cần: (a) spot-check các node Concept view, (b) xác nhận
`is_milestone: true` cho các milestone lớn qua `reviewed_by_human`, (c) không
tự động publish thẳng data mới fetch mà chưa ai xem qua — đây là cam kết đã
chốt trong proposal về việc không đảm bảo 0% sai sót.

## Trạng thái hiện tại (cập nhật thủ công khi tiến độ đổi)
- [x] Schema JSON chi tiết
- [x] Script fetch + parse (đã test thật với v1.29, v1.31)
- [x] Prompt summarize/categorize — thiết kế xong, CHƯA chạy live
- [x] Script group Feature Journey — thiết kế xong, CHƯA chạy live
- [x] Script orchestrator backfill — chưa chạy
- [ ] Backfill thật 33+ version (v1.0 → v1.36) — đang chờ OLLAMA_API_KEY (hoặc ANTHROPIC_API_KEY)
- [x] Frontend: Overview map (Changes view), Timeline mode, Feature Journey view — `web/`, đã verify bằng browser với data mẫu + empty state, CHƯA có data thật để verify với data thật
- [ ] Concept view (grounded vào K8s official docs) — chỉ có empty state, chưa có nội dung/thiết kế
- [ ] Pipeline tự động (GitHub Actions) cho version mới
- [ ] Learn mode (Phase 2, chưa bắt đầu)
