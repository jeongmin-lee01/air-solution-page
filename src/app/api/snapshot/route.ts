import { NextResponse } from "next/server";
import { fetchLiveData } from "@/lib/airkorea";
import { fetchSnapshotFromDb, upsertMeasurements } from "@/lib/db";
import { buildMockSnapshot } from "@/mocks/mock-data";
import type { MeasurementRecord } from "@/lib/airkorea";

// §8.1/§8.2: 인증키는 서버에만 두고, 화면은 원칙적으로 DB만 읽는다(빠르고 외부 API 장애와 무관).
// DB가 비어있거나(첫 실행) 오래됐으면 그 자리에서 라이브 조회를 하고, 그 결과를 DB에 적재해서
// 다음 요청부터는 DB로 서빙되게 한다 — 아직 cron-job.org가 등록되지 않은 동안의 임시 부트스트랩.
export async function GET() {
  let dbResult: Awaited<ReturnType<typeof fetchSnapshotFromDb>> = null;

  try {
    dbResult = await fetchSnapshotFromDb();
  } catch (err) {
    console.error("[api/snapshot] DB 조회 실패:", err);
  }

  if (dbResult && !dbResult.isStale) {
    return NextResponse.json(dbResult.snapshot);
  }

  try {
    const { snapshot, records } = await fetchLiveData();
    persistInBackground(records);
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[api/snapshot] AirKorea 실시간 조회 실패:", err);

    // §7.2 원칙: 외부 API가 죽어도 "마지막 정상 데이터"로 화면을 유지한다.
    if (dbResult) {
      return NextResponse.json(dbResult.snapshot);
    }

    return NextResponse.json(buildMockSnapshot("normal"));
  }
}

function persistInBackground(records: MeasurementRecord[]) {
  upsertMeasurements(records).catch((err) => {
    console.error("[api/snapshot] DB 적재 실패 (화면 응답에는 영향 없음):", err);
  });
}
