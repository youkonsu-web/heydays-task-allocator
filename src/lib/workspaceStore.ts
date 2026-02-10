"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BusinessKey, Member, Period, Task, minutes, sumAvailabilityMinutes } from "@/types";
import { getDb, hasFirebaseConfig } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { makeDemoMembers, makeDemoTasks } from "@/lib/demoData";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function formatLabel(start: string, end: string) {
  return `${start} ~ ${end}`;
}
function periodId(start: string, end: string) {
  return `${start}__${end}`;
}
function mondayOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const x = new Date(d);
  x.setDate(d.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sundayOfWeek(d: Date) {
  const mon = mondayOfWeek(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return sun;
}

function sortByOrder<T extends { order?: number; createdAt?: number }>(a: T, b: T) {
  const ao = Number.isFinite(Number(a.order)) ? Number(a.order) : 999999;
  const bo = Number.isFinite(Number(b.order)) ? Number(b.order) : 999999;
  if (ao !== bo) return ao - bo;
  const ac = Number.isFinite(Number(a.createdAt)) ? Number(a.createdAt) : 0;
  const bc = Number.isFinite(Number(b.createdAt)) ? Number(b.createdAt) : 0;
  return ac - bc;
}

function taskAssignedMinutes(tasks: Task[], memberId: string): number {
  return tasks.filter((t) => t.assignedTo === memberId).reduce((acc, t) => acc + (Number(t.minutes) || 0), 0);
}

type StoreState = {
  mode: "firebase" | "demo";
  periods: Period[];
  selectedPeriodId: string | null;
  members: Member[];
  tasks: Task[];
};

export function useWorkspaceStore(workspaceId: string) {
  const [state, setState] = useState<StoreState>({
    mode: "demo",
    periods: [],
    selectedPeriodId: null,
    members: [],
    tasks: [],
  });

  const toastRef = useRef<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    toastRef.current = msg;
    setToast(msg);
    window.setTimeout(() => {
      if (toastRef.current === msg) setToast(null);
    }, 2600);
  }

  const defaultPeriod = useMemo(() => {
    const today = new Date();
    const start = toYmd(mondayOfWeek(today));
    const end = toYmd(sundayOfWeek(today));
    return { start, end, id: periodId(start, end), label: formatLabel(start, end) };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    const db = getDb();
    if (!db) {
      const now = Date.now();
      const p: Period = {
        id: defaultPeriod.id,
        startDate: defaultPeriod.start,
        endDate: defaultPeriod.end,
        label: defaultPeriod.label,
        createdAt: now,
      };
      setState({
        mode: "demo",
        periods: [p],
        selectedPeriodId: p.id,
        members: makeDemoMembers().sort(sortByOrder),
        tasks: makeDemoTasks().sort(sortByOrder),
      });
      return;
    }

    setState((s) => ({ ...s, mode: "firebase" }));

    (async () => {
      const wsRef = doc(db, "workspaces", workspaceId);
      const wsSnap = await getDoc(wsRef);
      if (!wsSnap.exists()) await setDoc(wsRef, { createdAt: Date.now() });
    })().catch(() => {});

    const periodsCol = collection(db, "workspaces", workspaceId, "periods");
    const qPeriods = query(periodsCol, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(qPeriods, async (snap) => {
      const periods = snap.docs.map((d) => d.data() as Period);

      if (periods.length === 0) {
        const now = Date.now();
        const p: Period = {
          id: defaultPeriod.id,
          startDate: defaultPeriod.start,
          endDate: defaultPeriod.end,
          label: defaultPeriod.label,
          createdAt: now,
        };
        await setDoc(doc(periodsCol, p.id), p);
        return;
      }

      setState((prev) => {
        const selected = prev.selectedPeriodId ?? periods[0].id;
        return { ...prev, periods, selectedPeriodId: selected };
      });
    });

    return () => unsub();
  }, [workspaceId, defaultPeriod]);

  useEffect(() => {
    const db = getDb();
    if (!db) return;
    if (state.mode !== "firebase") return;
    if (!state.selectedPeriodId) return;

    const periodId_ = state.selectedPeriodId;
    const membersCol = collection(db, "workspaces", workspaceId, "periods", periodId_, "members");
    const tasksCol = collection(db, "workspaces", workspaceId, "periods", periodId_, "tasks");

    const seededKey = `seeded:${workspaceId}:${periodId_}`;
    (async () => {
      if (localStorage.getItem(seededKey) === "1") return;

      let seeded = false;
      const unsub = onSnapshot(membersCol, (snap) => {
        if (!snap.empty) seeded = true;
        unsub();
      });

      await new Promise((r) => setTimeout(r, 250));
      if (!seeded) {
        const demoMembers = makeDemoMembers();
        const demoTasks = makeDemoTasks();
        await Promise.all([
          ...demoMembers.map((m) => setDoc(doc(membersCol, m.id), m)),
          ...demoTasks.map((t) => setDoc(doc(tasksCol, t.id), t)),
        ]);
      }
      localStorage.setItem(seededKey, "1");
    })().catch(() => {});

    const unsubMembers = onSnapshot(membersCol, (snap) => {
      const members = snap.docs.map((d) => d.data() as Member).sort(sortByOrder);
      setState((prev) => ({ ...prev, members }));
    });

    const unsubTasks = onSnapshot(tasksCol, (snap) => {
      const tasks = snap.docs.map((d) => d.data() as Task).sort(sortByOrder);
      setState((prev) => ({ ...prev, tasks }));
    });

    return () => {
      unsubMembers();
      unsubTasks();
    };
  }, [state.mode, state.selectedPeriodId, workspaceId]);

  const selectedPeriod = useMemo(() => {
    if (!state.selectedPeriodId) return null;
    return state.periods.find((p) => p.id === state.selectedPeriodId) ?? null;
  }, [state.periods, state.selectedPeriodId]);

  const stats = useMemo(() => {
    const map: Record<string, { assigned: number; available: number; remaining: number; over: boolean }> = {};
    for (const m of state.members) {
      const assigned = taskAssignedMinutes(state.tasks, m.id);
      const available = sumAvailabilityMinutes(m);
      const remaining = available - assigned;
      map[m.id] = { assigned, available, remaining, over: remaining < 0 };
    }
    return map;
  }, [state.members, state.tasks]);

  function selectPeriod(id: string) {
    setState((prev) => ({ ...prev, selectedPeriodId: id }));
  }

  async function createPeriod(startDate: string, endDate: string) {
    const start = startDate;
    const end = endDate;
    if (!start || !end) return;

    const s = parseYmd(start);
    const e = parseYmd(end);
    if (e.getTime() < s.getTime()) {
      showToast("❌ 종료일이 시작일보다 빠릅니다.");
      return;
    }

    const id = periodId(start, end);
    const label = formatLabel(start, end);

    if (state.mode === "demo") {
      const p: Period = { id, startDate: start, endDate: end, label, createdAt: Date.now() };
      setState((prev) => {
        const next = [p, ...prev.periods.filter((x) => x.id !== id)];
        return { ...prev, periods: next, selectedPeriodId: id };
      });
      showToast("✅ 기간 탭을 생성했습니다.");
      return;
    }

    const db = getDb();
    if (!db) return;

    const periodsCol = collection(db, "workspaces", workspaceId, "periods");
    const p: Period = { id, startDate: start, endDate: end, label, createdAt: Date.now() };
    await setDoc(doc(periodsCol, id), p, { merge: true });
    setState((prev) => ({ ...prev, selectedPeriodId: id }));
    showToast("✅ 기간 탭을 생성했습니다.");
  }

  function getCols() {
    const db = getDb();
    if (!db) return null;
    if (!state.selectedPeriodId) return null;
    return {
      membersCol: collection(db, "workspaces", workspaceId, "periods", state.selectedPeriodId, "members"),
      tasksCol: collection(db, "workspaces", workspaceId, "periods", state.selectedPeriodId, "tasks"),
    };
  }

  async function assignTask(taskId: string, memberId: string | null) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (memberId) {
      const m = state.members.find((x) => x.id === memberId);
      if (!m) return;

      const assigned = stats[memberId]?.assigned ?? 0;
      const available = stats[memberId]?.available ?? 0;

      if (assigned + (Number(task.minutes) || 0) > available) {
        showToast(`❌ 할당 불가: ${m.name} 가용시간을 초과합니다.`);
        return;
      }
    }

    if (state.mode === "demo") {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, assignedTo: memberId ?? undefined } : t)),
      }));
      return;
    }

    const cols = getCols();
    if (!cols) return;
    await updateDoc(doc(cols.tasksCol, taskId), { assignedTo: memberId ?? null });
  }

  async function updateMemberAvailability(memberId: string, patch: Partial<Member>) {
    if (state.mode === "demo") {
      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === memberId ? ({ ...m, ...patch } as Member) : m)).sort(sortByOrder),
      }));
      return;
    }
    const cols = getCols();
    if (!cols) return;
    await updateDoc(doc(cols.membersCol, memberId), patch as any);
  }

  async function updateMemberName(memberId: string, name: string) {
    const newName = (name || "").trim();
    if (!newName) return;

    if (state.mode === "demo") {
      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === memberId ? { ...m, name: newName } : m)).sort(sortByOrder),
      }));
      return;
    }
    const cols = getCols();
    if (!cols) return;
    await updateDoc(doc(cols.membersCol, memberId), { name: newName });
  }

  async function deleteMember(memberId: string) {
    const affected = state.tasks.filter((t) => t.assignedTo === memberId);

    if (state.mode === "demo") {
      setState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
        tasks: prev.tasks.map((t) => (t.assignedTo === memberId ? { ...t, assignedTo: undefined } : t)),
      }));
      return;
    }
    const cols = getCols();
    if (!cols) return;

    await Promise.all(affected.map((t) => updateDoc(doc(cols.tasksCol, t.id), { assignedTo: null })));
    await deleteDoc(doc(cols.membersCol, memberId));
  }

  async function updateTask(taskId: string, patch: Partial<Task>) {
    if (state.mode === "demo") {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? ({ ...t, ...patch } as Task) : t)).sort(sortByOrder),
      }));
      return;
    }
    const cols = getCols();
    if (!cols) return;
    await updateDoc(doc(cols.tasksCol, taskId), patch as any);
  }

  async function deleteTask(taskId: string) {
    if (state.mode === "demo") {
      setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }));
      return;
    }
    const cols = getCols();
    if (!cols) return;
    await deleteDoc(doc(cols.tasksCol, taskId));
  }

  function createTask(title: string, mins: number, business: BusinessKey, important: boolean, description: string) {
    const now = Date.now();
    const maxOrder = state.tasks.reduce((mx, t) => Math.max(mx, Number(t.order) || 0), 0);

    const t: Task = {
      id: "t" + Math.random().toString(16).slice(2, 10),
      title: title.trim() || "새 업무",
      description: (description || "").trim(),
      minutes: minutes(mins),
      business,
      important,
      order: maxOrder + 100,
      createdAt: now,
    };

    if (state.mode === "demo") {
      setState((prev) => ({ ...prev, tasks: [t, ...prev.tasks].sort(sortByOrder) }));
      return;
    }
    const cols = getCols();
    if (!cols) return;
    setDoc(doc(cols.tasksCol, t.id), t);
  }

  function createMember(name: string) {
    const now = Date.now();
    const maxOrder = state.members.reduce((mx, m) => Math.max(mx, Number(m.order) || 0), 0);

    const m: Member = {
      id: "m" + Math.random().toString(16).slice(2, 10),
      name: name.trim() || "새 구성원",
      availabilityByDay: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
      order: maxOrder + 100,
      createdAt: now,
    };

    if (state.mode === "demo") {
      setState((prev) => ({ ...prev, members: [m, ...prev.members].sort(sortByOrder) }));
      return;
    }
    const cols = getCols();
    if (!cols) return;
    setDoc(doc(cols.membersCol, m.id), m);
  }

  async function reorderTasks(orderedIds: string[]) {
    const idToOrder = new Map<string, number>();
    orderedIds.forEach((id, idx) => idToOrder.set(id, (idx + 1) * 100));

    const next = state.tasks.map((t) => (idToOrder.has(t.id) ? { ...t, order: idToOrder.get(t.id)! } : t)).sort(sortByOrder);

    if (state.mode === "demo") {
      setState((prev) => ({ ...prev, tasks: next }));
      return;
    }

    const cols = getCols();
    if (!cols) return;
    await Promise.all(orderedIds.map((id) => updateDoc(doc(cols.tasksCol, id), { order: idToOrder.get(id)! })));
  }

  async function reorderMembers(orderedIds: string[]) {
    const idToOrder = new Map<string, number>();
    orderedIds.forEach((id, idx) => idToOrder.set(id, (idx + 1) * 100));

    const next = state.members.map((m) => (idToOrder.has(m.id) ? { ...m, order: idToOrder.get(m.id)! } : m)).sort(sortByOrder);

    if (state.mode === "demo") {
      setState((prev) => ({ ...prev, members: next }));
      return;
    }

    const cols = getCols();
    if (!cols) return;
    await Promise.all(orderedIds.map((id) => updateDoc(doc(cols.membersCol, id), { order: idToOrder.get(id)! })));
  }

  const periodYearMonths = useMemo(() => {
    const set = new Set<string>();
    for (const p of state.periods) set.add(p.startDate.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [state.periods]);

  return {
    ...state,
    selectedPeriod,
    selectPeriod,
    createPeriod,
    periodYearMonths,

    stats,
    assignTask,
    updateMemberAvailability,
    updateMemberName,
    deleteMember,
    createTask,
    createMember,
    updateTask,
    deleteTask,

    reorderTasks,
    reorderMembers,

    toast,
    hasFirebaseConfig: hasFirebaseConfig(),
    defaultPeriod,
  };
}
