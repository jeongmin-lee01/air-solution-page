/** F-03-5: Backfill 불가 상황에서 확보된 구간만 표시할 때의 안내 */
export function AccumulatingNotice() {
  return (
    <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
      데이터 축적 중입니다. 지금은 확보된 시간대만 표시됩니다.
    </p>
  );
}
