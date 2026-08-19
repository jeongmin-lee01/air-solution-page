interface StaleBadgeProps {
  hours: number;
}

/** F-04-3: 외부 API 장애로 최신 데이터가 없을 때 "N시간 전 데이터" 배지 */
export function StaleBadge({ hours }: StaleBadgeProps) {
  if (hours <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
      {hours}시간 전 데이터
    </span>
  );
}
