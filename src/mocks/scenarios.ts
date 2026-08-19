import type { Scenario } from "@/types/air-quality";

export const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: "normal", label: "정상" },
  { id: "ownApiError", label: "자체 오류" },
  { id: "staleExternal", label: "외부 API 장애" },
  { id: "accumulating", label: "배포 직후(축적 중)" },
  { id: "staleBanner", label: "1시간 미갱신 배너" },
];
