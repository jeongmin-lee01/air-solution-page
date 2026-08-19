import { forwardRef } from "react";
import { DetailStats } from "./DetailStats";
import { TrendChart } from "./TrendChart";
import { StaleBadge } from "./StaleBadge";
import type { SidoSnapshot } from "@/types/air-quality";

interface DetailPanelProps {
  sido: SidoSnapshot;
  staleHours: number;
}

export const DetailPanel = forwardRef<HTMLDivElement, DetailPanelProps>(function DetailPanel(
  { sido, staleHours },
  ref
) {
  return (
    <div ref={ref} className="rounded-xl border border-gray-200 bg-white p-5" tabIndex={-1}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">{sido.name}</h2>
        <StaleBadge hours={staleHours} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailStats sido={sido} />
        <TrendChart sido={sido} />
      </div>
    </div>
  );
});
