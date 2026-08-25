import type { JourneyStage } from "@/lib/types";

const STAGE_LABEL: Record<JourneyStage, string> = {
  problem: "Vấn đề",
  alpha: "Alpha",
  solution: "Giải pháp",
  ga: "GA",
  deprecated: "Deprecated",
};

const STAGE_CLASSES: Record<JourneyStage, string> = {
  problem: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  alpha: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  solution: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  ga: "bg-green-500/10 text-green-700 dark:text-green-400",
  deprecated: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function StageBadge({ stage }: { stage: JourneyStage }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_CLASSES[stage]}`}
    >
      {STAGE_LABEL[stage] ?? stage}
    </span>
  );
}
