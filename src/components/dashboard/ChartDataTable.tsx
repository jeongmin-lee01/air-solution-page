import type { HourlyPoint } from "@/types/air-quality";

interface ChartDataTableProps {
  series: HourlyPoint[];
  sidoName: string;
  visible: boolean;
}

/** F-03 접근성 대안: 그래프와 동일한 데이터를 표로 제공 */
export function ChartDataTable({ series, sidoName, visible }: ChartDataTableProps) {
  return (
    <div className={visible ? "mt-4 overflow-x-auto" : "sr-only"}>
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <caption className="mb-2 text-left text-xs text-gray-500">
          {sidoName} 최근 24시간 PM10 / PM2.5 (㎍/㎥)
        </caption>
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th scope="col" className="py-1 pr-3 font-medium">
              시각
            </th>
            <th scope="col" className="py-1 pr-3 font-medium">
              PM10
            </th>
            <th scope="col" className="py-1 pr-3 font-medium">
              PM2.5
            </th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.time} className="border-b border-gray-100">
              <td className="py-1 pr-3 tabular-nums">{p.hour}</td>
              <td className="py-1 pr-3 tabular-nums">
                {p.pm10 === null ? "데이터 없음" : p.pm10}
              </td>
              <td className="py-1 pr-3 tabular-nums">
                {p.pm25 === null ? "데이터 없음" : p.pm25}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
