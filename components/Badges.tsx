export function BreakingBadge() {
  return (
    <span
      className="chip"
      style={{
        color: 'var(--danger)',
        background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
        borderColor: 'color-mix(in srgb, var(--danger) 28%, transparent)',
      }}
      title="Thay đổi có thể làm hỏng cấu hình hiện tại khi nâng cấp"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <path
          d="M12 8.2v4.6M12 16.2h.01M10.6 3.9 2.5 18.1a1.6 1.6 0 0 0 1.4 2.4h16.2a1.6 1.6 0 0 0 1.4-2.4L13.4 3.9a1.6 1.6 0 0 0-2.8 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Breaking
    </span>
  );
}

export function MilestoneBadge() {
  return (
    <span
      className="chip"
      style={{
        color: 'var(--milestone)',
        background: 'color-mix(in srgb, var(--milestone) 14%, transparent)',
        borderColor: 'color-mix(in srgb, var(--milestone) 30%, transparent)',
      }}
      title="Mốc lớn: GA, stable graduation hoặc ra mắt tính năng quan trọng"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <path d="M12 2.6l2.7 5.9 6.4.8-4.7 4.4 1.2 6.4L12 16.9 6.4 20.1l1.2-6.4L2.9 9.3l6.4-.8L12 2.6Z" />
      </svg>
      Milestone
    </span>
  );
}

export function VersionBadge({ version }: { version: string }) {
  return (
    <span className="chip chip-neutral font-mono">
      v{version}
    </span>
  );
}
