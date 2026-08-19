"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SidoChip } from "./SidoChip";
import type { SidoId, SidoSnapshot } from "@/types/air-quality";

interface SidoChipGridProps {
  sidos: SidoSnapshot[];
  selectedId: SidoId;
  onSelect: (id: SidoId) => void;
}

// 프로토타입 한계: 실제 렌더된 열 수 대신 뷰포트 폭으로 근사 계산 (방향키 상하 이동용)
function getColumnCount(width: number): number {
  if (width < 640) return 2;
  if (width < 768) return 3;
  if (width < 1024) return 4;
  if (width < 1025) return 5;
  return 6;
}

export function SidoChipGrid({ sidos, selectedId, onSelect }: SidoChipGridProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [columns, setColumns] = useState(6);

  useEffect(() => {
    function update() {
      setColumns(getColumnCount(window.innerWidth));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const selectedIndex = sidos.findIndex((s) => s.id === selectedId);

  const focusIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(sidos.length - 1, index));
      onSelect(sidos[clamped].id);
      requestAnimationFrame(() => refs.current[clamped]?.focus());
    },
    [sidos, onSelect]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusIndex(index + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusIndex(index - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusIndex(index + columns);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusIndex(index - columns);
        break;
    }
  }

  return (
    <div
      role="grid"
      aria-label="전국 시도별 미세먼지 현황"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1025px]:grid-cols-6 gap-2"
    >
      {sidos.map((sido, index) => (
        <SidoChip
          key={sido.id}
          ref={(el) => {
            refs.current[index] = el;
          }}
          sido={sido}
          selected={sido.id === selectedId}
          tabIndex={index === selectedIndex ? 0 : -1}
          onSelect={() => onSelect(sido.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        />
      ))}
    </div>
  );
}
