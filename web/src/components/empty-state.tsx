export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24 text-center">
      <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
      {hint && (
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400 dark:text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}
