import { useMemo, useState } from "react";
import { useOS, useActiveProject } from "../store";
import { Panel, cx, useNow, TimeAgo, EmptyState } from "./ui";
import { truncate } from "../engine/engines";
import type { MemoryType } from "../types";

const TABS = ["reasoning", "memory", "knowledge"] as const;

const MEMORY_META: Record<MemoryType, { label: string; desc: string; tone: string }> = {
  WORKING:    { label: "Working",    desc: "current workflow state",          tone: "text-cy border-cy/30 bg-cy/8" },
  EPISODIC:   { label: "Episodic",   desc: "past events & executions",        tone: "text-mint border-mint/30 bg-mint/8" },
  SEMANTIC:   { label: "Semantic",   desc: "facts & knowledge",               tone: "text-amber border-amber/30 bg-amber/8" },
  PREFERENCE: { label: "Preference", desc: "founder decisions & constraints", tone: "text-ember border-ember/30 bg-ember/8" },
  PROCEDURAL: { label: "Procedural", desc: "what worked — reusable patterns", tone: "text-sub border-line2 bg-ink-800/60" },
};

export function AIBrain() {
  const s = useOS();
  const p = useActiveProject();
  const now = useNow(1000);
  const [tab, setTab] = useState<(typeof TABS)[number]>("reasoning");

  const reasoning = s.reasoning.filter((r) => !p || r.projectId === p.id).slice().reverse();
  const memories = s.memories.filter((m) => !p || m.projectId === p.id);

  return (
    <div className="space-y-4">
      <Panel delay={0} title="AI Brain — reasoning engine · context engine · memory engine" right={
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button key={t} className={cx("btn py-1.5 text-[11px] capitalize", tab === t && "btn-mint")} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      }>
        {tab === "reasoning" && (
          <div>
            <p className="mb-3 rounded-md border border-line bg-ink-900/50 px-3 py-2 font-mono text-[10px] text-mut">
              transparency rule: no hidden chain-of-thought. every decision exposes decision · why · evidence · risk · next · confidence.
            </p>
            {reasoning.length === 0 && <EmptyState icon="brain" title="No structured decisions yet" hint="Decisions are recorded during planning, gating, failures and replans." />}
            <ul className="space-y-2.5">
              {reasoning.map((r) => (
                <li key={r.id} className="rounded-md border border-line bg-ink-900/50 p-3.5 transition-colors hover:border-line2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-semibold leading-snug">{r.decision}</p>
                    <TimeAgo ts={r.ts} now={now} />
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <p className="text-[11.5px] leading-relaxed text-sub"><span className="font-mono text-[10px] uppercase text-cy">why · </span>{r.why}</p>
                    <p className="text-[11.5px] leading-relaxed text-sub"><span className="font-mono text-[10px] uppercase text-mint">evidence · </span>{r.evidence}</p>
                    <p className="text-[11.5px] leading-relaxed text-sub"><span className="font-mono text-[10px] uppercase text-amber">risk · </span>{r.riskNote}</p>
                    <p className="text-[11.5px] leading-relaxed text-sub"><span className="font-mono text-[10px] uppercase text-ember">next · </span>{r.next}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 w-28 overflow-hidden rounded bg-ink-700">
                      <div className="h-full rounded bg-cy/80" style={{ width: `${r.confidence * 100}%` }} />
                    </div>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">confidence {(r.confidence * 100).toFixed(0)}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "memory" && (
          <div>
            <p className="mb-3 rounded-md border border-line bg-ink-900/50 px-3 py-2 font-mono text-[10px] text-mut">
              retrieval is relevance-ranked — nothing is dumped wholesale into a prompt. confidence &amp; importance are inspectable per memory.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(Object.keys(MEMORY_META) as MemoryType[]).map((mt) => {
                const meta = MEMORY_META[mt];
                const items = memories.filter((m) => m.type === mt).slice().reverse();
                return (
                  <div key={mt} className={cx("rounded-lg border p-3.5", meta.tone)}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-[14px] font-bold">{meta.label}</span>
                      <span className="font-mono text-[10px] opacity-80">{items.length}</span>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-70">{meta.desc}</p>
                    <ul className="mt-3 space-y-2">
                      {items.length === 0 && <li className="text-[11px] opacity-60">empty — fills as the OS works</li>}
                      {items.slice(0, 4).map((m) => (
                        <li key={m.id} className="rounded border border-line/60 bg-ink-900/70 p-2">
                          <p className="text-[11px] leading-snug text-sub">{m.content}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="font-mono text-[8.5px] uppercase text-mut">imp {m.importance}/10</span>
                            <div className="h-[3px] w-12 overflow-hidden rounded bg-ink-700">
                              <div className="h-full rounded bg-amber/70" style={{ width: `${m.importance * 10}%` }} />
                            </div>
                            <span className="font-mono text-[8.5px] uppercase text-mut">conf {(m.confidence * 100).toFixed(0)}%</span>
                            <span className="ml-auto font-mono text-[8.5px] text-mut">{m.source}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "knowledge" && <KnowledgeGraph />}
      </Panel>
    </div>
  );
}

/* ---------------- knowledge graph (relational, queried through abstraction) -- */

function KnowledgeGraph() {
  const s = useOS();
  const p = useActiveProject();

  const graph = useMemo(() => {
    if (!p) return null;
    const goal = s.goals.find((g) => g.projectId === p.id);
    const tasks = s.tasks.filter((t) => t.projectId === p.id).slice(0, 8);
    const arts = s.artifacts.filter((x) => x.projectId === p.id).slice(0, 6);
    const lrns = s.learnings.filter((l) => l.projectId === p.id).slice(0, 4);
    const NW = 168; const NH = 30; const GX = 210; const GY = 44;
    const cols: { label: string; items: { id: string; label: string; sub: string; tone: string }[] }[] = [
      { label: "GOAL", items: goal ? [{ id: goal.id, label: truncate(goal.title, 22), sub: goal.priority, tone: "#f2b95c" }] : [] },
      { label: "PROJECT", items: [{ id: p.id, label: truncate(p.name, 22), sub: p.phase, tone: "#56c8f0" }] },
      { label: "TASKS", items: tasks.map((t) => ({ id: t.id, label: truncate(t.title, 22), sub: t.status, tone: t.status === "COMPLETED" ? "#45e0b0" : t.status === "RUNNING" ? "#56c8f0" : "#5d7386" })) },
      { label: "ARTIFACTS", items: arts.map((a) => ({ id: a.id, label: truncate(a.title, 22), sub: `v${a.version} ${a.type}`, tone: "#45e0b0" })) },
      { label: "LEARNINGS", items: lrns.map((l) => ({ id: l.id, label: truncate(l.lesson, 24), sub: `conf ${(l.confidence * 100).toFixed(0)}%`, tone: "#f2b95c" })) },
    ];
    const maxRows = Math.max(...cols.map((c) => c.items.length), 1);
    const pos = new Map<string, { x: number; y: number }>();
    cols.forEach((c, ci) => {
      const off = ((maxRows - c.items.length) * GY) / 2;
      c.items.forEach((it, ri) => pos.set(it.id, { x: 16 + ci * GX, y: 40 + off + ri * GY }));
    });
    return { cols, pos, NW, NH, GX, width: 32 + cols.length * GX, height: 60 + maxRows * GY };
  }, [s, p]);

  if (!p) return <EmptyState icon="layers" title="No project selected" />;
  if (!graph) return null;

  /* edges: goal→project, project→tasks, task→its artifact, last artifact column→learnings */
  const edges: [string, string][] = [];
  const goal = s.goals.find((g) => g.projectId === p.id);
  if (goal) edges.push([goal.id, p.id]);
  const tasks = s.tasks.filter((t) => t.projectId === p.id).slice(0, 8);
  const arts = s.artifacts.filter((x) => x.projectId === p.id).slice(0, 6);
  const lrns = s.learnings.filter((l) => l.projectId === p.id).slice(0, 4);
  tasks.forEach((t) => edges.push([p.id, t.id]));
  arts.forEach((a) => { if (graph.pos.has(a.taskId)) edges.push([a.taskId, a.id]); });
  lrns.forEach((l) => { const from = arts[arts.length - 1]; if (from) edges.push([from.id, l.id]); });

  return (
    <div>
      <p className="mb-3 rounded-md border border-line bg-ink-900/50 px-3 py-2 font-mono text-[10px] text-mut">
        founder → goal → project → task → artifact → outcome → learning → future strategy · relational graph tables, queried through one abstraction
      </p>
      <div className="overflow-x-auto">
        <svg width={graph.width} height={graph.height} className="block">
          {edges.map(([a, b], i) => {
            const pa = graph.pos.get(a); const pb = graph.pos.get(b);
            if (!pa || !pb) return null;
            const x1 = pa.x + graph.NW; const y1 = pa.y + graph.NH / 2;
            const x2 = pb.x; const y2 = pb.y + graph.NH / 2;
            const mx = (x1 + x2) / 2;
            return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#28405466" strokeWidth="1.1" />;
          })}
          {graph.pos.size > 0 && graph.cols.map((c, ci) => (
            <g key={c.label}>
              <text x={16 + ci * graph.GX} y={24} fill="#5d7386" fontSize="9" fontFamily="IBM Plex Mono" letterSpacing="0.14em">{c.label}</text>
              {c.items.map((it) => {
                const pos = graph.pos.get(it.id)!;
                return (
                  <g key={it.id} transform={`translate(${pos.x},${pos.y})`}>
                    <rect width={graph.NW} height={graph.NH} rx={6} fill="rgba(13,21,29,0.95)" stroke={it.tone} strokeOpacity={0.55} />
                    <circle cx={11} cy={graph.NH / 2} r={2.6} fill={it.tone} />
                    <text x={20} y={graph.NH / 2 - 1} fill="#e8f0f6" fontSize="9.5" fontWeight={600} fontFamily="IBM Plex Sans">{it.label}</text>
                    <text x={20} y={graph.NH / 2 + 9} fill="#5d7386" fontSize="7" fontFamily="IBM Plex Mono" letterSpacing="0.08em">{it.sub.toUpperCase()}</text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      {graph.pos.size <= 2 && <p className="mt-2 text-[11.5px] text-mut">Graph grows as tasks produce artifacts and the learning engine stores outcomes.</p>}
    </div>
  );
}
