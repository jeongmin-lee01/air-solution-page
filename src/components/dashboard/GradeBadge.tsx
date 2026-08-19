import { GRADE_META, MISSING_META } from "@/lib/grade";
import type { Grade } from "@/types/air-quality";

interface GradeBadgeProps {
  grade: Grade | null;
  variant?: "solid" | "soft";
  className?: string;
}

export function GradeBadge({ grade, variant = "soft", className = "" }: GradeBadgeProps) {
  const meta = grade ? GRADE_META[grade] : null;
  const label = meta ? meta.label : MISSING_META.label;
  const colorClass = meta
    ? variant === "solid"
      ? meta.solidClass
      : meta.softClass
    : variant === "solid"
      ? MISSING_META.solidClass
      : MISSING_META.softClass;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
