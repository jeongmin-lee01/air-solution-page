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

/**
 * §8.1: 페이지 진입 시 스냅샷을 1회 구성해 클라이언트 메모리에 보관한다.
 * 이후 시도(칩) 전환은 이 훅을 다시 호출하지 않고 컴포넌트 로컬 상태로만 처리한다.
 * mock 전용 인위적 지연으로 F-04-1 스켈레톤을 시연한다.
 */
export function useSnapshot(): UseSnapshotResult {
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // 새 요청(시나리오 변경/재시도)이 들어오면 렌더 단계에서 loading/error를 리셋한다.
  // (useEffect 안에서 동기적으로 setState하는 대신, React가 권장하는
  // "prop이 바뀌면 렌더 중 상태를 조정" 패턴을 사용)
  const requestKey = `${scenario}:${attempt}`;
  const [handledKey, setHandledKey] = useState<string | null>(null);
  if (handledKey !== requestKey) {
    setHandledKey(requestKey);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;

      if (scenario === "ownApiError") {
        setError(true);
        setLoading(false);
        return;
      }

      setSnapshot(buildMockSnapshot(scenario));
      setLoading(false);
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scenario, attempt]);

  const retry = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);

  return { snapshot, loading, error, scenario, setScenario, retry };
}
