export default function StatTile({
  value,
  label,
  hint,
  accent,
}: {
  value: string | number;
  label: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="surface p-4">
      <div
        className="font-mono text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[13px] font-medium">{label}</div>
      {hint && <div className="mt-0.5 text-[12px] text-[var(--faint)]">{hint}</div>}
    </div>
  );
}
