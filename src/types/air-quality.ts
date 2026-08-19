export type SidoId =
  | "seoul"
  | "busan"
  | "daegu"
  | "incheon"
  | "gwangju"
  | "daejeon"
  | "ulsan"
  | "sejong"
  | "gyeonggi"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "jeonbuk"
  | "jeonnam"
  | "gyeongbuk"
  | "gyeongnam"
  | "jeju";

export interface Sido {
  id: SidoId;
  name: string;
}

export type Grade = "good" | "moderate" | "bad" | "veryBad";

export interface HourlyPoint {
  /** ISO timestamp (KST) for this hourly slot */
  time: string;
  /** "HH:mm" label for chart axis */
  hour: string;
  pm10: number | null;
  pm25: number | null;
}

export interface SidoSnapshot {
  id: SidoId;
  name: string;
  /** last 24 hourly points, oldest first */
  series: HourlyPoint[];
  /** latest normalized readings (may be null if the latest slot is missing) */
  latestPm10: number | null;
  latestPm25: number | null;
  /** timestamp of the latest reading that actually has a value (§7.5 원칙) */
  latestMeasuredAt: string | null;
}

export type Scenario =
  | "normal"
  | "ownApiError"
  | "staleExternal"
  | "accumulating"
  | "staleBanner";

export interface Snapshot {
  generatedAt: string;
  sidos: SidoSnapshot[];
}
