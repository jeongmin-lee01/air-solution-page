import { SIDO_LIST } from "@/lib/constants";
import { normalizeReading } from "@/lib/grade";
import { findLatestMeasured } from "@/lib/snapshot";
import type { HourlyPoint, SidoSnapshot, Snapshot } from "@/types/air-quality";

// 서버 전용 모듈. 클라이언트 컴포넌트에서 import 금지 (인증키 노출 방지, §8.2).
const ENDPOINT = "https://apis.data.go.kr/B552584/ArpltnStatsSvc/getCtprvnMesureLIst";

// 실측: dataGubun=HOUR 호출 시 inqBginDt/inqEndDt(YYYYMMDD, PRD §7.1 표에는 누락되어 있었음)가
// 없으면 매번 SERVICETIMEOUT_ERROR가 난다. 값이 있으면 정상 응답한다 (§7.6-1 확인 완료).
// 실측 결과 성공률이 약 40~50% 수준으로 불안정해, 재시도 3회로 체감 성공률을 높인다.
const FETCH_TIMEOUT_MS = 6000;
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

function mergeIntoSnapshot(pm10Rows: RawHourRow[], pm25Rows: RawHourRow[] | null): Snapshot {
  const byTime = new Map<string, { pm10: Record<string, number | null>; pm25: Record<string, number | null> }>();

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

/** PM10 실패 시 전체 실패(호출부에서 캐시/mock으로 폴백), PM2.5만 실패하면 PM2.5만 결측 처리. */
export async function buildLiveSnapshot(): Promise<Snapshot> {
  const [pm10Result, pm25Result] = await Promise.allSettled([
    fetchItemRows("PM10"),
    fetchItemRows("PM25"),
  ]);

  if (pm10Result.status === "rejected") {
    throw pm10Result.reason;
  }

  const pm25Rows = pm25Result.status === "fulfilled" ? pm25Result.value : null;
  return mergeIntoSnapshot(pm10Result.value, pm25Rows);
}
