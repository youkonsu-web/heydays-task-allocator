"use client";

import { Member, Task } from "@/types";
import { MemberFolder } from "@/components/MemberFolder";
import { useRef, useState } from "react";

export function MemberGrid({
  members,
  tasks,
  statsByMember,
  onUnassign,
  onSaveAvailability,
  onCreateMember,
  onUpdateMemberName,
  onDeleteMember,
  onUpdateTask,
  onDeleteTask,
  onReorderMembers,

  onAssignDrop,
  onDuplicateTask,
}: {
  members: Member[];
  tasks: Task[];
  statsByMember: Record<string, { assigned: number; available: number; remaining: number; over: boolean }>;
  onUnassign: (taskId: string) => void;
  onSaveAvailability: (memberId: string, availabilityByDay: Member["availabilityByDay"]) => void;
  onCreateMember: (name: string) => void;
  onUpdateMemberName: (memberId: string, name: string) => void;
  onDeleteMember: (memberId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderMembers: (orderedIds: string[]) => void;

  onAssignDrop: (taskId: string, memberId: string) => void;
  onDuplicateTask: (taskId: string) => void;
}) {
  const [name, setName] = useState("");
  const dragId = useRef<string | null>(null);

  return (
    <div className="panel">
      <h2>구성원</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="새 구성원 이름" style={{ flex: 1 }} />
          <button className="btn primary" onClick={() => { onCreateMember(name); setName(""); }}>
            추가
          </button>
        </div>
      </div>

      <div className="memberGrid">
        {members.map((m) => (
          <div
            key={m.id}
            draggable
            onDragStart={() => (dragId.current = m.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const from = dragId.current;
              const to = m.id;
              if (!from || from === to) return;

              const ids = members.map((x) => x.id);
              const fromIdx = ids.indexOf(from);
              const toIdx = ids.indexOf(to);
              if (fromIdx < 0 || toIdx < 0) return;

              const next = [...ids];
              next.splice(fromIdx, 1);
              next.splice(toIdx, 0, from);
              onReorderMembers(next);
            }}
            style={{ cursor: "grab" }}
          >
            <MemberFolder
              member={m}
              tasks={tasks}
              stats={statsByMember[m.id] ?? { assigned: 0, available: 0, remaining: 0, over: false }}
              onUnassign={onUnassign}
              onSaveAvailability={(availabilityByDay) => onSaveAvailability(m.id, availabilityByDay)}
              onUpdateName={(name) => onUpdateMemberName(m.id, name)}
              onDeleteMember={() => onDeleteMember(m.id)}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onAssignDrop={onAssignDrop}
              onDuplicateTask={onDuplicateTask}
            />
          </div>
        ))}

        {members.length === 0 && (
          <div className="card"><span style={{ color: "var(--muted)" }}>구성원이 없습니다.</span></div>
        )}
      </div>
    </div>
  );
}
