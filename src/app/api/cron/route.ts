import { NextRequest, NextResponse } from "next/server";
import { fetchMeasurementRecords } from "@/lib/airkorea";
import { upsertMeasurements } from "@/lib/db";

// §7.4: 외부 스케줄러(cron-job.org)가 매시 15/35/55분에 이 경로를 호출한다.
// CRON_SECRET 헤더 검증을 통과한 요청만 처리해 무단 호출로 인한 API 한도 소진을 막는다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const provided = request.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const records = await fetchMeasurementRecords();
    const upserted = await upsertMeasurements(records);
    return NextResponse.json({ ok: true, upserted, at: new Date().toISOString() });
  } catch (err) {
    console.error("[api/cron] AirKorea 수집 실패:", err);
    // 배치가 실패해도 서비스는 기존 DB 데이터로 정상 동작해야 한다 (F-04-3). 다음 재시도(35분/55분)에 맡긴다.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 }
    );
  }
}
