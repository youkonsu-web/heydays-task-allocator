"use client";

import { useMemo, useState } from "react";
import { BusinessKey, DAY_KEYS, DAY_LABEL, Member, Task } from "@/types";

function BizTag({ business }: { business: BusinessKey }) {
  const cls = business === "맛집도감" ? "tag mj" : "tag mp";
  return <span className={cls}>[{business}]</span>;
}
function ImportantTag() {
  return <span className="tag imp">[중요]</span>;
}

function minutesToHours(min: number) {
  const h = (Number(min) || 0) / 60;
  return Number.isFinite(h) ? Math.round(h * 10) / 10 : 0;
}
function hoursToMinutes(hours: number) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 0) return 0;
  return Math.round(h * 60);
}

export function MemberFolder({
  member,
  tasks,
  stats,
  onUnassign,
  onSaveAvailability,
  onUpdateName,
  onDeleteMember,
  onUpdateTask,
  onDeleteTask,
  onAssignDrop,     // ✅ 추가
  onDuplicateTask,  // ✅ 추가
}: {
  member: Member;
  tasks: Task[];
  stats: { assigned: number; available: number; remaining: number; over: boolean };
  onUnassign: (taskId: string) => void;
  onSaveAvailability: (availabilityByDay: Member["availabilityByDay"]) => void;
  onUpdateName: (name: string) => void;
  onDeleteMember: () => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;

  onAssignDrop: (taskId: string, memberId: string) => void;
  onDuplicateTask: (taskId: string) => void;
}) {
  const myTasks = useMemo(() => tasks.filter((t) => t.assignedTo === member.id), [tasks, member.id]);

  const pct = stats.available > 0 ? Math.min(100, Math.round((stats.assigned / stats.available) * 100)) : 0;

  const [editingAvail, setEditingAvail] = useState(false);

  const [draftAvailHours, setDraftAvailHours] = useState(() => {
    const obj: any = {};
    for (const k of DAY_KEYS) obj[k] = minutesToHours(member.availabilityByDay[k]);
    return obj as Record<(typeof DAY_KEYS)[number], number>;
  });

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(member.name);

  useMemo(() => {
    const obj: any = {};
    for (const k of DAY_KEYS) obj[k] = minutesToHours(member.availabilityByDay[k]);
    setDraftAvailHours(obj);
  }, [member.availabilityByDay]);

  useMemo(() => setNameDraft(member.name), [member.name]);

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={"memberDrop" + (isOver ? " active" : "")}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={() => setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);

        const taskId = e.dataTransfer.getData("text/taskId");
        if (taskId) onAssignDrop(taskId, member.id);
      }}
    >
      <div className="memberTop">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {!editingName ? (
              <div className="memberName">{member.name}</div>
            ) : (
              <input className="input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={{ maxWidth: 220 }} />
            )}

            {!editingName ? (
              <button className="btn" onClick={() => setEditingName(true)}>
                이름수정
              </button>
            ) : (
              <>
                <button className="btn primary" onClick={() => { onUpdateName(nameDraft); setEditingName(false); }}>
                  저장
                </button>
                <button className="btn" onClick={() => { setNameDraft(member.name); setEditingName(false); }}>
                  취소
                </button>
              </>
            )}

            <button
              className="btn danger"
              onClick={() => {
                if (window.confirm("이 구성원을 삭제할까요? (할당된 업무는 미배정으로 돌아갑니다)")) onDeleteMember();
              }}
            >
              삭제
            </button>
          </div>

          <div className="small" style={{ marginTop: 6 }}>
            할당 {minutesToHours(stats.assigned)}h · 가용 {minutesToHours(stats.available)}h · 남은 {Math.max(0, minutesToHours(stats.remaining))}h
            {stats.remaining < 0 ? <span style={{ color: "var(--danger)", marginLeft: 6 }}>(초과)</span> : null}
          </div>
        </div>

        <button className="btn" onClick={() => setEditingAvail((v) => !v)}>
          {editingAvail ? "닫기" : "가용시간"}
        </button>
      </div>

      <div className={"progress" + (stats.over ? " over" : "")} title={`${pct}%`}>
        <div style={{ width: `${pct}%` }} />
      </div>

      {editingAvail && (
        <div className="card" style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <strong>요일별 가용시간(시간)</strong>
            <button
              className="btn primary"
              onClick={() => {
                const next: any = {};
                for (const k of DAY_KEYS) next[k] = hoursToMinutes(draftAvailHours[k]);
                onSaveAvailability(next as Member["availabilityByDay"]);
                setEditingAvail(false);
              }}
            >
              저장
            </button>
          </div>

          <div className="days">
            {DAY_KEYS.map((k) => (
              <div key={k}>
                <label>{DAY_LABEL[k]}</label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={draftAvailHours[k]}
                  onChange={(e) => setDraftAvailHours((d) => ({ ...d, [k]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stack" style={{ marginTop: 10 }}>
        {myTasks.map((t) => (
          <div key={t.id} className="task" style={{ cursor: "default" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              <div
                style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", cursor: "pointer" }}
                onClick={() => setOpenTaskId((prev) => (prev === t.id ? null : t.id))}
              >
                <BizTag business={t.business} />
                {t.important ? <ImportantTag /> : null}
                <div className="title">{t.title}</div>
              </div>

              <div className="meta">{minutesToHours(t.minutes)}h</div>

              {openTaskId === t.id && (
                <div className="descBox">
                  <div className="descTitle">설명</div>
                  <div className="descBody">{t.description?.trim() ? t.description : <span className="muted">(없음)</span>}</div>
                </div>
              )}
            </div>

            <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => onDuplicateTask(t.id)}>복제</button>
              <button className="btn" onClick={() => onUnassign(t.id)}>해제</button>
              <button
                className="btn"
                onClick={() => {
                  const v = window.prompt("설명 수정", t.description || "");
                  if (v !== null) onUpdateTask(t.id, { description: v });
                }}
              >
                설명
              </button>
              <button className="btn danger" onClick={() => { if (window.confirm("이 업무를 삭제할까요?")) onDeleteTask(t.id); }}>
                삭제
              </button>
            </div>
          </div>
        ))}

        {myTasks.length === 0 && (
          <div className="card"><span style={{ color: "var(--muted)" }}>할당된 업무 없음</span></div>
        )}
      </div>
    </div>
  );
}
