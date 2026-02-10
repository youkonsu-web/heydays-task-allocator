"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BusinessKey } from "@/types";
import { TaskList } from "@/components/TaskList";
import { MemberGrid } from "@/components/MemberGrid";
import { useWorkspaceStore } from "@/lib/workspaceStore";

export default function WorkspacePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const store = useWorkspaceStore(workspaceId);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessKey>("맛집도감");

  const [startDate, setStartDate] = useState(store.defaultPeriod.start);
  const [endDate, setEndDate] = useState(store.defaultPeriod.end);

  const [ym, setYm] = useState<string>("");

  const title = useMemo(() => "헤이데이 업무배정", []);

  const filteredPeriods = useMemo(() => {
    if (!ym) return store.periods;
    return store.periods.filter((p) => p.startDate.slice(0, 7) === ym);
  }, [store.periods, ym]);

  return (
    <div className="container">
      {store.toast ? <div className="toast">{store.toast}</div> : null}

      <div className="header">
        <h1 style={{ margin: 0, fontSize: 20 }}>{title}</h1>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <h2>기간설정</h2>

        <div className="row" style={{ flexWrap: "wrap", alignItems: "stretch" }}>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: "var(--muted)" }}>~</span>
            <input
              className="input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button className="btn primary" onClick={() => store.createPeriod(startDate, endDate)}>
            기간 탭 생성/선택
          </button>

          <div style={{ flex: 1 }} />

          <select
            className="select"
            value={ym}
            onChange={(e) => setYm(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">(전체 기간)</option>
            {store.periodYearMonths.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div className="tabs" style={{ marginTop: 12, overflowX: "auto", paddingBottom: 6 }}>
          {filteredPeriods.map((p) => (
            <button
              key={p.id}
              className={"tab" + (store.selectedPeriodId === p.id ? " active" : "")}
              onClick={() => store.selectPeriod(p.id)}
              style={{ whiteSpace: "nowrap" }}
            >
              {p.label}
            </button>
          ))}
          {filteredPeriods.length === 0 && <span className="badge">해당 월에 기간 탭이 없습니다.</span>}
        </div>
      </div>

      <div className="grid">
        <TaskList
          tasks={store.tasks}
          selectedBusiness={selectedBusiness}
          onSelectBusiness={setSelectedBusiness}
          onCreate={store.createTask}
          onUpdate={store.updateTask}
          onDelete={store.deleteTask}
          onDuplicate={store.duplicateTask}
          onReorder={store.reorderTasks}
        />

        <MemberGrid
          members={store.members}
          tasks={store.tasks}
          statsByMember={store.stats}
          onUnassign={(taskId) => store.assignTask(taskId, null)}
          onSaveAvailability={(memberId, availabilityByDay) =>
            store.updateMemberAvailability(memberId, { availabilityByDay })
          }
          onCreateMember={store.createMember}
          onUpdateMemberName={store.updateMemberName}
          onDeleteMember={store.deleteMember}
          onUpdateTask={store.updateTask}
          onDeleteTask={store.deleteTask}
          onReorderMembers={store.reorderMembers}
          onAssignDrop={(taskId, memberId) => store.assignTask(taskId, memberId)}
          onDuplicateTask={(taskId) => store.duplicateTask(taskId)}
        />
      </div>
    </div>
  );
}
