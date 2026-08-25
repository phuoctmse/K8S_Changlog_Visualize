# K8s Changelog Visualizer

Website tổng hợp thay đổi Kubernetes (v1.0 → hiện tại) qua Overview map,
Timeline mode, và Feature Journey. Xem [`docs/proposal.md`](docs/proposal.md)
để hiểu kiến trúc, pipeline và schema dữ liệu đầy đủ.

## Setup

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

Script không tự đọc `.env` — export trước khi chạy:

```bash
export $(cat .env | xargs)
```

## Chạy pipeline

```bash
# Test 1 version trước khi backfill hàng loạt (luôn làm bước này trước)
node scripts/fetch-changelog.mjs 1.29
node scripts/parse-changelog.mjs 1.29
node scripts/summarize-changelog.mjs 1.29
# -> kiểm tra data/versions/1.29.json bằng tay trước khi backfill hàng loạt

# Backfill toàn bộ v1.0 -> v1.36 + group feature journeys
node scripts/run-backfill.mjs

# Backfill 1 khoảng version
node scripts/run-backfill.mjs --from 1.20 --to 1.25

# Backfill nhưng bỏ qua group feature journey (chạy riêng sau)
node scripts/run-backfill.mjs --skip-journeys
node scripts/group-feature-journeys.mjs
```

`run-backfill.mjs` resumable — chạy lại y hệt lệnh cũ nếu bị dừng giữa chừng,
nó tự skip version/bước đã có file output trên disk.

## Cấu trúc

```
scripts/    pipeline: fetch -> parse -> summarize -> group-feature-journeys -> run-backfill
data/
  taxonomy.json           category cố định
  raw/{version}.md         (gitignored) output bước fetch
  parsed/{version}.json    output bước parse
  versions/{version}.json  output bước summarize — schema chính, dùng cho frontend
  feature-journeys/{id}.json output bước group-feature-journeys
docs/proposal.md  kiến trúc, schema, quyết định đã chốt
```
