# Dữ liệu mẫu (sample data)

Thư mục này chứa **dữ liệu biên soạn thủ công**, KHÔNG phải output của pipeline.

Mục đích: frontend có thứ để render ngay khi mới clone repo, trước khi ai đó
chạy `run-backfill.mjs` với API key thật.

- Cấu trúc file trùng khớp `data/versions/` và `data/feature-journeys/` để
  frontend chỉ cần một code path duy nhất.
- Nội dung dựa trên các mốc lịch sử Kubernetes đã được công bố rộng rãi, nhưng
  **chưa qua review** — mọi record đều mang `reviewed_by_human: false`.
- Cố tình để ở đây thay vì `data/versions/` vì `run-backfill.mjs` là *resumable*
  dựa trên sự tồn tại của file: ghi data mẫu vào `data/versions/` sẽ khiến
  backfill lặng lẽ bỏ qua đúng những version đó.

Frontend tự động chuyển sang dùng `data/versions/` ngay khi thư mục đó có file,
và hiện banner cảnh báo khi đang chạy trên data mẫu. Xem `lib/data.ts`.
