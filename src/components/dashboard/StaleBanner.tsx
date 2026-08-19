/** F-04-4: 데이터가 1시간 이상 갱신되지 않을 때 상단 안내 배너 */
export function StaleBanner() {
  return (
    <div
      role="status"
      className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900"
    >
      ⚠ 최근 1시간 이상 데이터가 갱신되지 않았습니다. 마지막으로 확인된 데이터를 표시하고 있습니다.
    </div>
  );
}
