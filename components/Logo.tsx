export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 2.2 27.5 8.6v14.8L16 29.8 4.5 23.4V8.6L16 2.2Z"
        stroke="var(--accent)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.3" fill="var(--accent)" />
      <path
        d="M16 6.6v5M16 20.4v5M24.2 11.2 19.4 14M12.6 18 7.8 20.8M24.2 20.8 19.4 18M12.6 14 7.8 11.2"
        stroke="var(--accent)"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.62"
      />
    </svg>
  );
}
