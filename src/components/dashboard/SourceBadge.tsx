import type { Snapshot } from "@/types/air-quality";

const LABEL: Record<NonNullable<Snapshot["source"]>, { text: string; className: string }> = {
  live: { text: "실시간 API", className: "bg-emerald-100 text-emerald-800" },
  cache: { text: "캐시된 데이터", className: "bg-sky-100 text-sky-800" },
  mock: { text: "mock 데이터", className: "bg-gray-100 text-gray-600" },
};

/** 검증/디버깅용: 지금 화면이 어느 출처의 데이터를 쓰고 있는지 표시 (프로덕션 UI 요소 아님) */
export function SourceBadge({ source }: { source: NonNullable<Snapshot["source"]> }) {
  const meta = LABEL[source];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
      {meta.text}
    </span>
  );
}
