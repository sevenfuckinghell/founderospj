import { useState } from "react";
import { useOS, useActions, useActiveProject } from "../store";
import { Icon, Panel, StatusBadge, ProgressBar, RiskLevelBadge, cx, useNow, TimeAgo, EmptyState } from "./ui";
import { PhaseChip } from "./Shell";
import { WorkflowGraph, PipelineView } from "./WorkflowGraph";
import { agentById, toolById } from "../data/registry";
import { projectProgress, pendingApprovals, truncate } from "../engine/engines";
import type { ViewId } from "./Shell";

export function CommandCenter({ goto }: { goto: (v: ViewId) => void }) {
  const s = useOS();
  const a = useActions();
  const p = useActiveProject();
  const now = useNow(1000);
  const [selected, setSelected] = useState<string | null>(null);

  if (!p) {
    return <EmptyState icon="radar" title="No project in the console" hint="Create a goal and the planning pipeline will light up here." />;
  }

  const tasks = s.tasks.filter((t) => t.projectId === p.id);
  const goal = s.goals.find((g) => g.projectId === p.id);
  const runs = s.runs.filter((r) => r.projectId === p.id);
  const liveRuns = runs.filter((r) => r.status === "running");
  const reasoningFeed = s.reasoning.filter((r) => r.projectId === p.id).slice(-4).reverse();
  const toolExecs = s.toolExecs.filter((t) => t.projectId === p.id).slice(-6).reverse();
  const pend = pendingApprovals(s).filter((x) => x.projectId === p.id);
  const sel = tasks.find((t) => t.id === selected) ?? null;
  const agg = s.aggregates.filter((x) => x.projectId === p.id).slice(-1)[0];

  return (
    <div className="space-y-4">
      {/* objective header */}
      <Panel delay={0}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="relative">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-cy/30 bg-cy/10 text-cy">
              <Icon name="radar" size={20} />
            </div>
            {liveRuns.length > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cy pulse-dot" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="panel-title mb-1">current objective</div>
            <h2 className="truncate font-display text-[18px] font-bold tracking-wide">{goal?.title ?? p.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <PhaseChip phase={p.phase} />
            <div className="w-40">
              <div className="mb-1 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">
                <span>workflow</span><span className="text-mint">{projectProgress(s, p.id)}%</span>
              </div>
              <ProgressBar value={projectProgress(s, p.id)} />
            </div>
            {p.phase === "PLANNING" && (
              <button className="btn" onClick={a.skipPlanning} title="Fast-forward the planning pipeline">
                <Icon name="zap" size={13} /> Skip planning
              </button>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          {/* workflow */}
          <Panel
            title={p.phase === "PLANNING" || p.phase === "PLAN_REVIEW" ? `Planning pipeline · plan v${p.planVersion}` : "Execution workflow · task DAG"}
            delay={60}
            right={<span className="chip">{tasks.length} tasks</span>}
          >
            {p.phase === "PLANNING" || p.phase === "PLAN_REVIEW" ? (
              <PipelineView project={p} />
            ) : (
              <WorkflowGraph tasks={tasks} selectedId={selected} onSelect={setSelected} />
            )}
          </Panel>

          {/* plan review checkpoint */}
          {p.phase === "PLAN_REVIEW" && (
            <Panel title="Execution plan — approval checkpoint" delay={100} right={agg && <span className="chip border-cy/30 text-cy">council {agg.overall}/10</span>}>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-line bg-ink-900/50 p-3">
                  <p className="panel-title mb-2">objectives</p>
                  <ul className="space-y-1.5">
                    {(s.goals.find((g) => g.projectId === p.id)?.successCriteria ?? []).map((c, i) => (
                      <li key={i} className="flex gap-1.5 text-[12px] text-sub"><span className="text-mint">›</span>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-md border border-line bg-ink-900/50 p-3">
                  <p className="panel-title mb-2">shape</p>
                  <p className="text-[12px] leading-relaxed text-sub">
                    {tasks.length} tasks · {new Set(tasks.flatMap((t) => t.dependsOn)).size} dependency edges<br />
                    {s.risks.filter((r) => r.projectId === p.id).length} risks registered<br />
                    {tasks.filter((t) => t.tools.some((tl) => ["HIGH", "CRITICAL"].includes(toolById(tl).riskLevel))).length} tasks touch HIGH-risk tools
                  </p>
                </div>
                <div className="rounded-md border border-line bg-ink-900/50 p-3">
                  <p className="panel-title mb-2">council critical issues</p>
                  <ul className="space-y-1.5">
                    {(agg?.critical ?? []).map((c, i) => (
                      <li key={i} className="flex gap-1.5 text-[12px] text-sub"><span className="text-amber">!</span>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {pend.filter((x) => x.kind === "PLAN").map((ap) => (
                  <div key={ap.id} className="flex gap-2">
                    <button className="btn btn-mint" onClick={() => { a.decideApproval(ap.id, "APPROVED"); }}>
                      <Icon name="check" size={13} /> Approve plan v{p.planVersion}
                    </button>
                    <button className="btn btn-coral" onClick={() => a.decideApproval(ap.id, "REJECTED")}>
                      <Icon name="refresh" size={13} /> Reject → force replan
                    </button>
                  </div>
                ))}
                <span className="font-mono text-[10px] text-mut">rejecting triggers the regeneration engine — a structurally different plan, not a resubmission</span>
              </div>
            </Panel>
          )}

          {/* selected task detail */}
          {sel && (
            <Panel title="Task detail" delay={40} right={<StatusBadge status={sel.status} />}>
              <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <h3 className="font-display text-[15px] font-bold">{sel.title}</h3>
                  <p className="mt-1 text-[12.5px] text-sub">{sel.desc}</p>
                  <p className="mt-2 text-[11.5px] text-mut"><span className="text-sub">Priority {sel.priorityScore}</span> — {sel.priorityReason}</p>
                  <p className="mt-2 panel-title">acceptance criteria</p>
                  <ul className="mt-1 space-y-1">
                    {sel.acceptance.map((c, i) => (
                      <li key={i} className="flex gap-1.5 text-[12px] text-sub"><span className="text-mint">✓</span>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-md border border-line bg-ink-900/50 p-2.5">
                    <p className="panel-title mb-1.5">deterministic factors</p>
                    {Object.entries(sel.factors).map(([k, v]) => (
                      <div key={k} className="mb-1 flex items-center gap-2 last:mb-0">
                        <span className="w-20 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">{k}</span>
                        <div className="h-1 flex-1 overflow-hidden rounded bg-ink-700">
                          <div className="h-full rounded bg-cy/70" style={{ width: `${v * 10}%` }} />
                        </div>
                        <span className="w-4 text-right font-mono text-[10px] text-sub">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sel.dependsOn.length > 0 ? sel.dependsOn.map((d) => <span key={d} className="chip">dep · {d}</span>) : <span className="chip">no dependencies</span>}
                    {sel.tools.map((t) => <span key={t} className="chip border-cy/25 text-cy/90">{toolById(t).name}</span>)}
                  </div>
                  {(sel.status === "FAILED" || sel.status === "BLOCKED") && (
                    <button className="btn btn-amber w-full" onClick={() => a.retryTask(sel.id)}>
                      <Icon name="refresh" size={13} /> Retry with fallback (attempt {sel.retryCount + 2})
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* right rail */}
        <div className="space-y-4">
          <Panel title="Active agents" delay={90}>
            {liveRuns.length === 0 ? (
              <p className="text-[12px] text-mut">{s.paused ? "Paused — agents idle." : "No agent mid-run. Dispatcher pulls from READY in priority order."}</p>
            ) : (
              <ul className="space-y-2.5">
                {liveRuns.map((r) => {
                  const t = tasks.find((x) => x.id === r.taskId);
                  const ag = agentById(r.agentId);
                  return (
                    <li key={r.id} className="rounded-md border border-cy/25 bg-cy/5 p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-cy pulse-dot" />
                        <span className="font-display text-[13px] font-semibold">{ag.name}</span>
                        <span className="chip ml-auto">{r.model}</span>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-sub">{t?.title}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar value={r.progress} tone="bg-cy" className="flex-1" />
                        <span className="font-mono text-[10.5px] text-cy">{r.progress}%</span>
                      </div>
                      <p className="mt-1.5 font-mono text-[9.5px] text-mut">prompt {r.promptVersion} · started {r.startedAt ? new Date(r.startedAt).toLocaleTimeString() : "—"}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            <button className="btn btn-ghost mt-2 w-full py-1.5 text-[11px]" onClick={() => goto("agents")}>
              agent registry <Icon name="arrow" size={12} />
            </button>
          </Panel>

          <Panel title="Reasoning trace — structured, not hidden" delay={130}>
            {reasoningFeed.length === 0 && <p className="text-[12px] text-mut">No decisions recorded yet.</p>}
            <ul className="space-y-2.5">
              {reasoningFeed.map((r) => (
                <li key={r.id} className="rounded-md border border-line bg-ink-900/50 p-2.5">
                  <p className="text-[12px] font-semibold leading-snug">{r.decision}</p>
                  <div className="mt-1.5 space-y-0.5 font-mono text-[10px] leading-relaxed text-mut">
                    <p><span className="text-cy">why</span> · {truncate(r.why, 90)}</p>
                    <p><span className="text-amber">risk</span> · {truncate(r.riskNote, 70)}</p>
                    <p><span className="text-mint">next</span> · {truncate(r.next, 70)}</p>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-mut">confidence {(r.confidence * 100).toFixed(0)}%</span>
                    <TimeAgo ts={r.ts} now={now} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Tool executions" delay={170} right={<button className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => goto("events")}>audit <Icon name="arrow" size={12} /></button>}>
            {toolExecs.length === 0 ? (
              <p className="text-[12px] text-mut">No tools executed yet — every call is audit-logged here.</p>
            ) : (
              <ul className="space-y-1.5">
                {toolExecs.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded border border-line/70 bg-ink-900/40 px-2 py-1.5">
                    <span className={cx("h-1.5 w-1.5 rounded-full", t.status === "SUCCESS" ? "bg-mint" : "bg-coral")} />
                    <span className="font-mono text-[10.5px] text-sub">{toolById(t.toolId).name}</span>
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-mut">{t.decision}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {pend.length > 0 && (
            <Panel title="Gates awaiting you" delay={200}>
              <ul className="space-y-2">
                {pend.map((ap) => (
                  <li key={ap.id} className="rounded-md border border-amber/25 bg-amber/5 p-2.5">
                    <div className="flex items-center gap-2">
                      {ap.kind === "PLAN" ? <span className="chip border-cy/30 text-cy">PLAN</span> : <RiskLevelBadge level={ap.riskLevel as string} />}
                      <span className="truncate text-[12px] font-medium">{truncate(ap.title, 44)}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button className="btn btn-mint flex-1 py-1 text-[11px]" onClick={() => a.decideApproval(ap.id, "APPROVED")}>approve</button>
                      <button className="btn btn-coral flex-1 py-1 text-[11px]" onClick={() => a.decideApproval(ap.id, "REJECTED")}>reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
