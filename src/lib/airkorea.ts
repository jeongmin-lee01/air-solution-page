import { SIDO_LIST } from "@/lib/constants";
import { normalizeReading } from "@/lib/grade";
import { findLatestMeasured } from "@/lib/snapshot";
import type { HourlyPoint, SidoSnapshot, Snapshot } from "@/types/air-quality";

// 서버 전용 모듈. 클라이언트 컴포넌트에서 import 금지 (인증키 노출 방지, §8.2).
const ENDPOINT = "https://apis.data.go.kr/B552584/ArpltnStatsSvc/getCtprvnMesureLIst";

// 실측: dataGubun=HOUR 호출 시 inqBginDt/inqEndDt(YYYYMMDD, PRD §7.1 표에는 누락되어 있었음)가
// 없으면 매번 SERVICETIMEOUT_ERROR가 난다. 값이 있으면 정상 응답한다 (§7.6-1 확인 완료).
// 실측 결과 성공률이 약 40~50% 수준으로 불안정해, 재시도 3회로 체감 성공률을 높인다.
// 정상 응답도 6~7초 걸리는 경우가 있어(직접 curl로 6.6초 확인), 타임아웃을 너무 짧게 잡으면
// 성공할 뻔한 요청을 우리 쪽에서 먼저 끊어버리게 된다.
const FETCH_TIMEOUT_MS = 9000;
const MAX_ATTEMPTS = 3;

interface RawHourRow {
  dataTime: string;
  [sidoId: string]: string | undefined;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 서버 실행 타임존과 무관하게 KST 기준 날짜를 얻는다. */
function kstDateParts(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), day: get("day") };
}

function formatYYYYMMDD({ y, m, day }: { y: number; m: number; day: number }): string {
  return `${y}${pad2(m)}${pad2(day)}`;
}

function dateRangeKST(): { inqBginDt: string; inqEndDt: string } {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return {
    inqBginDt: formatYYYYMMDD(kstDateParts(yesterday)),
    inqEndDt: formatYYYYMMDD(kstDateParts(now)),
  };
}

/**
 * 에어코리아 dataTime은 자정을 "2026-08-18 24:00"처럼 표기한다 (실측 확인).
 * 다음 날 00:00으로 보정해 KST 오프셋이 붙은 ISO 문자열로 반환한다.
 */
function parseDataTime(raw: string): string {
  const [datePart, timePart] = raw.trim().split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [origHh, mm] = timePart.split(":").map(Number);
  let hh = origHh;

  let year = y;
  let month = m;
  let day = d;

  if (hh === 24) {
    hh = 0;
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }

  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hh)}:${pad2(mm)}:00+09:00`;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchItemRows(itemCode: "PM10" | "PM25"): Promise<RawHourRow[]> {
  const serviceKey = process.env.AIRKOREA_SERVICE_KEY;
  if (!serviceKey) throw new Error("AIRKOREA_SERVICE_KEY is not set");

  const { inqBginDt, inqEndDt } = dateRangeKST();
  const params = new URLSearchParams({
    serviceKey,
    itemCode,
    dataGubun: "HOUR",
    returnType: "json",
    numOfRows: "50",
    pageNo: "1",
    inqBginDt,
    inqEndDt,
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(`${ENDPOINT}?${params.toString()}`, FETCH_TIMEOUT_MS);
      const body = await res.json();
      const items = body?.response?.body?.items;
      if (!Array.isArray(items)) {
        throw new Error(`Unexpected AirKorea response shape: ${JSON.stringify(body).slice(0, 300)}`);
      }
      return items as RawHourRow[];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AirKorea fetch failed");
}

type TimeBucket = { pm10: Record<string, number | null>; pm25: Record<string, number | null> };

function buildTimeBuckets(pm10Rows: RawHourRow[], pm25Rows: RawHourRow[] | null): Map<string, TimeBucket> {
  const byTime = new Map<string, TimeBucket>();

  function ingest(rows: RawHourRow[], key: "pm10" | "pm25") {
    for (const row of rows) {
      const iso = parseDataTime(row.dataTime);
      if (!byTime.has(iso)) byTime.set(iso, { pm10: {}, pm25: {} });
      const bucket = byTime.get(iso)!;
      for (const sido of SIDO_LIST) {
        bucket[key][sido.id] = normalizeReading(row[sido.id]);
      }
    }
  }

  ingest(pm10Rows, "pm10");
  if (pm25Rows) ingest(pm25Rows, "pm25");

  return byTime;
}

function mergeIntoSnapshot(pm10Rows: RawHourRow[], pm25Rows: RawHourRow[] | null): Snapshot {
  const byTime = buildTimeBuckets(pm10Rows, pm25Rows);
  const last24Times = Array.from(byTime.keys()).sort().slice(-24);

  const sidos: SidoSnapshot[] = SIDO_LIST.map((sido) => {
    const series: HourlyPoint[] = last24Times.map((iso) => {
      const bucket = byTime.get(iso)!;
      return {
        time: iso,
        hour: iso.slice(11, 16),
        pm10: bucket.pm10[sido.id] ?? null,
        // PM2.5 응답 자체를 못 받아온 경우(§7.6-4 미확인) 전 구간을 결측으로 둔다.
        pm25: pm25Rows ? (bucket.pm25[sido.id] ?? null) : null,
      };
    });
    const latest = findLatestMeasured(series);

    return {
      id: sido.id,
      name: sido.name,
      series,
      latestPm10: latest.pm10,
      latestPm25: latest.pm25,
      latestMeasuredAt: latest.measuredAt,
    };
  });

  return { generatedAt: new Date().toISOString(), sidos, source: "live" };
}

export interface MeasurementRecord {
  sido_code: string;
  data_time: string;
  pm10: number | null;
  pm25: number | null;
}

/** DB upsert용으로 (시도, 시각)별 레코드 목록을 만든다. §7.7 데이터 모델과 1:1 대응. */
function toMeasurementRecords(pm10Rows: RawHourRow[], pm25Rows: RawHourRow[] | null): MeasurementRecord[] {
  const byTime = buildTimeBuckets(pm10Rows, pm25Rows);
  const records: MeasurementRecord[] = [];

  for (const [iso, bucket] of byTime) {
    for (const sido of SIDO_LIST) {
      records.push({
        sido_code: sido.id,
        data_time: iso,
        pm10: bucket.pm10[sido.id] ?? null,
        pm25: pm25Rows ? (bucket.pm25[sido.id] ?? null) : null,
      });
    }
  }

  return records;
}

interface AirKoreaRows {
  pm10: RawHourRow[];
  pm25: RawHourRow[] | null;
}

/** PM10 실패 시 전체 실패, PM2.5만 실패하면 그쪽만 결측 처리하고 계속 진행. */
async function fetchAirKoreaRows(): Promise<AirKoreaRows> {
  const [pm10Result, pm25Result] = await Promise.allSettled([
    fetchItemRows("PM10"),
    fetchItemRows("PM25"),
  ]);

  if (pm10Result.status === "rejected") {
    throw pm10Result.reason;
  }

  return {
    pm10: pm10Result.value,
    pm25: pm25Result.status === "fulfilled" ? pm25Result.value : null,
  };
}

/** /api/snapshot이 쓰는 진입점: 화면용 Snapshot과 DB 적재용 레코드를 한 번의 조회로 함께 만든다. */
export async function fetchLiveData(): Promise<{ snapshot: Snapshot; records: MeasurementRecord[] }> {
  const { pm10, pm25 } = await fetchAirKoreaRows();
  return {
    snapshot: mergeIntoSnapshot(pm10, pm25),
    records: toMeasurementRecords(pm10, pm25),
  };
}

/** §7.4 크론 배치가 쓰는 진입점: 최신 ~48시간 창을 통째로 가져와 DB에 upsert할 레코드로 변환한다.
 *  매 실행마다 같은 창을 다시 받아 upsert하므로, 별도 backfill/공백복구 로직 없이도
 *  최초 실행이 곧 backfill이 되고 이후 실행이 자연스럽게 공백을 메운다 (§7.2). */
export async function fetchMeasurementRecords(): Promise<MeasurementRecord[]> {
  const { pm10, pm25 } = await fetchAirKoreaRows();
  return toMeasurementRecords(pm10, pm25);
}
