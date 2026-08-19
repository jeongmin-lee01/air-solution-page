/** "2026-08-19 14:00 기준" 형식 (F-02-3) */
export function formatMeasuredAt(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm} 기준`;
}

/** F-04-3: "N시간 전 데이터" 배지용 경과 시간 계산 */
export function hoursSince(iso: string, now: Date): number {
  const diffMs = now.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

export function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  return `${hh}:00`;
}
