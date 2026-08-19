import { getSupabaseAdmin } from "@/lib/supabase";
import { SIDO_LIST } from "@/lib/constants";
import { findLatestMeasured } from "@/lib/snapshot";
import { kstHourSlots, toKstHourIso } from "@/lib/kst";
import type { MeasurementRecord } from "@/lib/airkorea";
import type { HourlyPoint, SidoSnapshot, Snapshot } from "@/types/air-quality";

/** §7.7: (sido_code, data_time) 복합키 UPSERT — 중복 호출해도 데이터가 중복 적재되지 않는다. */
export async function upsertMeasurements(records: MeasurementRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("measurements")
    .upsert(records, { onConflict: "sido_code,data_time" });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return records.length;
}

interface DbRow {
  sido_code: string;
  data_time: string;
  pm10: number | null;
  pm25: number | null;
}

// 전체 스냅샷의 최신 시각이 이보다 오래되면 "오래된 데이터"로 취급한다 (호출부가 라이브 조회로 넘어감).
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

/**
 * DB에서 최근 24시간 스냅샷을 구성한다.
 * - DB에 아무 행도 없으면 null (아직 한 번도 수집된 적 없음)
 * - 행은 있지만 최신 데이터가 오래됐으면 isStale: true (그래도 데이터는 함께 반환 — §7.2 "마지막 정상 데이터" 원칙)
 */
export async function fetchSnapshotFromDb(): Promise<{ snapshot: Snapshot; isStale: boolean } | null> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("measurements")
    .select("sido_code, data_time, pm10, pm25")
    .gte("data_time", since)
    .order("data_time", { ascending: true });

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (!data || data.length === 0) return null;

  const rows = data as DbRow[];
  const slots = kstHourSlots(now, 24);
  const slotSet = new Set(slots);

  const bySido = new Map<string, Map<string, { pm10: number | null; pm25: number | null }>>();
  for (const row of rows) {
    const iso = toKstHourIso(new Date(row.data_time));
    if (!slotSet.has(iso)) continue;
    if (!bySido.has(row.sido_code)) bySido.set(row.sido_code, new Map());
    bySido.get(row.sido_code)!.set(iso, { pm10: row.pm10, pm25: row.pm25 });
  }

  let latestOverall: string | null = null;

  const sidos: SidoSnapshot[] = SIDO_LIST.map((sido) => {
    const sidoData = bySido.get(sido.id);
    const series: HourlyPoint[] = slots.map((iso) => {
      const point = sidoData?.get(iso);
      return {
        time: iso,
        hour: iso.slice(11, 16),
        pm10: point?.pm10 ?? null,
        pm25: point?.pm25 ?? null,
      };
    });
    const latest = findLatestMeasured(series);
    if (latest.measuredAt && (!latestOverall || latest.measuredAt > latestOverall)) {
      latestOverall = latest.measuredAt;
    }

    return {
      id: sido.id,
      name: sido.name,
      series,
      latestPm10: latest.pm10,
      latestPm25: latest.pm25,
      latestMeasuredAt: latest.measuredAt,
    };
  });

  const isStale =
    !latestOverall || now.getTime() - new Date(latestOverall).getTime() > STALE_THRESHOLD_MS;

  return { snapshot: { generatedAt: now.toISOString(), sidos, source: "db" }, isStale };
}
