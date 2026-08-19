"use client";

import { useRef, useState } from "react";
import { SidoChipGrid } from "@/components/dashboard/SidoChipGrid";
import { DetailPanel } from "@/components/dashboard/DetailPanel";
import { SkeletonGrid } from "@/components/dashboard/SkeletonGrid";
import { SkeletonPanel } from "@/components/dashboard/SkeletonPanel";
import { ErrorRetry } from "@/components/dashboard/ErrorRetry";
import { StaleBanner } from "@/components/dashboard/StaleBanner";
import { DevControls } from "@/components/dashboard/DevControls";
import { SourceBadge } from "@/components/dashboard/SourceBadge";
import { useSnapshot } from "@/hooks/useSnapshot";
import { MOCK_NOW } from "@/lib/constants";
import { hoursSince } from "@/lib/format";
import type { SidoId } from "@/types/air-quality";

const DEFAULT_SIDO: SidoId = "seoul";

export default function Home() {
  const { snapshot, loading, error, scenario, setScenario } = useSnapshot();
  const [selectedId, setSelectedId] = useState<SidoId>(DEFAULT_SIDO);
  const detailRef = useRef<HTMLDivElement>(null);

  function handleSelect(id: SidoId) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1024px)").matches) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  const selectedSido = snapshot?.sidos.find((s) => s.id === selectedId) ?? null;
  // mock 시나리오는 고정된 MOCK_NOW를 기준으로 만들어져 있고, 실 API 데이터는 실제 현재 시각과 비교해야 한다.
  const referenceNow = snapshot?.source === "mock" ? MOCK_NOW : new Date();
  const bannerStale = snapshot ? hoursSince(snapshot.generatedAt, referenceNow) >= 1 : false;
  const staleHours = selectedSido?.latestMeasuredAt
    ? hoursSince(selectedSido.latestMeasuredAt, referenceNow)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-xl font-bold text-gray-900">전국 시도별 미세먼지</h1>
        <p className="text-sm text-gray-500">
          지역 칩을 눌러 현재 농도와 24시간 추이를 확인하세요.
        </p>
        {snapshot?.source && <SourceBadge source={snapshot.source} />}
      </header>

      {!loading && !error && bannerStale && <StaleBanner />}

      {error ? (
        <ErrorRetry onRetry={() => setScenario("normal")} />
      ) : (
        <div className="flex flex-col gap-6 min-[1025px]:flex-row min-[1025px]:items-start">
          <div className="min-[1025px]:w-[58%]">
            {loading || !snapshot ? (
              <SkeletonGrid />
            ) : (
              <SidoChipGrid
                sidos={snapshot.sidos}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </div>

          <div className="min-[1025px]:flex-1">
            {loading || !snapshot || !selectedSido ? (
              <SkeletonPanel />
            ) : (
              <DetailPanel ref={detailRef} sido={selectedSido} staleHours={staleHours} />
            )}
          </div>
        </div>
      )}

      <DevControls scenario={scenario} onChange={setScenario} />
    </div>
  );
}
