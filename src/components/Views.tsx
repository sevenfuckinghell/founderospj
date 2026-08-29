import { useState } from "react";
import { useOS, useActions } from "../store";
import { Icon, Panel, StatusBadge, ProgressBar, RiskLevelBadge, cx, useNow, TimeAgo, EmptyState } from "./ui";
import { PhaseChip } from "./Shell";
import { AGENTS, agentById, toolById } from "../data/registry";
import { getPack } from "../engine/planner";
import { resolveModel, modelById } from "../providers";
import { projectProgress, severityTone, truncate, fmtAgo } from "../engine/engines";
import type { Project, Task } from "../types";

/* ================= PROJECTS ================= */

export function ProjectsView({ onResult }: { onResult?: (id: string) => void }) {
  const s = useOS();
  const a = useActions();
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = s.projects.find((p) => p.id === detailId);

  if (detail) return <ProjectDetail project={detail} onBack={() => setDetailId(null)} onOpen={(id) => a.setActive(id)} onResult={onResult} />;

  const wsProjects = s.projects.filter((p) => p.workspaceId === s.activeWorkspaceId);
  const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mut">
          workspace <span className="text-mint">{ws?.name ?? "—"}</span> · {wsProjects.length} project{wsProjects.length === 1 ? "" : "s"}
        </p>
        <p className="hidden font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut sm:block">scoped by org → workspace isolation</p>
      </div>

      {wsProjects.length === 0 && (
        <div className="rounded-lg border border-dashed border-line2 bg-ink-900/40 px-6 py-10 text-center">
          <p className="font-display text-[15px] font-bold text-sub">No projects in this workspace yet</p>
          <p className="mx-auto mt-1 max-w-[380px] text-[12px] leading-relaxed text-mut">
            Projects are isolated per workspace. Switch workspace in the header, or create a goal and the
            planner will file the new project under <span className="text-mint">{ws?.name ?? "this workspace"}</span>.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
      {wsProjects.map((p, i) => {
        const tasks = s.tasks.filter((t) => t.projectId === p.id);
        const done = tasks.filter((t) => t.status === "COMPLETED").length;
        const risks = s.risks.filter((r) => r.projectId === p.id && r.status !== "MITIGATED").length;
        const arts = s.artifacts.filter((x) => x.projectId === p.id).length;
        return (
          <Panel key={p.id} delay={i * 60} className="cursor-pointer transition-colors hover:border-line2" >
            <button className="block w-full text-left" onClick={() => { a.setActive(p.id); setDetailId(p.id); }}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[15px] font-bold tracking-wide">{p.name}</span>
                <PhaseChip phase={p.phase} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                {p.demo && <span className="chip border-amber/30 text-amber">demo data</span>}
                <span className="chip">plan v{p.planVersion}</span>
                <span className="font-mono text-[10px] text-mut">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={projectProgress(s, p.id)} className="flex-1" />
                <span className="font-mono text-[11px] text-mint">{projectProgress(s, p.id)}%</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
                <div><div className="font-display text-[16px] font-bold">{done}/{tasks.length}</div><div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-mut">tasks</div></div>
                <div><div className={cx("font-display text-[16px] font-bold", risks > 3 ? "text-coral" : "")}>{risks}</div><div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-mut">risks</div></div>
                <div><div className="font-display text-[16px] font-bold">{arts}</div><div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-mut">artifacts</div></div>
                <div><div className="font-display text-[16px] font-bold">{s.learnings.filter((l) => l.projectId === p.id).length}</div><div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-mut">lessons</div></div>
              </div>
            </button>
            {onResult && (
              <div className="mt-3 border-t border-line pt-3">
                <button
                  className={cx("btn w-full py-1.5 text-[11.5px]", p.phase === "COMPLETED" ? "btn-mint" : "")}
                  onClick={(e) => { e.stopPropagation(); onResult(p.id); }}
                >
                  <Icon name="box" size={13} />
                  {p.phase === "COMPLETED" ? "view result dossier" : "view built so far"}
                </button>
              </div>
            )}
          </Panel>
        );
      })}
      </div>
    </div>
  );
}

function ProjectDetail({ project: p, onBack, onOpen, onResult }: { project: Project; onBack: () => void; onOpen: (id: string) => void; onResult?: (id: string) => void }) {
  const s = useOS();
  const now = useNow(1000);
  const [tab, setTab] = useState<"overview" | "roadmap" | "risks">("overview");
  const goal = s.goals.find((g) => g.projectId === p.id);
  const tasks = s.tasks.filter((t) => t.projectId === p.id);
  const risks = s.risks.filter((r) => r.projectId === p.id).sort((x, y) => y.severity - x.severity);
  const arts = s.artifacts.filter((x) => x.projectId === p.id);
  const pack = getPack(p.domain);

  return (
    <div className="space-y-4">
      <Panel delay={0}>
        <button className="mb-3 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-mut transition-colors hover:text-txt" onClick={onBack}>
          <Icon name="arrow" size={12} className="rotate-180" /> all projects
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[20px] font-bold tracking-wide">{p.name}</h2>
            <p className="mt-0.5 max-w-[560px] text-[12.5px] text-sub">{goal?.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <PhaseChip phase={p.phase} />
            {onResult && (
              <button className={cx("btn", p.phase === "COMPLETED" && "btn-mint")} onClick={() => onResult(p.id)}>
                <Icon name="box" size={13} /> {p.phase === "COMPLETED" ? "result dossier" : "built so far"}
              </button>
            )}
            {s.activeProjectId !== p.id && <button className="btn" onClick={() => onOpen(p.id)}>make active</button>}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {(["overview", "roadmap", "risks"] as const).map((t) => (
            <button key={t} className={cx("btn py-1.5 text-[11.5px] capitalize", tab === t && "btn-mint")} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </Panel>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Goal & success criteria" delay={40}>
            <p className="text-[13px] font-medium leading-snug">{goal?.title}</p>
            <ul className="mt-3 space-y-1.5">
              {(goal?.successCriteria ?? []).map((c, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-sub"><span className="text-mint">✓</span>{c}</li>
              ))}
            </ul>
            {goal?.constraints && goal.constraints.length > 0 && (
              <>
                <p className="panel-title mt-4">constraints</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {goal.constraints.map((c, i) => <span key={i} className="chip border-amber/25 text-amber/90">{c}</span>)}
                </div>
              </>
            )}
            <p className="mt-4 font-mono text-[10px] text-mut">
              priority {goal?.priority} {goal?.deadline && `· deadline ${goal.deadline}`} {goal?.budget && `· budget ${goal.budget}`}
            </p>
          </Panel>
          <Panel title="Recent artifacts" delay={80}>
            {arts.length === 0 && <p className="text-[12px] text-mut">No artifacts yet — agents file them on task completion.</p>}
            <ul className="space-y-1.5">
              {arts.slice(-6).reverse().map((art) => (
                <li key={art.id} className="flex items-center gap-2.5 rounded-md border border-line bg-ink-900/50 px-2.5 py-2">
                  <Icon name="box" size={13} className="shrink-0 text-cy" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-sub">{art.title}</span>
                  <span className="chip">v{art.version}</span>
                  <TimeAgo ts={art.ts} now={now} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {tab === "roadmap" && (
        <Panel title="Roadmap — milestones" delay={40}>
          <div className="relative mb-6 mt-2 px-2">
            <div className="absolute left-2 right-2 top-[13px] h-[2px] bg-ink-700" />
            <div className="relative flex justify-between">
              {pack.milestones.map((m, i) => {
                const keys = m.keys;
                const done = keys.filter((k) => tasks.some((t) => t.key === k && t.status === "COMPLETED")).length;
                const active = keys.some((k) => tasks.some((t) => t.key === k && ["RUNNING", "WAITING", "READY"].includes(t.status)));
                const complete = done === keys.length;
                return (
                  <div key={m.title} className="flex w-1/4 flex-col items-center">
                    <span className={cx(
                      "z-10 grid h-7 w-7 place-items-center rounded-full border-2 font-mono text-[10px]",
                      complete ? "border-mint bg-mint/15 text-mint" : active ? "border-cy bg-cy/15 text-cy pulse-dot" : "border-line2 bg-ink-850 text-mut",
                    )}>
                      {complete ? "✓" : i + 1}
                    </span>
                    <span className={cx("mt-2 text-center font-display text-[11.5px] font-semibold", complete ? "text-mint" : active ? "text-cy" : "text-mut")}>{m.title}</span>
                    <span className="font-mono text-[9px] text-mut">{done}/{keys.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-md border border-line bg-ink-900/40 px-3 py-2">
                <span className={cx("h-1.5 w-1.5 rounded-full", t.status === "COMPLETED" ? "bg-mint" : t.status === "RUNNING" ? "bg-cy pulse-dot" : t.status === "FAILED" || t.status === "BLOCKED" ? "bg-coral" : t.status === "WAITING" ? "bg-amber" : "bg-mut")} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-sub">{t.title}</span>
                <span className="font-mono text-[10px] text-mut">{agentById(t.agentId).name}</span>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === "risks" && (
        <Panel title="Risk register — severity = probability × impact" delay={40}>
          <ul className="space-y-2">
            {risks.map((r) => (
              <li key={r.id} className="rounded-md border border-line bg-ink-900/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx(
                    "rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                    severityTone(r.severity) === "coral" ? "bg-coral/15 text-coral" : severityTone(r.severity) === "amber" ? "bg-amber/15 text-amber" : "bg-mint/15 text-mint",
                  )}>{r.severity.toFixed(2)}</span>
                  <span className="chip">{r.category}</span>
                  <StatusBadge status={r.status} />
                  <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">owner · {r.owner}</span>
                </div>
                <p className="mt-2 text-[13px] font-medium">{r.risk}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded bg-ink-800/70 px-2 py-1.5"><span className="font-mono text-[9px] uppercase text-mut">probability</span><div className="text-[12px] text-sub">{(r.probability * 100).toFixed(0)}%</div></div>
                  <div className="rounded bg-ink-800/70 px-2 py-1.5"><span className="font-mono text-[9px] uppercase text-mut">impact</span><div className="text-[12px] text-sub">{(r.impact * 100).toFixed(0)}%</div></div>
                  <div className="rounded bg-ink-800/70 px-2 py-1.5"><span className="font-mono text-[9px] uppercase text-mut">mitigation</span><div className="text-[11px] leading-snug text-sub">{r.mitigation}</div></div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ================= TASKS ================= */

const FILTERS = ["ALL", "RUNNING", "READY", "WAITING", "ISSUES", "COMPLETED", "PLANNED"] as const;

export function TasksView() {
  const s = useOS();
  const a = useActions();
  const now = useNow(1000);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const match = (t: Task) => {
    if (filter === "ALL") return true;
    if (filter === "ISSUES") return ["FAILED", "BLOCKED", "WAITING"].includes(t.status);
    return t.status === filter;
  };
  const tasks = s.tasks.filter(match).sort((x, y) => y.priorityScore - x.priorityScore);

  return (
    <div className="space-y-4">
      <Panel delay={0} title="Task queue — ordered by deterministic priority score" right={
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} className={cx("chip cursor-pointer transition-colors", filter === f && "border-mint/40 text-mint")} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      }>
        {tasks.length === 0 && <EmptyState icon="list" title={`No tasks in ${filter}`} hint="Tasks appear when a goal is planned." />}
        <ul className="divide-y divide-line/60">
          {tasks.map((t) => {
            const proj = s.projects.find((p) => p.id === t.projectId);
            const open = expanded === t.id;
            return (
              <li key={t.id}>
                <button className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-ink-800/50" onClick={() => setExpanded(open ? null : t.id)}>
                  <StatusBadge status={t.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{t.title}</span>
                    <span className="block font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">
                      {proj?.name} · {agentById(t.agentId).name}{t.retryCount > 0 && ` · retry ${t.retryCount}`}
                    </span>
                  </span>
                  {t.status === "RUNNING" && <ProgressBar value={t.progress} tone="bg-cy" className="w-24" />}
                  <span className="w-16 text-right font-display text-[15px] font-bold text-cy">{t.priorityScore}</span>
                  <span className="font-mono text-[9px] uppercase text-mut">score</span>
                </button>
                {open && (
                  <div className="slide-in mb-3 ml-2 grid gap-3 rounded-md border border-line bg-ink-900/60 p-3 md:grid-cols-[1.3fr_1fr]">
                    <div>
                      <p className="text-[12.5px] text-sub">{t.desc}</p>
                      <p className="mt-2 font-mono text-[10.5px] text-mut">why this score — {t.priorityReason}</p>
                      <p className="panel-title mt-3">acceptance criteria</p>
                      <ul className="mt-1 space-y-1">
                        {t.acceptance.map((c, i) => <li key={i} className="flex gap-1.5 text-[12px] text-sub"><span className="text-mint">✓</span>{c}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {t.dependsOn.length ? t.dependsOn.map((d) => <span key={d} className="chip">dep · {d}</span>) : <span className="chip">no deps</span>}
                        {t.tools.map((tl) => (
                          <span key={tl} className="chip border-cy/25 text-cy/90">{toolById(tl).name} · {toolById(tl).riskLevel}</span>
                        ))}
                      </div>
                      <div className="rounded bg-ink-800/70 p-2 font-mono text-[10px] text-mut">
                        created {fmtAgo(t.createdAt, now)}{t.startedAt && ` · started ${fmtAgo(t.startedAt, now)}`}{t.completedAt && ` · done ${fmtAgo(t.completedAt, now)}`}
                      </div>
                      {(t.status === "FAILED" || t.status === "BLOCKED") && (
                        <button className="btn btn-amber w-full" onClick={() => a.retryTask(t.id)}>
                          <Icon name="refresh" size={13} /> Retry with fallback (attempt {t.retryCount + 2})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/* ================= AGENTS ================= */

export function AgentsView() {
  const s = useOS();
  const now = useNow(1000);
  const runs = [...s.runs].sort((x, y) => y.startedAt - x.startedAt).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {AGENTS.map((ag, i) => {
          const count = s.runs.filter((r) => r.agentId === ag.id).length;
          const live = s.runs.some((r) => r.agentId === ag.id && r.status === "running");
          return (
            <Panel key={ag.id} delay={i * 40} className={cx(live && "border-cy/35")}>
              <div className="flex items-center gap-2.5">
                <div className={cx("grid h-9 w-9 place-items-center rounded-lg border", live ? "border-cy/40 bg-cy/10 text-cy" : "border-line bg-ink-800 text-sub")}>
                  <Icon name="bot" size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-[13.5px] font-bold">{ag.name}</span>
                    {live && <span className="h-1.5 w-1.5 rounded-full bg-cy pulse-dot" />}
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-mut">{ag.version} · {modelById(resolveModel(s.providerConfig, ag.id)).name}</span>
                </div>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-snug text-sub">{ag.role}</p>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {ag.capabilities.map((c) => <span key={c} className="chip">{c}</span>)}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                <span className="font-mono text-[10px] text-mut">{count} runs</span>
                <RiskLevelBadge level={ag.riskLevel} />
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title="Recent agent runs — observability per execution" delay={100}>
        {runs.length === 0 && <EmptyState icon="bot" title="No agent runs yet" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line">
                {["agent", "task", "status", "tokens", "latency", "cost", "prompt", "when"].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {runs.map((r) => {
                const t = s.tasks.find((x) => x.id === r.taskId);
                return (
                  <tr key={r.id} className="transition-colors hover:bg-ink-800/40">
                    <td className="py-2 pr-3 text-[12.5px] font-medium">{agentById(r.agentId).name}</td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-[12px] text-sub">{t?.title ?? "—"}</td>
                    <td className="py-2 pr-3"><StatusBadge status={r.status === "running" ? "RUNNING" : r.status === "failed" ? "FAILED" : "COMPLETED"} /></td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-sub">{r.tokens || "—"}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-sub">{r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-sub">{r.cost ? `$${r.cost.toFixed(3)}` : "—"}</td>
                    <td className="py-2 pr-3 font-mono text-[10px] text-mut">{r.promptVersion}</td>
                    <td className="py-2"><TimeAgo ts={r.startedAt} now={now} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[9.5px] text-mut">telemetry simulated in demo mode · every run carries correlation ids (run → task → workflow → goal)</p>
      </Panel>
    </div>
  );
}

/* ================= ARTIFACTS ================= */

export function ArtifactsView() {
  const s = useOS();
  const now = useNow(1000);
  const [sel, setSel] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const arts = s.artifacts.filter((x) => typeFilter === "ALL" || x.type === typeFilter).sort((x, y) => y.ts - x.ts);
  const types = ["ALL", ...Array.from(new Set(s.artifacts.map((x) => x.type)))];
  const selected = s.artifacts.find((x) => x.id === sel) ?? arts[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
      <Panel title="Artifact store — versioned, linked to task + agent" delay={0} right={
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <button key={t} className={cx("chip cursor-pointer", typeFilter === t && "border-mint/40 text-mint")} onClick={() => setTypeFilter(t)}>{t}</button>
          ))}
        </div>
      }>
        {arts.length === 0 && <EmptyState icon="box" title="No artifacts yet" hint="Agents file a versioned artifact on every task completion." />}
        <ul className="max-h-[640px] space-y-1.5 overflow-y-auto pr-1">
          {arts.map((art) => (
            <li key={art.id}>
              <button
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                  selected?.id === art.id ? "border-mint/40 bg-mint/5" : "border-line bg-ink-900/50 hover:border-line2",
                )}
                onClick={() => setSel(art.id)}
              >
                <Icon name="box" size={14} className="shrink-0 text-cy" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{art.title}</span>
                  <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-mut">
                    {art.type} · {agentById(art.agentId).name} · {fmtAgo(art.ts, now)}
                  </span>
                </span>
                <span className="chip border-mint/25 text-mint">v{art.version}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={selected ? truncate(selected.title, 48) : "Artifact"} delay={60}>
        {!selected ? (
          <EmptyState icon="eye" title="Select an artifact" />
        ) : (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="chip border-cy/25 text-cy">{selected.type}</span>
              <span className="chip">v{selected.version}</span>
              <span className="font-mono text-[10px] text-mut">
                task: {truncate(s.tasks.find((t) => t.id === selected.taskId)?.title ?? "—", 40)}
              </span>
            </div>
            <pre className="scan-wrap max-h-[560px] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-ink-950/80 p-4 font-mono text-[11.5px] leading-relaxed text-sub">
              {selected.content}
            </pre>
          </div>
        )}
      </Panel>
    </div>
  );
}
