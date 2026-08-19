import type { HourlyPoint } from "@/types/air-quality";

/**
 * §7.5 원칙: 결측 슬롯이 이어져도 "마지막으로 실제 측정된 시각"을 별도로 추적한다.
 * mock 데이터와 실 API 응답 양쪽에서 공통으로 사용.
 */
export function findLatestMeasured(series: HourlyPoint[]): {
  pm10: number | null;
  pm25: number | null;
  measuredAt: string | null;
} {
  const latest = series[series.length - 1];

  let measuredAt: string | null = null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].pm10 !== null || series[i].pm25 !== null) {
      measuredAt = series[i].time;
      break;
    }
  }

  return {
    pm10: latest?.pm10 ?? null,
    pm25: latest?.pm25 ?? null,
    measuredAt,
  };
}
