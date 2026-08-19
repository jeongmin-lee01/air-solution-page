import { forwardRef } from "react";
import { chipGrade, GRADE_META, MISSING_META } from "@/lib/grade";
import type { SidoSnapshot } from "@/types/air-quality";

interface SidoChipProps {
  sido: SidoSnapshot;
  selected: boolean;
  tabIndex: number;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export const SidoChip = forwardRef<HTMLButtonElement, SidoChipProps>(function SidoChip(
  { sido, selected, tabIndex, onSelect, onKeyDown },
  ref
) {
  const grade = chipGrade(sido.latestPm10, sido.latestPm25);
  const meta = grade ? GRADE_META[grade] : null;
  const isMissing = grade === null;

  const pm10Label = sido.latestPm10 === null ? "–" : `${sido.latestPm10}`;

  return (
    <button
      ref={ref}
      type="button"
      role="gridcell"
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      aria-selected={selected}
      aria-label={`${sido.name}, ${meta ? meta.label : MISSING_META.label}, PM10 ${pm10Label}`}
      className={[
        "flex min-h-[44px] min-w-[44px] flex-col items-start gap-1 rounded-xl border-2 px-3 py-2.5 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
        isMissing ? "bg-gray-100" : (meta?.softClass ?? ""),
        selected
          ? "border-indigo-600 shadow-md ring-1 ring-indigo-600"
          : "border-transparent hover:border-gray-300",
      ].join(" ")}
    >
      <span className="text-sm font-semibold text-gray-900">{sido.name}</span>
      <span className="flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums text-gray-900">{pm10Label}</span>
        <span className="text-[11px] text-gray-500">㎍/㎥</span>
      </span>
      <span
        className={`text-[11px] font-medium ${
          isMissing ? "text-gray-500" : ""
        }`}
      >
        {meta ? meta.label : MISSING_META.label}
      </span>
    </button>
  );
});
