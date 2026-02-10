import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type BusinessKey = "맛집도감" | "뮤플비";

function periodDoc(workspaceId: string, periodId: string) {
  return adminDb.collection("workspaces").doc(workspaceId).collection("periods").doc(periodId);
}
function col(workspaceId: string, periodId: string, name: "tasks" | "members") {
  return periodDoc(workspaceId, periodId).collection(name);
}

async function ensurePeriod(workspaceId: string, periodId: string, startDate?: string, endDate?: string, label?: string) {
  const ref = periodDoc(workspaceId, periodId);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      id: periodId,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      label: label ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

export async function GET(_req: Request, ctx: { params: { workspaceId: string; periodId: string } }) {
  const { workspaceId, periodId } = ctx.params;

  const [tasksSnap, membersSnap] = await Promise.all([
    col(workspaceId, periodId, "tasks").get(),
    col(workspaceId, periodId, "members").get(),
  ]);

  const tasks = tasksSnap.docs.map((d) => d.data());
  const members = membersSnap.docs.map((d) => d.data());

  return NextResponse.json({ ok: true, tasks, members });
}

export async function POST(req: Request, ctx: { params: { workspaceId: string; periodId: string } }) {
  const { workspaceId, periodId } = ctx.params;
  const body = await req.json();
  const action = body?.action as string;

  if (action === "period.ensure") {
    const { startDate, endDate, label } = body as { startDate: string; endDate: string; label: string };
    await ensurePeriod(workspaceId, periodId, startDate, endDate, label);
    await periodDoc(workspaceId, periodId).set({ updatedAt: Date.now() }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (action === "task.create") {
    const t = body.task as {
      id: string;
      title: string;
      description: string;
      minutes: number;
      business: BusinessKey;
      important: boolean;
      order: number;
      createdAt: number;
    };
    await ensurePeriod(workspaceId, periodId);
    await col(workspaceId, periodId, "tasks").doc(t.id).set({ ...t, assignedTo: null });
    return NextResponse.json({ ok: true, id: t.id });
  }

  if (action === "task.update") {
    const { taskId, patch } = body as { taskId: string; patch: Record<string, unknown> };
    await col(workspaceId, periodId, "tasks").doc(taskId).set({ ...patch }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (action === "task.delete") {
    const { taskId } = body as { taskId: string };
    await col(workspaceId, periodId, "tasks").doc(taskId).delete();
    return NextResponse.json({ ok: true });
  }

  if (action === "task.assign") {
    const { taskId, memberId } = body as { taskId: string; memberId: string | null };
    await col(workspaceId, periodId, "tasks").doc(taskId).set({ assignedTo: memberId }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (action === "task.duplicate") {
    const { task } = body as { task: any };
    await col(workspaceId, periodId, "tasks").doc(task.id).set(task);
    return NextResponse.json({ ok: true, id: task.id });
  }

  if (action === "member.create") {
    const m = body.member as {
      id: string;
      name: string;
      availabilityByDay: Record<DayKey, number>;
      order: number;
      createdAt: number;
    };
    await ensurePeriod(workspaceId, periodId);
    await col(workspaceId, periodId, "members").doc(m.id).set(m);
    return NextResponse.json({ ok: true, id: m.id });
  }

  if (action === "member.update") {
    const { memberId, patch } = body as { memberId: string; patch: Record<string, unknown> };
    await col(workspaceId, periodId, "members").doc(memberId).set({ ...patch }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (action === "member.delete") {
    const { memberId } = body as { memberId: string };

    const tasksSnap = await col(workspaceId, periodId, "tasks").where("assignedTo", "==", memberId).get();
    const batch = adminDb.batch();

    for (const d of tasksSnap.docs) {
      batch.set(d.ref, { assignedTo: null }, { merge: true });
    }
    batch.delete(col(workspaceId, periodId, "members").doc(memberId));
    await batch.commit();

    return NextResponse.json({ ok: true });
  }

  if (action === "reorder.tasks") {
    const { orders } = body as { orders: Array<{ id: string; order: number }> };
    const batch = adminDb.batch();
    for (const x of orders) {
      batch.set(col(workspaceId, periodId, "tasks").doc(x.id), { order: x.order }, { merge: true });
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  }

  if (action === "reorder.members") {
    const { orders } = body as { orders: Array<{ id: string; order: number }> };
    const batch = adminDb.batch();
    for (const x of orders) {
      batch.set(col(workspaceId, periodId, "members").doc(x.id), { order: x.order }, { merge: true });
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
