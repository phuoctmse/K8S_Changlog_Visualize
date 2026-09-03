import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="surface mt-10 px-6 py-20 text-center">
      <p className="font-mono text-[13px] text-[var(--faint)]">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Không tìm thấy trang này</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        Đường dẫn có thể đã đổi, hoặc hành trình tính năng bạn tìm chưa có trong dữ liệu hiện tại.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Về trang tổng quan
      </Link>
    </div>
  );
}
