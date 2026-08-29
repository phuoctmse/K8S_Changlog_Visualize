# Thiết kế: Sửa cấu trúc pipeline + thêm Ollama Cloud làm LLM provider thay thế

**Ngày:** 2026-08-29
**Trạng thái:** Đã duyệt bởi user, chuẩn bị lên kế hoạch implement.

## Bối cảnh

Pipeline 4 bước (fetch → parse → summarize → group-feature-journeys) đã được code
đầy đủ và đúng logic, nhưng đang lệch với cấu trúc thư mục mô tả trong
`CLAUDE.md`:

- Các file `.mjs` và `taxonomy.json` nằm ở root repo, trong khi `package.json`
  và `CLAUDE.md` giả định chúng nằm trong `scripts/` và `data/`.
- Chưa có `.env.example`/`.gitignore` cho secrets và `data/raw/`.
- `summarize-changelog.mjs` và `group-feature-journeys.mjs` hardcode gọi thẳng
  Anthropic API (`fetch` tới `api.anthropic.com`), không có cách chọn provider
  khác.

`docs/proposal.md` mà `CLAUDE.md` yêu cầu đọc trước khi sửa lớn **chưa tồn tại**
trong repo. Việc này nằm ngoài phạm vi thiết kế này (xem "Ngoài phạm vi" bên
dưới) — không tự bịa lại toàn bộ proposal, chỉ ghi nhận để làm riêng sau nếu
cần.

## Mục tiêu

1. Sắp xếp lại file đúng cấu trúc đã chốt trong `CLAUDE.md`, không đổi logic
   nghiệp vụ của 4 script hiện có.
2. Thêm tuỳ chọn dùng **Ollama Cloud** (qua API key) làm provider LLM thay thế
   cho Anthropic Claude API, chọn được qua biến môi trường, không phải sửa code
   mỗi lần đổi provider.
3. Không phá vỡ khả năng resume của `run-backfill.mjs` và không đổi schema
   output (`data/versions/{version}.json`, `data/feature-journeys/{id}.json`).

## Ngoài phạm vi

- Viết lại/tạo mới `docs/proposal.md`.
- Frontend (Next.js) — Overview map / Timeline / Feature Journey UI.
- Chạy backfill thật (tốn API call thật) — chỉ test 1 version khi có key, theo
  đúng cam kết trong `CLAUDE.md`.
- Hỗ trợ Ollama local/self-host (chỉ làm Ollama Cloud lần này; thiết kế để
  `OLLAMA_BASE_URL` override được cho tương lai, nhưng không test/triển khai
  local trong lần này).

## Kiến trúc

### 1. Cấu trúc thư mục

```
k8s-changelog-viz/
├── scripts/
│   ├── fetch-changelog.mjs
│   ├── parse-changelog.mjs
│   ├── summarize-changelog.mjs
│   ├── group-feature-journeys.mjs
│   ├── run-backfill.mjs
│   └── llm-client.mjs        # mới
├── data/
│   ├── taxonomy.json         # move từ root
│   ├── raw/                  # gitignored
│   ├── parsed/
│   ├── versions/
│   └── feature-journeys/
├── package.json              # path scripts không đổi (đã đúng scripts/*)
├── .env.example               # mới
└── .gitignore                 # mới
```

Di chuyển file thuần tuý (`git mv`), không sửa nội dung logic bên trong các
script hiện có — mọi `path.resolve('data/...')` là tương đối theo CWD (thư mục
chạy lệnh `node`), không theo vị trí file, nên việc move không làm hỏng đường
dẫn miễn là các lệnh vẫn được chạy từ root repo (đúng như hướng dẫn trong
`CLAUDE.md`).

### 2. `scripts/llm-client.mjs` — lớp trừu tượng chọn provider

Export một hàm duy nhất dùng chung cho cả 2 script gọi LLM:

```js
export async function callLLMJSON({ system, user, maxTokens = 4096 }) {
  const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
  const text = provider === 'ollama'
    ? await callOllama({ system, user, maxTokens })
    : await callAnthropic({ system, user, maxTokens });
  const cleaned = text.replace(/^```json\s*|```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}
```

- **`callAnthropic`**: giữ nguyên logic hiện có trong 2 script — yêu cầu
  `ANTHROPIC_API_KEY` (throw rõ ràng nếu thiếu), model `claude-sonnet-4-6`,
  `POST https://api.anthropic.com/v1/messages`.
- **`callOllama`**: gọi Ollama Cloud.
  - Yêu cầu `OLLAMA_API_KEY`, throw rõ ràng nếu thiếu (fail fast, trước khi
    gọi mạng).
  - `OLLAMA_MODEL` mặc định `gpt-oss:120b-cloud`, override qua env.
  - `OLLAMA_BASE_URL` mặc định `https://ollama.com`, override được (cho
    self-host tương lai, không test trong lần này).
  - `POST ${OLLAMA_BASE_URL}/api/chat`, header
    `Authorization: Bearer ${OLLAMA_API_KEY}`, body:
    ```json
    {
      "model": "<OLLAMA_MODEL>",
      "messages": [
        { "role": "system", "content": "<system>" },
        { "role": "user", "content": "<user>" }
      ],
      "stream": false,
      "format": "json"
    }
    ```
  - Lấy text kết quả từ `data.message.content`.
  - Lỗi HTTP không ok → throw kèm status + body, cùng format với nhánh
    Anthropic hiện tại.

**Sửa `summarize-changelog.mjs` và `group-feature-journeys.mjs`:**
- Xoá hàm `callClaude` nội bộ trong cả 2 file.
- `import { callLLMJSON } from './llm-client.mjs'`.
- Gọi `callLLMJSON({ system: SYSTEM_PROMPT, user: <message đã build> })` thay
  cho lời gọi `callClaude` cũ — trả thẳng object/array đã parse (loại bỏ luôn
  bước `JSON.parse` lặp lại ở 2 nơi, gộp vào `llm-client.mjs`).
- Thêm 1 dòng log ở đầu quá trình xử lý mỗi version/category, in ra provider +
  model đang dùng (vd `Provider: ollama (gpt-oss:120b-cloud)`), để luôn biết
  đang tốn phí ở đâu khi chạy backfill thật.
- Logic `validateEntry` / `validateJourney` (kiểm tra category hợp lệ, schema
  đúng, bỏ qua entry lỗi) giữ nguyên 100% — không phụ thuộc provider, vẫn là
  lớp bảo vệ chất lượng chung cho output của bất kỳ LLM nào.

### 3. Config

**`.env.example`** (commit được, không chứa secret thật):

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

**`.gitignore`** (mới):

```
node_modules/
.env
data/raw/
```

`data/parsed/`, `data/versions/`, `data/feature-journeys/` vẫn được commit
(output đã qua review con người, đúng tinh thần CLAUDE.md). `data/raw/` là
markdown thô tải từ GitHub, không cần commit.

**`package.json`**: không sửa các script hiện có (`fetch`, `parse`,
`summarize`, `journeys`, `backfill`) — chúng đã trỏ đúng `scripts/*.mjs`, chỉ
cần file thật được move vào đúng chỗ. Thêm `dotenv-cli` vào `devDependencies`
(CLAUDE.md đã nhắc tới `npx dotenv --` trong hướng dẫn setup).

## Kế hoạch test

Không tốn API call thật cho tới khi user xác nhận key sẵn sàng và yêu cầu chạy:

1. Sau khi move file: chạy `node scripts/fetch-changelog.mjs 1.29` và
   `node scripts/parse-changelog.mjs 1.29` — không cần key nào, xác nhận
   restructure không vỡ đường dẫn, tạo được `data/parsed/1.29.json` thật.
2. Kiểm tra cú pháp `llm-client.mjs` (vd `node --check`) để bắt lỗi sớm mà
   không cần gọi mạng.
3. KHÔNG tự động chạy `summarize-changelog.mjs`, `group-feature-journeys.mjs`,
   hay `run-backfill.mjs` với key thật trừ khi user cung cấp key và yêu cầu rõ
   ràng — đúng cam kết đã chốt trong `CLAUDE.md` ("đừng để Claude Code tự chạy
   run-backfill.mjs ngay sau khi sửa code liên quan tới API call").

## Rủi ro / lưu ý

- Chưa xác nhận 100% shape response thật của Ollama Cloud API (tài liệu công
  khai có thể thay đổi) — nếu lần test đầu tiên với key thật thất bại vì shape
  response khác giả định (`data.message.content`), sẽ cần điều chỉnh
  `callOllama` dựa trên response thật, không phải lỗi thiết kế nghiêm trọng vì
  đã tách riêng thành 1 hàm nhỏ, dễ sửa.
- `format: 'json'` ép Ollama trả JSON thuần — nếu model được chọn không hỗ trợ
  tốt structured output, có thể cần thử model khác qua `OLLAMA_MODEL` (đã thiết
  kế để override dễ dàng, không cần sửa code).
