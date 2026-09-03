export default function SampleDataBanner() {
  return (
    <div className="border-b border-[color-mix(in_srgb,var(--milestone)_35%,var(--border))] bg-[color-mix(in_srgb,var(--milestone)_12%,transparent)]">
      <div className="mx-auto flex w-full max-w-[1180px] items-start gap-3 px-5 py-3 text-[13px] leading-relaxed sm:px-8">
        <svg
          viewBox="0 0 24 24"
          className="mt-px h-4 w-4 flex-none text-[var(--milestone)]"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 8.2v4.6M12 16.2h.01M10.6 3.9 2.5 18.1a1.6 1.6 0 0 0 1.4 2.4h16.2a1.6 1.6 0 0 0 1.4-2.4L13.4 3.9a1.6 1.6 0 0 0-2.8 0Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-[var(--muted)]">
          <strong className="font-semibold text-[var(--text)]">Đang hiển thị dữ liệu mẫu.</strong>{' '}
          <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[12px]">
            data/versions/
          </code>{' '}
          còn trống nên site đang đọc từ{' '}
          <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[12px]">
            data/sample/
          </code>
          . Chạy{' '}
          <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[12px]">
            npm run backfill
          </code>{' '}
          với API key để thay bằng dữ liệu thật.
        </p>
      </div>
    </div>
  );
}
