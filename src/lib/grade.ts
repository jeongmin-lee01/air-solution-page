import { PM10_THRESHOLDS, PM25_THRESHOLDS } from "./constants";
import type { Grade } from "@/types/air-quality";

const MISSING_STRINGS = new Set([
  "-",
  "–",
  "—",
  "",
  "통신장애",
  "점검중",
  "null",
]);

/**
 * §7.5 결측 판정: 하이픈류/공백/특정 문자열/null/NaN/음수/숫자 0 은 모두 결측(null)로 정규화.
 * 규칙 R-02: 0은 실무상 실제 측정값일 수 없으므로 결측으로 간주한다.
 */
export function normalizeReading(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (MISSING_STRINGS.has(trimmed)) return null;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return null;
    return normalizeNumber(parsed);
  }

  if (typeof raw === "number") {
    if (Number.isNaN(raw)) return null;
    return normalizeNumber(raw);
  }

  return null;
}

function normalizeNumber(value: number): number | null {
  if (value < 0) return null;
  if (value === 0) return null; // R-02
  return value;
}

export function gradeForPM10(value: number | null): Grade | null {
  if (value === null) return null;
  if (value <= PM10_THRESHOLDS.good) return "good";
  if (value <= PM10_THRESHOLDS.moderate) return "moderate";
  if (value <= PM10_THRESHOLDS.bad) return "bad";
  return "veryBad";
}

export function gradeForPM25(value: number | null): Grade | null {
  if (value === null) return null;
  if (value <= PM25_THRESHOLDS.good) return "good";
  if (value <= PM25_THRESHOLDS.moderate) return "moderate";
  if (value <= PM25_THRESHOLDS.bad) return "bad";
  return "veryBad";
}

const SEVERITY: Record<Grade, number> = {
  good: 0,
  moderate: 1,
  bad: 2,
  veryBad: 3,
};

export function worseGrade(
  a: Grade | null,
  b: Grade | null
): Grade | null {
  if (a === null) return b;
  if (b === null) return a;
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

/**
 * 칩 대표 등급 계산 (R-01 + 결측 폴백).
 * 둘 다 결측 → null(회색), 하나만 결측 → 정상인 항목 기준, 둘 다 정상 → 더 나쁜 등급.
 */
export function chipGrade(
  pm10: number | null,
  pm25: number | null
): Grade | null {
  const g10 = gradeForPM10(pm10);
  const g25 = gradeForPM25(pm25);
  if (g10 === null && g25 === null) return null;
  if (g10 === null) return g25;
  if (g25 === null) return g10;
  return worseGrade(g10, g25);
}

interface GradeMeta {
  label: string;
  /** 칩/배지 배경+텍스트 (진한 배경 + 흰 텍스트, WCAG AA 4.5:1 이상) */
  solidClass: string;
  /** 옅은 배경 + 진한 텍스트 (상세 패널 등에서 사용) */
  softClass: string;
  guide: string;
}

export const GRADE_META: Record<Grade, GradeMeta> = {
  good: {
    label: "좋음",
    solidClass: "bg-blue-700 text-white",
    softClass: "bg-blue-50 text-blue-800",
    guide: "실외 활동에 좋은 날씨입니다.",
  },
  moderate: {
    label: "보통",
    solidClass: "bg-green-700 text-white",
    softClass: "bg-green-50 text-green-800",
    guide: "실외 활동에 무리가 없습니다.",
  },
  bad: {
    label: "나쁨",
    solidClass: "bg-orange-600 text-white",
    softClass: "bg-orange-50 text-orange-800",
    guide: "외출 시 마스크 착용을 권장합니다.",
  },
  veryBad: {
    label: "매우나쁨",
    solidClass: "bg-red-700 text-white",
    softClass: "bg-red-50 text-red-800",
    guide: "외출을 자제하고 실내 활동을 권장합니다.",
  },
};

export const MISSING_META = {
  label: "결측",
  solidClass: "bg-gray-300 text-gray-600",
  softClass: "bg-gray-50 text-gray-500",
};
