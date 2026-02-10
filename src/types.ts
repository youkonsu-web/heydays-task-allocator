export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABEL: Record<DayKey, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

export type BusinessKey = "맛집도감" | "뮤플비";
export const BUSINESS_OPTIONS: BusinessKey[] = ["맛집도감", "뮤플비"];

export type Period = {
  id: string; // 2026-02-09__2026-02-15
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
  createdAt: number;
};

export type Task = {
  id: string;
  title: string;
  description: string; // ✅ 추가
  minutes: number; // 업무 소요시간(분) (그대로 유지)
  business: BusinessKey;
  important: boolean;
  assignedTo?: string;

  order: number;
  createdAt: number;
};

export type Member = {
  id: string;
  name: string;

  // ✅ 저장은 기존처럼 “분”으로 유지 (UI에서만 시간으로 보여줌)
  availabilityByDay: Record<DayKey, number>;

  order: number;
  createdAt: number;
};

export function sumAvailabilityMinutes(m: Member): number {
  return DAY_KEYS.reduce((acc, k) => acc + (Number(m.availabilityByDay[k]) || 0), 0);
}

export function minutes(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.round(x);
}
