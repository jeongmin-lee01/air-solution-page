import { NextResponse } from "next/server";
import { buildLiveSnapshot } from "@/lib/airkorea";
import { buildMockSnapshot } from "@/mocks/mock-data";
import type { Snapshot } from "@/types/air-quality";

// §8.1/§8.2: 인증키는 서버에만 두고, 응답은 캐시해서 재요청 시 외부 API를 다시 두드리지 않는다.
// DB가 아직 없어 서버 프로세스 메모리를 임시 캐시로 쓴다 (재시작/서버리스 콜드스타트 시 초기화됨 —
// Supabase 연동 전까지의 임시 방편).
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { snapshot: Snapshot; expiresAt: number } | null = null;

export async function GET() {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    return NextResponse.json({ ...cache.snapshot, source: "cache" });
  }

  try {
    const snapshot = await buildLiveSnapshot();
    cache = { snapshot, expiresAt: now + CACHE_TTL_MS };
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[api/snapshot] AirKorea 실시간 조회 실패, 폴백으로 전환:", err);

    // §7.2 원칙: 외부 API가 죽어도 "마지막 정상 데이터"로 화면을 유지한다.
    // 만료된 캐시라도 남아있으면 그걸 계속 내려주고, 아예 없으면(첫 요청부터 실패) mock으로 대체한다.
    if (cache) {
      return NextResponse.json({ ...cache.snapshot, source: "cache" });
    }

    const snapshot = buildMockSnapshot("normal");
    return NextResponse.json(snapshot);
  }
}
