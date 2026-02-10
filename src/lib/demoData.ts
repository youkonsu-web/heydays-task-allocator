import { Member, Task } from "@/types";

export function makeDemoMembers(): Member[] {
  const now = Date.now();
  return [
    {
      id: "m1",
      name: "김대리",
      availabilityByDay: { mon: 240, tue: 240, wed: 240, thu: 240, fri: 240, sat: 0, sun: 0 }, // 저장은 분
      order: 100,
      createdAt: now - 3,
    },
    {
      id: "m2",
      name: "이과장",
      availabilityByDay: { mon: 180, tue: 180, wed: 180, thu: 180, fri: 180, sat: 0, sun: 0 },
      order: 200,
      createdAt: now - 2,
    },
    {
      id: "m3",
      name: "박사원",
      availabilityByDay: { mon: 120, tue: 120, wed: 120, thu: 120, fri: 120, sat: 0, sun: 0 },
      order: 300,
      createdAt: now - 1,
    },
  ];
}

export function makeDemoTasks(): Task[] {
  const now = Date.now();
  return [
    {
      id: "t1",
      title: "고객 미팅 자료 정리",
      description: "지난 미팅 요약 + 핵심 액션아이템 정리",
      minutes: 90,
      business: "맛집도감",
      important: true,
      order: 100,
      createdAt: now - 10,
    },
    {
      id: "t2",
      title: "주간 리포트 작성",
      description: "금요일 17시까지 공유",
      minutes: 120,
      business: "맛집도감",
      important: false,
      order: 200,
      createdAt: now - 9,
    },
    {
      id: "t3",
      title: "QA 버그 확인",
      description: "재현 가능한 케이스 위주로 우선 처리",
      minutes: 60,
      business: "뮤플비",
      important: true,
      order: 300,
      createdAt: now - 8,
    },
    {
      id: "t4",
      title: "디자인 피드백 반영",
      description: "모바일 CTA 간격 수정",
      minutes: 150,
      business: "뮤플비",
      important: false,
      order: 400,
      createdAt: now - 7,
    },
    {
      id: "t5",
      title: "기획 회의 아젠다",
      description: "",
      minutes: 45,
      business: "맛집도감",
      important: false,
      order: 500,
      createdAt: now - 6,
    },
  ];
}
