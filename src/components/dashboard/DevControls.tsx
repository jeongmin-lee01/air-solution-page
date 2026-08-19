"use client";

import { SCENARIOS } from "@/mocks/scenarios";
import type { Scenario } from "@/types/air-quality";

interface DevControlsProps {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
}

/** 데모/QA 전용 패널 — F-04 상태들을 실제로 트리거해 확인하기 위한 스위치. 프로덕션 UI가 아님. */
export function DevControls({ scenario, onChange }: DevControlsProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-300 bg-white p-3 shadow-lg">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        데모용 상태 전환 (F-04)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              scenario === s.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
