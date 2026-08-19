import { GRADE_META, gradeForPM10, gradeForPM25, worseGrade } from "@/lib/grade";
import { GradeBadge } from "./GradeBadge";
import { formatMeasuredAt } from "@/lib/format";
import type { SidoSnapshot } from "@/types/air-quality";

interface DetailStatsProps {
  sido: SidoSnapshot;
}

export function DetailStats({ sido }: DetailStatsProps) {
  const grade10 = gradeForPM10(sido.latestPm10);
  const grade25 = gradeForPM25(sido.latestPm25);
  const overall = worseGrade(grade10, grade25);
  const bothMissing = sido.latestPm10 === null && sido.latestPm25 === null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="PM10" value={sido.latestPm10} grade={grade10} />
        <StatBlock label="PM2.5" value={sido.latestPm25} grade={grade25} />
      </div>

      <p className="text-sm text-gray-500">
        {sido.latestMeasuredAt
          ? formatMeasuredAt(sido.latestMeasuredAt)
          : "측정 데이터 없음"}
      </p>

      {bothMissing ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500">
          측정 데이터 없음
        </p>
      ) : (
        overall && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {GRADE_META[overall].guide}
          </p>
        )
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  grade,
}: {
  label: string;
  value: number | null;
  grade: ReturnType<typeof gradeForPM10>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm font-medium text-gray-500">측정 데이터 없음</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
            {value}
            <span className="ml-1 text-xs font-normal text-gray-500">㎍/㎥</span>
          </p>
          <GradeBadge grade={grade} className="mt-1" />
        </>
      )}
    </div>
  );
}
