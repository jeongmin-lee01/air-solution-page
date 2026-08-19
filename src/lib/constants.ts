import type { Sido } from "@/types/air-quality";

// F-01-1, F-01-5: 고정 순서(권역 순). §7.7 sido_code 명명 규칙을 id로 사용.
export const SIDO_LIST: Sido[] = [
  { id: "seoul", name: "서울" },
  { id: "incheon", name: "인천" },
  { id: "gyeonggi", name: "경기" },
  { id: "gangwon", name: "강원" },
  { id: "daejeon", name: "대전" },
  { id: "sejong", name: "세종" },
  { id: "chungbuk", name: "충북" },
  { id: "chungnam", name: "충남" },
  { id: "gwangju", name: "광주" },
  { id: "jeonbuk", name: "전북" },
  { id: "jeonnam", name: "전남" },
  { id: "daegu", name: "대구" },
  { id: "gyeongbuk", name: "경북" },
  { id: "busan", name: "부산" },
  { id: "ulsan", name: "울산" },
  { id: "gyeongnam", name: "경남" },
  { id: "jeju", name: "제주" },
];

// §7.3 환경부 대기환경기준 (2018년 개정)
export const PM10_THRESHOLDS = { good: 30, moderate: 80, bad: 150 };
export const PM25_THRESHOLDS = { good: 15, moderate: 35, bad: 75 };

// mock 데이터의 기준 "현재 시각" — 데모 재현성을 위해 PRD 예시와 동일하게 고정
export const MOCK_NOW = new Date("2026-08-19T14:00:00+09:00");
