/** F-04-1: 초기 로딩 시 칩 그리드 스켈레톤 */
export function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1025px]:grid-cols-6 gap-2"
      aria-hidden="true"
    >
      {Array.from({ length: 17 }).map((_, i) => (
        <div
          key={i}
          className="h-[76px] animate-pulse rounded-xl bg-gray-200"
        />
      ))}
    </div>
  );
}
