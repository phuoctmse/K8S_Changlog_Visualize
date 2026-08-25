import type { Category } from "@/lib/types";
import { colorClasses } from "@/lib/colors";

export function CategoryBadge({ category }: { category: Category | undefined }) {
  if (!category) return null;
  const c = colorClasses(category.color);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.bgSoft} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.bg}`} />
      {category.label}
    </span>
  );
}
