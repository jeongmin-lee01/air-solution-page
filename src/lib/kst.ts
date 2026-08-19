function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 절대 시각(Date)을 "YYYY-MM-DDTHH:00:00+09:00" 형태의 KST 정시 ISO 문자열로 변환한다. */
export function toKstHourIso(d: Date): string {
  const shifted = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const h = shifted.getUTCHours();
  return `${y}-${pad2(m)}-${pad2(day)}T${pad2(h)}:00:00+09:00`;
}

/** now 기준 최근 count개의 KST 정시 슬롯을 과거→현재 순서로 반환한다. */
export function kstHourSlots(now: Date, count: number): string[] {
  const slots: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    slots.push(toKstHourIso(new Date(now.getTime() - i * 60 * 60 * 1000)));
  }
  return slots;
}
