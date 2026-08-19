/** F-04-1: 초기 로딩 시 상세 패널 스켈레톤 */
export function SkeletonPanel() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 p-5" aria-hidden="true">
      <div className="mb-4 h-6 w-24 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="h-16 rounded bg-gray-200" />
          <div className="h-16 rounded bg-gray-200" />
        </div>
        <div className="h-48 rounded bg-gray-200" />
      </div>
    </div>
  );
}
