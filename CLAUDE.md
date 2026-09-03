# CLAUDE.md — hướng dẫn cho Claude Code CLI

## Bối cảnh dự án
Website tổng hợp toàn bộ thay đổi Kubernetes (v1.0 → hiện tại), có Overview map
(Concept + Changes toggle), Timeline mode, Feature Journey. Data pipeline tự động
fetch changelog chính thức từ `kubernetes/kubernetes`, dùng Claude API để
summarize/categorize/group. Xem `docs/proposal.md` để hiểu đầy đủ kiến trúc,
schema, và các quyết định đã chốt (đừng đổi hướng những gì đã quyết định ở đó
mà không hỏi lại).

Phase 1 (đang làm): Overview map + Timeline + Feature Journey — KHÔNG làm Learn mode.

## Cấu trúc thư mục
```
k8s-changelog-viz/
├── docs/
│   └── proposal.md          # bản thảo đầy đủ — đọc trước khi sửa gì lớn
├── scripts/
│   ├── fetch-changelog.mjs       # bước 1: tải CHANGELOG-x.y.md từ GitHub
│   ├── parse-changelog.mjs       # bước 2: parse thô, chưa gọi Claude API
│   ├── summarize-changelog.mjs   # bước 3: LLM API — category/summary/why_it_matters
│   ├── group-feature-journeys.mjs # bước 4: LLM API — nối change qua nhiều version
│   ├── llm-client.mjs            # LLM provider abstraction — Anthropic Claude hoặc Ollama Cloud, chọn qua LLM_PROVIDER
│   ├── llm-client.test.mjs       # unit test cho llm-client.mjs
│   └── run-backfill.mjs          # orchestrator: chạy tuần tự cả 33+ version
├── data/
│   ├── taxonomy.json         # category cố định — SỬA Ở ĐÂY nếu cần thêm category
│   ├── concepts.json         # bản đồ khái niệm cho Concept view — biên soạn tay, CHƯA review
│   ├── raw/{version}.md      # output bước 1
│   ├── parsed/{version}.json # output bước 2
│   ├── versions/{version}.json # output bước 3 (schema chính, dùng cho frontend)
│   ├── feature-journeys/{id}.json # output bước 4
│   └── sample/               # data mẫu để frontend render khi chưa chạy pipeline
├── app/                      # Next.js App Router — 3 view của Phase 1
│   ├── page.tsx              # Overview map (toggle Concept / Changes)
│   ├── timeline/page.tsx     # Timeline mode
│   └── journeys/             # Feature Journey: danh sách + trang chi tiết [id]
├── components/               # UI dùng chung (ChangeCard, OverviewMap, TimelineView...)
├── lib/
│   ├── types.ts              # type phản chiếu schema pipeline
│   ├── data.ts               # đọc data lúc build; fallback sang data/sample/
│   └── format.ts             # helper format ngày, nhãn category, nhãn stage
├── next.config.mjs           # output: 'export' — build ra HTML tĩnh trong out/
├── package.json
├── .env.example                # mẫu — copy thành .env rồi điền key
└── .env                       # KHÔNG commit — chứa ANTHROPIC_API_KEY và/hoặc OLLAMA_*
```

## Setup lần đầu
```bash
cd k8s-changelog-viz
npm init -y   # nếu package.json chưa có, đã kèm sẵn ở đây rồi thì bỏ qua
cp .env.example .env   # điền ANTHROPIC_API_KEY (mặc định) hoặc LLM_PROVIDER=ollama + OLLAMA_API_KEY
echo ".env" >> .gitignore
echo "data/raw/" >> .gitignore   # raw markdown to, không cần commit
```

`.env.example` đã liệt kê sẵn `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `OLLAMA_API_KEY`,
`OLLAMA_MODEL`, `OLLAMA_BASE_URL` — copy làm điểm bắt đầu thay vì gõ tay từng biến.

Các script đọc `ANTHROPIC_API_KEY` (khi dùng Claude) hoặc `OLLAMA_API_KEY` /
`OLLAMA_MODEL` / `OLLAMA_BASE_URL` (khi dùng Ollama Cloud) từ biến môi trường,
không đọc `.env` tự động — export trước khi chạy hoặc dùng `dotenv-cli`. Biến
`LLM_PROVIDER` (mặc định `anthropic`, có thể đặt `ollama`) chọn provider nào
được dùng — xem `scripts/llm-client.mjs`:
```bash
npm install -D dotenv-cli
# rồi chạy: npx dotenv -- node scripts/run-backfill.mjs
```
Hoặc đơn giản hơn: `export $(cat .env | xargs)` trước khi chạy.

## Lệnh chạy cơ bản
```bash
# Test 1 version trước khi backfill hàng loạt (khuyến nghị luôn làm bước này)
ANTHROPIC_API_KEY=sk-ant-... node scripts/fetch-changelog.mjs 1.29
node scripts/parse-changelog.mjs 1.29
ANTHROPIC_API_KEY=sk-ant-... node scripts/summarize-changelog.mjs 1.29
# -> kiểm tra data/versions/1.29.json bằng tay trước khi tin tưởng chạy hàng loạt

# Tương tự nhưng dùng Ollama Cloud thay vì Claude (LLM_PROVIDER=ollama)
node scripts/fetch-changelog.mjs 1.29
node scripts/parse-changelog.mjs 1.29
LLM_PROVIDER=ollama OLLAMA_API_KEY=... node scripts/summarize-changelog.mjs 1.29

# Backfill toàn bộ 33+ version (v1.0 -> v1.36) + group feature journeys
ANTHROPIC_API_KEY=sk-ant-... node scripts/run-backfill.mjs

# Backfill 1 khoảng version cụ thể (đỡ tốn nếu chỉ muốn test 1 dải)
ANTHROPIC_API_KEY=sk-ant-... node scripts/run-backfill.mjs --from 1.20 --to 1.25

# Backfill nhưng bỏ qua bước group feature journey (chạy riêng sau)
ANTHROPIC_API_KEY=sk-ant-... node scripts/run-backfill.mjs --skip-journeys
ANTHROPIC_API_KEY=sk-ant-... node scripts/group-feature-journeys.mjs
```

## Lệnh chạy frontend
```bash
npm install          # lần đầu
npm run dev          # dev server http://localhost:3000
npm run build        # build tĩnh -> out/ (output: 'export', deploy được lên GitHub Pages)
npm start            # xem thử bản đã build trong out/
npm run lint         # tsc --noEmit
```

Frontend đọc data **lúc build**, không gọi API runtime:

- Ưu tiên `data/versions/` + `data/feature-journeys/` (output thật của pipeline).
- Nếu `data/versions/` còn trống thì tự rơi về `data/sample/` và hiện banner cảnh
  báo trên site. Data mẫu cố tình KHÔNG nằm trong `data/versions/` vì
  `run-backfill.mjs` resume dựa trên sự tồn tại của file — ghi vào đó sẽ khiến
  backfill lặng lẽ skip đúng những version đấy.
- Sau khi backfill xong, chạy lại `npm run build` để site cập nhật.

Concept view đọc `data/concepts.json` — file này biên soạn tay theo tài liệu
chính thức của Kubernetes, KHÔNG phải output LLM, và đang mang
`reviewed_by_human: false`.

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

**3. Khi sửa frontend, đi qua `lib/data.ts` thay vì đọc file trực tiếp:**
Mọi view đều lấy data qua `getDataset()` — hàm này lo phần chọn giữa data thật và
data mẫu, sort version theo số (để `1.9` đứng trước `1.10`), và làm phẳng change
kèm version. Đọc thẳng `fs` trong component sẽ phá cơ chế fallback đó.
```
claude "Thêm bộ lọc theo SIG vào Timeline, lấy data qua getDataset() trong lib/data.ts"
```

Màu theo category không hardcode trong component: gắn `data-cat="<category id>"`
lên element cha, mọi thứ bên trong đọc `var(--cat)`. Bảng màu nằm ở
`app/globals.css` (có cả biến cho dark mode).

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
- [ ] Backfill thật 33+ version (v1.0 → v1.36) — CHƯA chạy, cần API key
- [x] Frontend: Overview map (Concept + Changes toggle), Timeline mode, Feature Journey view
- [x] Concept view — đã dựng UI + `data/concepts.json`, nhưng nội dung CHƯA ai review
- [ ] Review data mẫu / concept map trước khi publish (xem mục 5 bên trên)
- [ ] Pipeline tự động (GitHub Actions) cho version mới
- [ ] Learn mode (Phase 2, chưa bắt đầu)
