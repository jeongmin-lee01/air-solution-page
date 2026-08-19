"use client";

import { useCallback, useEffect, useState } from "react";
import { buildMockSnapshot } from "@/mocks/mock-data";
import type { Scenario, Snapshot } from "@/types/air-quality";

interface UseSnapshotResult {
  snapshot: Snapshot | null;
  loading: boolean;
  error: boolean;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  retry: () => void;
}

const DEMO_DELAY_MS = 600;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * §8.1: 페이지 진입 시 스냅샷을 1회 구성해 클라이언트 메모리에 보관한다.
 * 이후 시도(칩) 전환은 이 훅을 다시 호출하지 않고 컴포넌트 로컬 상태로만 처리한다.
 *
 * scenario === "normal"일 때만 실제 /api/snapshot(자체 서버, 내부에서 AirKorea 실시간 조회 +
 * 캐시/폴백 처리)을 호출한다. 나머지 데모 시나리오(F-04 시연용)는 결정적인 화면을 보장하기 위해
 * 계속 로컬 mock을 사용한다.
 */
export function useSnapshot(): UseSnapshotResult {
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // 새 요청(시나리오 변경/재시도)이 들어오면 렌더 단계에서 loading/error를 리셋한다.
  const requestKey = `${scenario}:${attempt}`;
  const [handledKey, setHandledKey] = useState<string | null>(null);
  if (handledKey !== requestKey) {
    setHandledKey(requestKey);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (scenario === "ownApiError") {
        await wait(DEMO_DELAY_MS);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      if (scenario !== "normal") {
        await wait(DEMO_DELAY_MS);
        if (!cancelled) {
          setSnapshot(buildMockSnapshot(scenario));
          setLoading(false);
        }
        return;
      }

      // 외부(AirKorea) API 장애는 /api/snapshot 내부에서 캐시/mock으로 흡수된다.
      // 여기서 에러가 나면 "우리 서버 자체"가 응답하지 않는 경우다 (F-04-2).
      try {
        const res = await fetch("/api/snapshot", { cache: "no-store" });
        if (!res.ok) throw new Error(`snapshot fetch failed: ${res.status}`);
        const data = (await res.json()) as Snapshot;
        if (!cancelled) {
          setSnapshot(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [scenario, attempt]);

  const retry = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);

  return { snapshot, loading, error, scenario, setScenario, retry };
}
