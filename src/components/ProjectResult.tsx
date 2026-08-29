import { useEffect, useMemo, useState } from "react";
import { useOS, useActions } from "../store";
import { Icon, StatusBadge, RiskLevelBadge, cx, useNow, Reveal } from "./ui";
import { agentById } from "../data/registry";
import { projectProgress, truncate } from "../engine/engines";

const TYPE_ICON: Record<string, string> = {
  CODE: "terminal", REPORT: "chart", DOCUMENT: "book", DESIGN: "eye",
  UI: "layers", MARKETING: "send", DATA: "pulse", CONFIGURATION: "gear",
};

const TIMELINE_TYPES = [
  "GOAL_CREATED", "PROJECT_CREATED", "PLAN_CREATED", "RISKS_IDENTIFIED", "REVIEW_COMPLETED",
  "APPROVAL_GRANTED", "APPROVAL_REJECTED", "APPROVAL_REQUESTED", "TASK_STARTED", "TASK_FAILED",
  "PLAN_REGENERATED", "TASK_COMPLETED", "ARTIFACT_CREATED", "TOOL_EXECUTED", "METRIC_RECORDED",
  "LEARNING_CREATED", "GOAL_COMPLETED",
];

function fmtDuration(ms: number): string {
  const h = Math.max(0, Math.round(ms / 3600_000));
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))}m`;
  if (h < 48) return `${h}h ${Math.round((ms % 3600_000) / 60_000)}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function ProjectResultWindow({ projectId, onClose, onSwitch }: { projectId: string; onClose: () => void; onSwitch: (id: string) => void }) {
  const s = useOS();
  const a = useActions();
  const now = useNow(1000);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const p = s.projects.find((x) => x.id === projectId);
  const goal = s.goals.find((g) => g.projectId === projectId);
  const tasks = useMemo(() => s.tasks.filter((t) => t.projectId === projectId), [s.tasks, projectId]);
  const artifacts = useMemo(() => s.artifacts.filter((x) => x.projectId === projectId).sort((x, y) => x.ts - y.ts), [s.artifacts, projectId]);
  const risks = useMemo(() => s.risks.filter((r) => r.projectId === projectId).sort((x, y) => y.severity - x.severity), [s.risks, projectId]);
  const learnings = useMemo(() => s.learnings.filter((l) => l.projectId === projectId), [s.learnings, projectId]);
  const outcomes = useMemo(() => s.metrics.filter((m) => m.projectId === projectId && m.name !== "task.cycle_time"), [s.metrics, projectId]);
  const cycles = useMemo(() => s.metrics.filter((m) => m.projectId === projectId && m.name === "task.cycle_time").map((m) => m.value), [s.metrics, projectId]);
  const runs = useMemo(() => s.runs.filter((r) => r.projectId === projectId), [s.runs, projectId]);
  const toolExecs = useMemo(() => s.toolExecs.filter((t) => t.projectId === projectId), [s.toolExecs, projectId]);
  const approvals = useMemo(() => s.approvals.filter((x) => x.projectId === projectId && x.status !== "PENDING"), [s.approvals, projectId]);
  const agg = useMemo(() => s.aggregates.filter((x) => x.projectId === projectId).slice(-1)[0], [s.aggregates, projectId]);
  const timeline = useMemo(
    () => s.events.filter((e) => e.projectId === projectId && TIMELINE_TYPES.includes(e.type)).slice(0, 14),
    [s.events, projectId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!p) return null;

  const completed = p.phase === "COMPLETED";
  const doneCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const recovered = tasks.filter((t) => t.retryCount > 0 && t.status === "COMPLETED").length;
  const tokens = runs.reduce((acc, r) => acc + r.tokens, 0);
  const cost = runs.reduce((acc, r) => acc + r.cost, 0);
  const endTs = s.events.find((e) => e.projectId === projectId && e.type === "GOAL_COMPLETED")?.ts ?? now;
  const founderApproved = toolExecs.filter((t) => t.decision.includes("founder")).length;
  const autoExec = toolExecs.length - founderApproved;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOpen = artifacts.length > 0 && expanded.size === artifacts.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-950/97" role="dialog" aria-modal="true">
      <div className="grid-overlay pointer-events-none fixed inset-0" />
      <div className="noise-overlay pointer-events-none fixed inset-0" />

      {/* window chrome */}
      <div className="sticky top-0 z-10 border-b border-line bg-ink-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Icon name="box" size={15} className="text-mint" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-mut">
              founder os // project result dossier
            </span>
            {p.demo && <span className="chip border-amber/30 text-amber">demo data</span>}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input w-auto py-1.5 font-mono text-[11px]"
              value={projectId}
              onChange={(e) => { a.setActive(e.target.value); onSwitch(e.target.value); }}
              aria-label="switch project"
            >
              {s.projects.map((pp) => (
                <option key={pp.id} value={pp.id}>{pp.name}</option>
              ))}
            </select>
            <button className="btn btn-ghost px-2.5" onClick={onClose} aria-label="close result window">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1080px] px-6 pb-24 pt-10">
        {/* header */}
        <Reveal>
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 max-w-[680px]">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mut">
                  {p.name} · plan v{p.planVersion} · opened {new Date(p.createdAt).toLocaleDateString()}
                </p>
                <h1 className="mt-2 font-display text-[30px] font-bold leading-[1.12] tracking-wide md:text-[40px]">
                  {goal?.title ?? p.name}
                </h1>
                {goal?.description && goal.description !== goal.title && (
                  <p className="mt-3 max-w-[600px] text-[13.5px] leading-relaxed text-sub">{goal.description}</p>
                )}
              </div>
              <div
                className={cx(
                  "shrink-0 rotate-[4deg] rounded border-2 px-5 py-2.5 font-display text-[17px] font-bold tracking-[0.18em]",
                  completed ? "border-mint/70 text-mint" : "border-amber/70 text-amber",
                )}
                style={{ textShadow: completed ? "0 0 24px rgba(69,224,176,0.35)" : "0 0 24px rgba(242,185,92,0.3)" }}
              >
                {completed ? "COMPLETED" : "IN PROGRESS"}
              </div>
            </div>

            {/* stat band */}
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4 lg:grid-cols-8">
              {[
                { v: fmtDuration(endTs - p.createdAt), l: "duration" },
                { v: `${doneCount}/${tasks.length}`, l: "tasks built" },
                { v: `${artifacts.length}`, l: "artifacts" },
                { v: `${projectProgress(s, p.id)}%`, l: "progress" },
                { v: tokens ? tokens.toLocaleString() : "0", l: "tokens" },
                { v: `$${cost.toFixed(2)}`, l: "est. cost" },
                { v: agg ? `${agg.overall}/10` : "—", l: "council score" },
                { v: `${recovered}`, l: "failures recovered" },
              ].map((x) => (
                <div key={x.l} className="bg-ink-900 px-3 py-3.5 text-center transition-colors hover:bg-ink-850">
                  <div className="font-display text-[17px] font-bold leading-none text-txt">{x.v}</div>
                  <div className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 01 — what was asked */}
        <Section no="01" title="What the founder asked for" delay={60}>
          <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
            <div className="rounded-md border border-line bg-ink-900/60 p-4">
              <p className="panel-title mb-2.5">success criteria — founder-defined</p>
              <ul className="space-y-2">
                {(goal?.successCriteria ?? []).map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]">
                    <span className={cx(
                      "mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-sm border",
                      completed ? "border-mint/60 bg-mint/15 text-mint" : "border-line2 text-mut",
                    )} style={{ width: 18, height: 18 }}>
                      {completed ? <Icon name="check" size={11} /> : <span className="h-1 w-1 rounded-full bg-mut" />}
                    </span>
                    <span className={completed ? "text-txt" : "text-sub"}>{c}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">
                {completed ? "evaluated at measurement · all criteria met" : "evaluated when the goal completes"}
              </p>
            </div>
            <div className="space-y-3">
              {goal?.constraints && goal.constraints.length > 0 && (
                <div className="rounded-md border border-line bg-ink-900/60 p-4">
                  <p className="panel-title mb-2">constraints honored</p>
                  <div className="flex flex-wrap gap-1.5">
                    {goal.constraints.map((c, i) => <span key={i} className="chip border-amber/25 text-amber/90">{c}</span>)}
                  </div>
                </div>
              )}
              <div className="rounded-md border border-line bg-ink-900/60 p-4">
                <p className="panel-title mb-2">terms</p>
                <p className="text-[12.5px] text-sub">
                  {goal?.deadline ? <>Deadline <span className="text-txt">{goal.deadline}</span></> : "No deadline set"}
                  {goal?.budget && <> · Budget <span className="text-txt">{goal.budget}</span></>}
                  {" · "}<span className="uppercase">{goal?.priority ?? "P1"}</span>
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* 02 — what was built */}
        <Section
          no="02"
          title={`What was built — ${artifacts.length} versioned artifact${artifacts.length === 1 ? "" : "s"}`}
          delay={90}
          right={
            artifacts.length > 0 && (
              <button className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => setExpanded(allOpen ? new Set() : new Set(artifacts.map((x) => x.id)))}>
                {allOpen ? "collapse all" : "expand all"}
              </button>
            )
          }
        >
          {artifacts.length === 0 ? (
            <p className="rounded-md border border-dashed border-line2 p-5 text-center text-[12.5px] text-mut">
              Nothing shipped yet — agents file an artifact each time a task completes.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {artifacts.map((art, i) => {
                const open = expanded.has(art.id);
                const task = tasks.find((t) => t.id === art.taskId);
                return (
                  <li key={art.id} className="overflow-hidden rounded-md border border-line bg-ink-900/60 transition-colors hover:border-line2">
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => toggle(art.id)}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-ink-750 text-cy">
                        <Icon name={TYPE_ICON[art.type] ?? "box"} size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{art.title}</span>
                        <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">
                          {art.type} · {agentById(art.agentId).name} agent {task && <>· “{truncate(task.title, 44)}”</>}
                        </span>
                      </span>
                      <span className="chip border-cy/30 text-cy">v{art.version}</span>
                      <span className="font-mono text-[10px] text-mut">{new Date(art.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <Icon name="arrow" size={13} className={cx("shrink-0 text-mut transition-transform duration-200", open ? "rotate-90 text-mint" : "")} />
                    </button>
                    <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="overflow-hidden">
                        <pre className="mx-4 mb-4 overflow-x-auto whitespace-pre-wrap rounded-md border border-line bg-ink-950 p-4 font-mono text-[11.5px] leading-relaxed text-sub">
                          {art.content}
                          <span className="text-mint/60">{"\n"}— filed by {agentById(art.agentId).name} · {art.type.toLowerCase()} artifact · v{art.version}</span>
                        </pre>
                      </div>
                    </div>
                    {i === artifacts.length - 1 && !completed && (
                      <p className="border-t border-line px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">
                        more artifacts land here as tasks complete
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* 03 — results */}
        <Section no="03" title="Measured results" delay={120}>
          {!completed && outcomes.length === 0 ? (
            <p className="rounded-md border border-dashed border-amber/25 bg-amber/5 p-5 text-center text-[12.5px] text-amber/90">
              Measurement runs after the last task completes — outcome metrics will appear here, labeled as demo telemetry.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {outcomes.map((m) => (
                <div key={m.id} className="group rounded-md border border-line bg-ink-900/60 p-4 transition-all hover:-translate-y-0.5 hover:border-mint/30">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">{m.name}</p>
                  <p className="mt-2 font-display text-[28px] font-bold leading-none text-mint transition-transform group-hover:scale-[1.03]">{m.value}</p>
                  <p className="mt-1 text-[11px] text-sub">{m.unit} · <span className="text-mut">{m.demo ? "demo telemetry" : "live"}</span></p>
                </div>
              ))}
              {cycles.length > 0 && (
                <div className="rounded-md border border-line bg-ink-900/60 p-4">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">cycle time trend</p>
                  <div className="mt-3 flex items-end gap-1" style={{ height: 44 }}>
                    {cycles.slice(-10).map((c, i) => (
                      <div key={i} className="bar-grow flex-1 rounded-t bg-cy/50 transition-colors hover:bg-cy" style={{ height: `${Math.max(12, (c / Math.max(...cycles)) * 100)}%`, animationDelay: `${i * 40}ms` }} title={`${c} min`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-mut">avg {Math.round(cycles.reduce((x, y) => x + y, 0) / cycles.length)} min per task</p>
                </div>
              )}
            </div>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniStat label="tool executions" value={`${toolExecs.length}`} note={`${autoExec} auto · ${founderApproved} founder-approved`} />
            <MiniStat label="approval decisions" value={`${approvals.length}`} note={`${approvals.filter((x) => x.status === "APPROVED").length} granted · ${approvals.filter((x) => x.status === "REJECTED").length} rejected`} />
            <MiniStat label="agent runs" value={`${runs.length}`} note={`${runs.filter((r) => r.status === "failed").length} failed · all traced`} />
          </div>
        </Section>

        {/* 04 — learned */}
        <Section no="04" title="What was learned" delay={150}>
          {learnings.length === 0 ? (
            <p className="rounded-md border border-dashed border-line2 p-5 text-center text-[12.5px] text-mut">
              Lessons are extracted after measurement and after recovered failures — none stored yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {learnings.map((l) => (
                <li key={l.id} className="rounded-md border border-mint/20 bg-mint/5 p-4 transition-all hover:border-mint/40">
                  <p className="text-[13.5px] font-medium leading-snug">{l.lesson}</p>
                  <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">
                    context · {truncate(l.context, 40)} — applies to · {truncate(l.applicability, 36)} — conf {(l.confidence * 100).toFixed(0)}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 05 — risk & governance */}
        <Section no="05" title="Risks & how they were governed" delay={180}>
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <ul className="space-y-2">
              {risks.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-md border border-line bg-ink-900/60 px-3.5 py-2.5">
                  <span className={cx(
                    "w-12 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[11px] font-semibold",
                    r.severity >= 0.45 ? "bg-coral/15 text-coral" : r.severity >= 0.25 ? "bg-amber/15 text-amber" : "bg-mint/15 text-mint",
                  )}>{r.severity.toFixed(2)}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-sub" title={r.risk}>{r.category}: {r.risk}</span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
            <div className="rounded-md border border-line bg-ink-900/60 p-4">
              <p className="panel-title mb-2.5">trace — goal to result</p>
              <ol className="space-y-1.5 font-mono text-[11px] text-sub">
                {[
                  ["GOAL", goal ? 1 : 0], ["PLAN", p.planVersion], ["TASKS", tasks.length],
                  ["ARTIFACTS", artifacts.length], ["OUTCOMES", outcomes.length], ["LEARNINGS", learnings.length],
                ].map(([label, n], i, arr) => (
                  <li key={label as string} className="flex items-center gap-2">
                    <span className="text-mint">{label}</span>
                    <span className="text-mut">×{n}</span>
                    {i < arr.length - 1 && <Icon name="arrow" size={10} className="ml-1 rotate-90 text-line2" />}
                  </li>
                ))}
              </ol>
              {agg && (
                <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-snug text-mut">
                  Council (pass {agg.pass}, {agg.overall}/10): <span className="text-sub">{agg.consensus}</span>
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* 06 — timeline */}
        <Section no="06" title="How it happened" delay={210}>
          <ol className="relative ml-2 space-y-0 border-l border-line pl-5">
            {timeline.map((e) => (
              <li key={e.id} className="group relative pb-3.5 last:pb-0">
                <span className={cx(
                  "absolute -left-[26.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-ink-950 transition-transform group-hover:scale-125",
                  e.type.includes("FAIL") ? "bg-coral" : e.type.includes("COMPLETED") || e.type.includes("GRANTED") ? "bg-mint" :
                  e.type.includes("APPROVAL") || e.type.includes("REGENERATED") ? "bg-amber" : "bg-cy",
                )} />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">{e.type}</span>
                  <span className="text-[12.5px] text-sub">{e.message}</span>
                  <span className="ml-auto font-mono text-[9.5px] text-mut">{new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut">
            dossier generated from live state · nothing on this page is invented
          </p>
          <button className="btn btn-mint" onClick={onClose}>
            <Icon name="arrow" size={13} className="rotate-180" /> back to console
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ no, title, children, delay = 0, right }: {
  no: string; title: string; children: React.ReactNode; delay?: number; right?: React.ReactNode;
}) {
  return (
    <Reveal delay={delay}>
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[13px] font-bold text-mint/70">{no}</span>
            <h2 className="font-display text-[17px] font-bold tracking-wide">{title}</h2>
            <span className="hidden h-px flex-1 bg-line sm:block" style={{ minWidth: 60 }} />
          </div>
          {right}
        </div>
        {children}
      </section>
    </Reveal>
  );
}

function MiniStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-md border border-line bg-ink-900/60 px-4 py-3">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">{label}</p>
      <p className="mt-1 font-display text-[20px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10.5px] text-mut">{note}</p>
    </div>
  );
}
