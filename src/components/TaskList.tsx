"use client";

import { useMemo, useRef, useState } from "react";
import { BUSINESS_OPTIONS, BusinessKey, Task } from "@/types";

function BizTag({ business }: { business: BusinessKey }) {
  const cls = business === "맛집도감" ? "tag mj" : "tag mp";
  return <span className={cls}>[{business}]</span>;
}
function ImportantTag() {
  return <span className="tag imp">[중요]</span>;
}

function minutesToHours(min: number) {
  const h = (Number(min) || 0) / 60;
  return Number.isFinite(h) ? Math.round(h * 10) / 10 : 0; // 소수 1자리
}
function hoursToMinutes(hours: number) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 0) return 0;
  return Math.round(h * 60);
}

export function TaskList({
  tasks,
  selectedBusiness,
  onSelectBusiness,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
  onReorder,
}: {
  tasks: Task[];
  selectedBusiness: BusinessKey;
  onSelectBusiness: (b: BusinessKey) => void;
  onCreate: (title: string, minutes: number, business: BusinessKey, important: boolean, description: string) => void;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [hours, setHours] = useState<number>(1); // ✅ 시간 단위 입력
  const [biz, setBiz] = useState<BusinessKey>("맛집도감");
  const [important, setImportant] = useState(false);
  const [desc, setDesc] = useState("");

  const unassigned = useMemo(
    () => tasks.filter((t) => !t.assignedTo && t.business === selectedBusiness),
    [tasks, selectedBusiness]
  );

  // reorder용(HTML5)
  const dragId = useRef<string | null>(null);

  function commitReorder(nextIds: string[]) {
    const visibleSet = new Set(nextIds);
    const others = tasks.filter((t) => !visibleSet.has(t.id)).map((t) => t.id);
    onReorder([...nextIds, ...others]);
  }

  const [openDescTaskId, setOpenDescTaskId] = useState<string | null>(null);

  return (
    <div className="panel">
      <h2>업무</h2>

      <div className="tabs">
        {BUSINESS_OPTIONS.map((b) => (
          <button key={b} className={"tab" + (selectedBusiness === b ? " active" : "")} onClick={() => onSelectBusiness(b)}>
            {b}
          </button>
        ))}
        <span className="badge">미배정: {unassigned.length}개</span>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        {!isAddOpen ? (
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>업무 추가</strong>
            <button className="btn primary" onClick={() => setIsAddOpen(true)}>
              추가
            </button>
          </div>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <strong>업무 추가</strong>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn" onClick={() => setIsAddOpen(false)}>
                  닫기
                </button>
                <button
                  className="btn primary"
                  onClick={() => {
                    onCreate(title, hoursToMinutes(hours), biz, important, desc);
                    setTitle("");
                    setDesc("");
                    setImportant(false);
                    setHours(1);
                    setIsAddOpen(false);
                  }}
                >
                  저장
                </button>
              </div>
            </div>

            <div className="row" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
              <select className="select" value={biz} onChange={(e) => setBiz(e.target.value as BusinessKey)} style={{ width: 140 }}>
                {BUSINESS_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="업무 제목" style={{ flex: 1, minWidth: 240 }} />

              <input className="input" type="number" min={0} step={0.25} value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ width: 120 }} />

              <label className="check">
                <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
                <span>중요</span>
              </label>
            </div>

            <div style={{ marginTop: 10 }}>
              <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="설명" rows={3} />
            </div>
          </>
        )}
      </div>

      <div className="stack">
        {unassigned.map((t) => (
          <div
            key={t.id}
            className="task"
            draggable
            onDragStart={(e) => {
              dragId.current = t.id;

              // ✅ 할당용: HTML5 drop에서 꺼내 쓸 taskId
              e.dataTransfer.setData("text/taskId", t.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              // ✅ reorder용(같은 리스트 내부)
              const from = dragId.current;
              const to = t.id;
              if (!from || from === to) return;

              const ids = unassigned.map((x) => x.id);
              const fromIdx = ids.indexOf(from);
              const toIdx = ids.indexOf(to);
              if (fromIdx < 0 || toIdx < 0) return;

              const next = [...ids];
              next.splice(fromIdx, 1);
              next.splice(toIdx, 0, from);
              commitReorder(next);
            }}
            onClick={() => setOpenDescTaskId((prev) => (prev === t.id ? null : t.id))}
            style={{ cursor: "grab" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <BizTag business={t.business} />
                {t.important ? <ImportantTag /> : null}
                <div className="title">{t.title}</div>
              </div>

              <div className="meta">{minutesToHours(t.minutes)}h</div>

              {openDescTaskId === t.id && (
                <div className="descBox" onClick={(e) => e.stopPropagation()}>
                  <div className="descTitle">설명</div>
                  <div className="descBody">{t.description?.trim() ? t.description : <span className="muted">(없음)</span>}</div>

                  <div className="row" style={{ marginTop: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => onDuplicate(t.id)}>복제</button>

                    <button
                      className="btn"
                      onClick={() => {
                        const v = window.prompt("설명 수정", t.description || "");
                        if (v !== null) onUpdate(t.id, { description: v });
                      }}
                    >
                      설명수정
                    </button>

                    <button
                      className="btn"
                      onClick={() => {
                        const newTitle = window.prompt("업무명 수정", t.title);
                        if (newTitle !== null) onUpdate(t.id, { title: newTitle.trim() || t.title });
                      }}
                    >
                      제목수정
                    </button>

                    <button
                      className="btn"
                      onClick={() => {
                        const v = window.prompt("업무 시간(시간) 수정", String(minutesToHours(t.minutes)));
                        if (v !== null) onUpdate(t.id, { minutes: hoursToMinutes(Number(v)) });
                      }}
                    >
                      시간수정
                    </button>

                    <button className="btn" onClick={() => onUpdate(t.id, { important: !t.important })}>
                      {t.important ? "중요해제" : "중요"}
                    </button>

                    <button
                      className="btn danger"
                      onClick={() => {
                        if (window.confirm("이 업무를 삭제할까요?")) onDelete(t.id);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
              <button className="btn" onClick={() => onDuplicate(t.id)}>복제</button>
              <button className="btn" onClick={() => setOpenDescTaskId((prev) => (prev === t.id ? null : t.id))}>
                {openDescTaskId === t.id ? "닫기" : "보기"}
              </button>
            </div>
          </div>
        ))}

        {unassigned.length === 0 && (
          <div className="card">
            <div style={{ color: "var(--muted)" }}>미배정 업무가 없습니다.</div>
          </div>
        )}
      </div>
    </div>
  );
}
