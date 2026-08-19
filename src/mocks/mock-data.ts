import { SIDO_LIST, MOCK_NOW } from "@/lib/constants";
import { normalizeReading } from "@/lib/grade";
import { findLatestMeasured } from "@/lib/snapshot";
import type { HourlyPoint, Scenario, SidoSnapshot, Snapshot } from "@/types/air-quality";

/** 시드 기반 PRNG — 새로고침해도 값이 재현되도록 함 (데모/스크린샷 안정성) */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// 원시값(문자열/음수 등)이 섞여 있다가 normalizeReading으로 정규화되는 과정을 시연하기 위한 타입
type RawValue = number | string | null;

interface RawSeries {
  time: string;
  pm10: RawValue;
  pm25: RawValue;
}

function buildRawSeries(sidoId: string): RawSeries[] {
  const rng = mulberry32(hashSeed(sidoId));
  const baselinePm10 = 20 + rng() * 90; // 20~110 baseline
  const baselinePm25 = baselinePm10 * (0.45 + rng() * 0.15);

  let pm10 = baselinePm10;
  let pm25 = baselinePm25;

  const points: RawSeries[] = [];

  for (let i = 23; i >= 0; i--) {
    const time = new Date(MOCK_NOW.getTime() - i * 60 * 60 * 1000).toISOString();
    pm10 = Math.max(3, pm10 + (rng() - 0.5) * 18);
    pm25 = Math.max(2, pm25 + (rng() - 0.5) * 10);

    points.push({
      time,
      pm10: Math.round(pm10),
      pm25: Math.round(pm25),
    });
  }

  // --- 의도적 결측 주입 (§7.5 시연) ---

  if (sidoId === "sejong") {
    // 세종: 결측 빈도가 높은 지역 (§7.6-6)
    const rngMiss = mulberry32(hashSeed(sidoId + "-missing"));
    points.forEach((p) => {
      if (rngMiss() < 0.4) p.pm10 = "-";
      if (rngMiss() < 0.4) p.pm25 = "점검중";
    });
  }

  if (sidoId === "gangwon") {
    // 단발성 결측 구간 → 그래프 끊김 시연 (F-03-4)
    points[10].pm10 = null;
    points[10].pm25 = null;
    points[11].pm10 = null;
  }

  if (sidoId === "jeonnam") {
    points[15].pm10 = "";
    points[15].pm25 = "통신장애";
  }

  if (sidoId === "chungnam") {
    // 원시값에 음수/문자열이 섞여도 정규화되는 과정을 보여줌
    points[3].pm10 = -5;
    points[6].pm25 = "0";
  }

  if (sidoId === "jeju") {
    // 최신 값만 결측 → F-04-3 "N시간 전 데이터" 배지가 항상 뜨도록
    points[22].pm10 = null;
    points[22].pm25 = null;
    points[23].pm10 = null;
    points[23].pm25 = null;
  }

  return points;
}

function toHourlyPoints(raw: RawSeries[]): HourlyPoint[] {
  return raw.map((p) => ({
    time: p.time,
    hour: new Date(p.time).getHours().toString().padStart(2, "0") + ":00",
    pm10: normalizeReading(p.pm10),
    pm25: normalizeReading(p.pm25),
  }));
}

function buildSidoSnapshot(sidoId: string, name: string): SidoSnapshot {
  const raw = buildRawSeries(sidoId);
  const series = toHourlyPoints(raw);
  const latest = findLatestMeasured(series);

  return {
    id: sidoId as SidoSnapshot["id"],
    name,
    series,
    latestPm10: latest.pm10,
    latestPm25: latest.pm25,
    latestMeasuredAt: latest.measuredAt,
  };
}

/** §8.1: 페이지 진입 시 1회 구성 → 이후 칩 전환은 클라이언트 메모리에서 처리 */
export function buildMockSnapshot(scenario: Scenario): Snapshot {
  const sidos = SIDO_LIST.map((s) => buildSidoSnapshot(s.id, s.name));

  if (scenario === "accumulating") {
    // F-03-5: 배포 직후 — 확보된 구간만 표시
    const trimmed = sidos.map((s) => ({
      ...s,
      series: s.series.slice(-6),
    }));
    return { generatedAt: MOCK_NOW.toISOString(), sidos: trimmed, source: "mock" };
  }

  if (scenario === "staleExternal") {
    // F-04-3: 외부 API 장애 — 전 지역의 최신 데이터가 N시간 전 것으로 고정
    const staleHours = 4;
    const staleSidos = sidos.map((s) => {
      const trimmedSeries = s.series.slice(0, s.series.length - staleHours);
      const latest = findLatestMeasured(trimmedSeries);
      return {
        ...s,
        series: trimmedSeries,
        latestPm10: latest.pm10,
        latestPm25: latest.pm25,
        latestMeasuredAt: latest.measuredAt,
      };
    });
    return { generatedAt: MOCK_NOW.toISOString(), sidos: staleSidos, source: "mock" };
  }

  if (scenario === "staleBanner") {
    // F-04-4: 스냅샷 자체가 1시간 이상 갱신되지 않음
    const staleGeneratedAt = new Date(MOCK_NOW.getTime() - 2 * 60 * 60 * 1000);
    return { generatedAt: staleGeneratedAt.toISOString(), sidos, source: "mock" };
  }

  return { generatedAt: MOCK_NOW.toISOString(), sidos, source: "mock" };
}
