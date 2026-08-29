import { useMemo } from "react";
import type { Task, Project } from "../types";
import { agentById } from "../data/registry";
import { cx } from "../engine/engines";

const TONE: Record<string, string> = {
  RUNNING: "#56c8f0",
  COMPLETED: "#45e0b0",
  READY: "#92a7b7",
  PLANNED: "#5d7386",
  WAITING: "#f2b95c",
  REVIEW: "#f2b95c",
  FAILED: "#f26d6d",
  BLOCKED: "#e58e4a",
  CANCELLED: "#5d7386",
};

const W = 172;
const H = 58;
const GX = 212;
const GY = 86;

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function WorkflowGraph({ tasks, selectedId, onSelect }: {
  tasks: Task[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const layout = useMemo(() => {
    const byKey = new Map(tasks.map((t) => [t.key, t]));
    const depthCache = new Map<string, number>();
    const depth = (t: Task): number => {
      if (depthCache.has(t.key)) return depthCache.get(t.key)!;
      const d = t.dependsOn.length === 0 ? 0 : Math.max(...t.dependsOn.map((k) => (byKey.has(k) ? depth(byKey.get(k)!) : 0))) + 1;
      depthCache.set(t.key, d);
      return d;
    };
    const nodes = tasks.map((t) => ({ t, d: depth(t) }));
    const cols = Math.max(0, ...nodes.map((n) => n.d)) + 1;
    const columns: Task[][] = Array.from({ length: cols }, () => []);
    nodes.forEach((n) => columns[n.d].push(n.t));
    const pos = new Map<string, { x: number; y: number }>();
    const maxRows = Math.max(...columns.map((c) => c.length), 1);
    columns.forEach((col, ci) => {
      const offset = ((maxRows - col.length) * GY) / 2;
      col.forEach((t, ri) => pos.set(t.id, { x: 14 + ci * GX, y: 14 + offset + ri * GY }));
    });
    return { pos, width: 28 + cols * GX, height: 28 + maxRows * GY, maxRows };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-1">
      <svg width={layout.width} height={layout.height} className="block">
        {/* edges */}
        {tasks.flatMap((t) =>
          t.dependsOn.flatMap((k) => {
            const dep = tasks.find((x) => x.key === k);
            if (!dep) return [];
            const from = layout.pos.get(dep.id);
            const to = layout.pos.get(t.id);
            if (!from || !to) return [];
            const x1 = from.x + W;
            const y1 = from.y + H / 2;
            const x2 = to.x;
            const y2 = to.y + H / 2;
            const mx = (x1 + x2) / 2;
            const live = t.status === "RUNNING" && dep.status === "COMPLETED";
            const done = dep.status === "COMPLETED" && t.status === "COMPLETED";
            const bad = t.status === "FAILED" || t.status === "BLOCKED";
            const stroke = bad ? TONE.FAILED : live ? TONE.RUNNING : done ? TONE.COMPLETED : "#28405466";
            return (
              <path
                key={`${dep.id}->${t.id}`}
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={live ? 1.8 : 1.3}
                className={live ? "edge-active" : undefined}
                opacity={done || live || bad ? 0.95 : 0.7}
              />
            );
          }),
        )}

        {/* nodes */}
        {tasks.map((t) => {
          const p = layout.pos.get(t.id)!;
          const tone = TONE[t.status] ?? TONE.PLANNED;
          const selected = selectedId === t.id;
          return (
            <g
              key={t.id}
              transform={`translate(${p.x},${p.y})`}
              onClick={() => onSelect?.(t.id)}
              className="cursor-pointer"
              opacity={t.status === "CANCELLED" ? 0.45 : 1}
            >
              <rect
                width={W} height={H} rx={7}
                fill={selected ? "rgba(21,33,44,0.98)" : "rgba(13,21,29,0.94)"}
                stroke={selected ? "#e8f0f6" : tone}
                strokeWidth={selected ? 1.6 : t.status === "RUNNING" ? 1.5 : 1}
                strokeOpacity={selected ? 0.9 : t.status === "PLANNED" ? 0.45 : 0.8}
              />
              {t.status === "RUNNING" && (
                <rect width={W} height={H} rx={7} fill="none" stroke={tone} strokeWidth={1} opacity={0.35} className="pulse-dot" />
              )}
              <circle cx={13} cy={15} r={3.4} fill={tone}>
                {t.status === "RUNNING" && (
                  <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
                )}
              </circle>
              <text x={24} y={19} fill="#e8f0f6" fontSize={11} fontWeight={600} fontFamily="IBM Plex Sans">
                {truncate(t.title, 24)}
              </text>
              <text x={13} y={36} fill="#5d7386" fontSize={8.5} fontFamily="IBM Plex Mono" letterSpacing="0.08em">
                {agentById(t.agentId).name.toUpperCase()} · {t.priorityScore}
              </text>
              {/* progress track */}
              <rect x={13} y={43} width={W - 26} height={3} rx={1.5} fill="#1a2836" />
              <rect
                x={13} y={43}
                width={(W - 26) * (t.status === "COMPLETED" ? 1 : t.progress / 100)}
                height={3} rx={1.5} fill={tone}
              />
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-2.5">
        {(["RUNNING", "COMPLETED", "READY", "WAITING", "FAILED", "PLANNED"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE[k] }} />
            {k.toLowerCase()}
          </span>
        ))}
        <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut/70">dag · click a node for detail</span>
      </div>
    </div>
  );
}

/* ---------------- planning pipeline (streaming stages) ---------------- */

export function PipelineView({ project }: { project: Project }) {
  return (
    <ol className="space-y-1.5">
      {project.pipeline.map((st, i) => {
        const pct = Math.round((st.shown / st.lines.length) * 100);
        return (
          <li
            key={st.id}
            className={cx(
              "rounded-md border px-3 py-2.5 transition-colors",
              st.status === "running" ? "border-cy/35 bg-cy/5" : st.status === "done" ? "border-line bg-ink-850/60" : "border-line/60 bg-transparent opacity-55",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className={cx(
                "grid h-5 w-5 place-items-center rounded font-mono text-[10px]",
                st.status === "done" ? "bg-mint/15 text-mint" : st.status === "running" ? "bg-cy/15 text-cy" : "bg-ink-700 text-mut",
              )}>
                {st.status === "done" ? "✓" : i + 1}
              </span>
              <span className={cx("font-display text-[12.5px] font-semibold tracking-wide", st.status === "running" ? "text-txt" : st.status === "done" ? "text-sub" : "text-mut")}>
                {st.label}
              </span>
              {st.status === "running" && (
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-cy">
                  <span className="h-1.5 w-1.5 rounded-full bg-cy pulse-dot" /> working
                </span>
              )}
              {st.status === "done" && <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.14em] text-mint">done</span>}
            </div>
            {st.status !== "waiting" && (
              <div className="mt-2 space-y-1 pl-7">
                {st.lines.slice(0, st.shown).map((ln, li) => (
                  <p key={li} className="font-mono text-[10.5px] leading-relaxed text-sub">
                    <span className="mr-1.5 text-mint/70">›</span>
                    {ln}
                    {st.status === "running" && li === st.shown - 1 && <span className="caret ml-1 inline-block h-3 w-[5px] translate-y-[2px] bg-cy" />}
                  </p>
                ))}
                {st.status === "running" && (
                  <div className="pt-1">
                    <div className="h-[3px] w-full max-w-[220px] overflow-hidden rounded bg-ink-700">
                      <div className="h-full rounded bg-cy transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
