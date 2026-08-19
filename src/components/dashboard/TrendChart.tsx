"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { PM10_THRESHOLDS } from "@/lib/constants";
import { AccumulatingNotice } from "./AccumulatingNotice";
import { ChartDataTable } from "./ChartDataTable";
import type { SidoSnapshot } from "@/types/air-quality";

interface TrendChartProps {
  sido: SidoSnapshot;
}

const PM10_COLOR = "#1d4ed8";
const PM25_COLOR = "#ea580c";

// PM10 등급 구간을 옅은 밴드로 표시 (F-03-3). 두 항목의 임계값이 서로 다르므로
// 주 지표인 PM10 기준을 배경 안내로 사용한다는 점을 범례에 명시한다.
const BANDS = [
  { y1: 0, y2: PM10_THRESHOLDS.good, color: "#3b82f6" },
  { y1: PM10_THRESHOLDS.good, y2: PM10_THRESHOLDS.moderate, color: "#22c55e" },
  { y1: PM10_THRESHOLDS.moderate, y2: PM10_THRESHOLDS.bad, color: "#f97316" },
  { y1: PM10_THRESHOLDS.bad, y2: 220, color: "#ef4444" },
];

function CustomTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-semibold text-gray-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey as string} style={{ color: entry.color }}>
          {entry.name}:{" "}
          {entry.value === null || entry.value === undefined
            ? "데이터 없음"
            : `${entry.value} ㎍/㎥`}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ sido }: TrendChartProps) {
  const [showPm10, setShowPm10] = useState(true);
  const [showPm25, setShowPm25] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const isAccumulating = sido.series.length < 24;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4">
        <ToggleChip
          active={showPm10}
          color={PM10_COLOR}
          label="PM10"
          onClick={() => setShowPm10((v) => !v)}
        />
        <ToggleChip
          active={showPm25}
          color={PM25_COLOR}
          label="PM2.5"
          onClick={() => setShowPm25((v) => !v)}
        />
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {showTable ? "표 숨기기" : "표로 보기"}
        </button>
      </div>

      {isAccumulating && <AccumulatingNotice />}

      <div className="h-64 w-full" role="img" aria-label={`${sido.name} 최근 24시간 PM10, PM2.5 추이 그래프`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sido.series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {BANDS.map((band) => (
              <ReferenceArea
                key={band.y1}
                y1={band.y1}
                y2={band.y2}
                fill={band.color}
                fillOpacity={0.08}
                strokeWidth={0}
              />
            ))}
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} width={36} domain={[0, "auto"]} />
            <Tooltip content={CustomTooltip} />
            {showPm10 && (
              <Line
                type="monotone"
                dataKey="pm10"
                name="PM10"
                stroke={PM10_COLOR}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {showPm25 && (
              <Line
                type="monotone"
                dataKey="pm25"
                name="PM2.5"
                stroke={PM25_COLOR}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable series={sido.series} sidoName={sido.name} visible={showTable} />
    </div>
  );
}

function ToggleChip({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active ? "border-gray-300 opacity-100" : "border-gray-200 opacity-40"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </button>
  );
}
