import { useOS, useActions, useActiveProject } from "../store";
import { Icon, Panel, Stat, StatusBadge, Sparkline, ProgressBar, cx, useNow, RiskLevelBadge, TimeAgo } from "./ui";
import { PhaseChip } from "./Shell";
import { agentById } from "../data/registry";
import { pendingApprovals, openRisks, projectProgress, severityTone, truncate, fmtAgo } from "../engine/engines";
import type { ViewId } from "./Shell";

export function Dashboard({ goto, openResult }: { goto: (v: ViewId) => void; openResult: (id: string) => void }) {
  const s = useOS();
  const a = useActions();
  const p = useActiveProject();
  const now = useNow(1000);

  const tasks = s.tasks.filter((t) => t.projectId === p?.id);
  const goal = s.goals.find((g) => g.projectId === p?.id);
  const running = tasks.filter((t) => t.status === "RUNNING");
  const runningTask = running[0];
  const runningRun = runningTask ? s.runs.find((r) => r.taskId === runningTask.id && r.status === "running") : undefined;
  const waiting = tasks.filter((t) => ["WAITING", "BLOCKED", "FAILED"].includes(t.status));
  const pend = pendingApprovals(s);
  const risks = openRisks(s).filter((r) => r.projectId === p?.id).sort((x, y) => y.severity - x.severity);
  const doneCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const agentsRunning = s.runs.filter((r) => r.status === "running").length;
  const latestReasoning = s.reasoning.filter((r) => r.projectId === p?.id).slice(-1)[0];

  /* completions per 15-min bucket over last 3h — real event data */
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const e of s.events) {
    if (e.type !== "TASK_COMPLETED") continue;
    const idx = 11 - Math.floor((now - e.ts) / (15 * 60_000));
    if (idx >= 0 && idx < 12) buckets[idx] += 1;
  }
  const completedToday = s.events.filter((e) => e.type === "TASK_COMPLETED" && now - e.ts < 86_400_000).length;

  return (
    <div className="space-y-4">
      {/* Q1 — what am I trying to achieve */}
      <Panel delay={0}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-[640px]">
            <div className="panel-title mb-2 flex items-center gap-2">
              <Icon name="target" size={12} /> active goal {p?.demo && <span className="chip border-amber/30 text-amber">demo workspace</span>}
            </div>
            <h2 className="font-display text-[22px] font-bold leading-snug tracking-wide md:text-[26px]">
              {goal ? goal.title : "No goal yet — the console is idle."}
            </h2>
            {goal && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {goal.successCriteria.map((c, i) => (
                  <span key={i} className="chip border-mint/25 text-mint/90">✓ {c}</span>
                ))}
                {goal.deadline && <span className="chip border-amber/30 text-amber">deadline · {goal.deadline}</span>}
                {goal.budget && <span className="chip">budget · {goal.budget}</span>}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {p && <PhaseChip phase={p.phase} />}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-display text-[30px] font-bold leading-none text-mint">{p ? projectProgress(s, p.id) : 0}%</div>
                <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-mut">{doneCount}/{tasks.length} tasks</div>
              </div>
              <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                <circle cx="32" cy="32" r="27" fill="none" stroke="#1a2836" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="27" fill="none" stroke="#45e0b0" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${((p ? projectProgress(s, p.id) : 0) / 100) * 169.6} 169.6`}
                  style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}
                />
              </svg>
            </div>
            {p && (
              <button
                className={p.phase === "COMPLETED" ? "btn btn-mint" : "btn"}
                onClick={() => openResult(p.id)}
                title="Open the project result dossier in its own window"
              >
                <Icon name="box" size={13} /> {p.phase === "COMPLETED" ? "view result" : "view built so far"}
              </button>
            )}
            <button className="btn btn-mint" onClick={() => goto("goals")}>
              <Icon name="plus" size={13} /> new goal
            </button>
          </div>
        </div>
      </Panel>

      {/* KPI strip — computed, never invented */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <Stat label="Active projects" value={s.projects.length} icon="folder" sub={`${s.projects.filter((x) => x.phase === "EXECUTING").length} executing`} delay={0} />
        <Stat label="Tasks today" value={completedToday} icon="check" sub="completed, all projects" delay={30} />
        <Stat label="Running" value={running.length} tone="text-cy" icon="zap" sub={runningTask ? truncate(runningTask.title, 26) : "queue idle"} delay={60} />
        <Stat label="Blocked / waiting" value={waiting.length} tone={waiting.length ? "text-amber" : "text-txt"} icon="alert" sub="need a decision or retry" delay={90} />
        <Stat label="Agents running" value={agentsRunning} tone="text-cy" icon="bot" sub="across all projects" delay={120} />
        <Stat label="Pending approvals" value={pend.length} tone={pend.length ? "text-amber" : "text-txt"} icon="shield" sub={pend.length ? "founder decision needed" : "queue clear"} delay={150} />
        <Stat label="Open risks" value={risks.length} tone={risks.some((r) => r.severity >= 0.45) ? "text-coral" : "text-txt"} icon="flame" sub="severity ≥ threshold" delay={180} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          {/* Q2 — what is the AI doing right now */}
          <Panel title="AI is working on" delay={60} right={
            <button className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => goto("command")}>
              command center <Icon name="arrow" size={12} />
            </button>
          }>
            {runningTask ? (
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cy/30 bg-cy/10 text-cy">
                  <Icon name="bot" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[15px] font-bold">{runningTask.title}</span>
                    <StatusBadge status={runningTask.status} />
                  </div>
                  <p className="mt-0.5 text-[12px] text-sub">
                    {agentById(runningTask.agentId).name} agent · {agentById(runningTask.agentId).model} · priority {runningTask.priorityScore}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <ProgressBar value={runningTask.progress} tone="bg-cy" className="flex-1" />
                    <span className="font-mono text-[11px] text-cy">{runningTask.progress}%</span>
                  </div>
                  {latestReasoning && (
                    <div className="mt-3 rounded-md border border-line bg-ink-900/60 p-2.5">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">latest structured reasoning</p>
                      <p className="mt-1 text-[12px] text-sub"><span className="text-mint">Decision:</span> {latestReasoning.decision}</p>
                      <p className="text-[12px] text-sub"><span className="text-cy">Why:</span> {truncate(latestReasoning.why, 130)}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : pend.length > 0 ? (
              <div className="flex items-center gap-3 rounded-md border border-amber/25 bg-amber/5 p-3.5">
                <Icon name="shield" size={18} className="shrink-0 text-amber" />
                <p className="text-[12.5px] text-sub">
                  Agents are idle by design — <span className="text-amber">{pend.length} action{pend.length > 1 ? "s" : ""}</span> waiting for your approval below. The loop resumes the moment you decide.
                </p>
              </div>
            ) : (
              <p className="text-[12.5px] text-mut">
                {p?.phase === "COMPLETED" ? "Goal completed — measurement and learnings stored. Ready for the next goal." :
                 p?.phase === "PLAN_REVIEW" ? "Plan is ready and waiting for your approval in Approvals." :
                 s.paused ? "Execution paused by founder." : "Queue drained — nothing ready to run."}
              </p>
            )}
            {runningRun && (
              <p className="mt-2.5 font-mono text-[10px] text-mut">
                run {runningRun.id.slice(0, 12)} · {runningRun.model} · prompt {runningRun.promptVersion} · telemetry simulated (demo mode)
              </p>
            )}
          </Panel>

          {/* Q5 — what happened recently */}
          <Panel title="Recent activity" delay={120} right={
            <Sparkline points={buckets} tone="#45e0b0" />
          }>
            <ul className="space-y-1">
              {s.events.slice(-9).reverse().map((e) => (
                <li key={e.id} className="group flex items-baseline gap-2.5 rounded px-1.5 py-1.5 transition-colors hover:bg-ink-800/70">
                  <span className={cx(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    e.type.includes("FAIL") || e.type.includes("RISK") ? "bg-coral" :
                    e.type.includes("APPROVAL") ? "bg-amber" :
                    e.type.includes("COMPLETED") || e.type.includes("GRANTED") ? "bg-mint" : "bg-cy",
                  )} />
                  <span className="w-[150px] shrink-0 font-mono text-[10px] uppercase tracking-wide text-mut">{e.type}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-sub group-hover:text-txt">{e.message}</span>
                  <TimeAgo ts={e.ts} now={now} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          {/* Q3 — what needs my approval */}
          <Panel title="Needs your approval" delay={90} right={
            <button className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => goto("approvals")}>all <Icon name="arrow" size={12} /></button>
          }>
            {pend.length === 0 ? (
              <p className="rounded-md border border-mint/20 bg-mint/5 p-3 text-[12px] text-mint/90">
                <Icon name="check" size={12} className="mr-1 inline" /> Queue clear — high-risk tools will stop here automatically.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {pend.slice(0, 3).map((ap) => (
                  <li key={ap.id} className="rounded-md border border-amber/25 bg-amber/5 p-3">
                    <div className="flex items-center gap-2">
                      {ap.kind === "PLAN" ? <span className="chip border-cy/30 text-cy">PLAN</span> : <RiskLevelBadge level={ap.riskLevel as string} />}
                      <TimeAgo ts={ap.createdAt} now={now} />
                    </div>
                    <p className="mt-1.5 text-[12.5px] font-medium leading-snug">{ap.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11.5px] text-mut">{ap.desc}</p>
                    <div className="mt-2.5 flex gap-2">
                      <button className="btn btn-mint flex-1 py-1.5 text-[11.5px]" onClick={() => a.decideApproval(ap.id, "APPROVED")}>
                        <Icon name="check" size={12} /> Approve
                      </button>
                      <button className="btn btn-coral flex-1 py-1.5 text-[11.5px]" onClick={() => a.decideApproval(ap.id, "REJECTED")}>
                        <Icon name="x" size={12} /> Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Q4 — what is blocked or risky */}
          <Panel title="Blocked & risky" delay={150}>
            {waiting.length === 0 && risks.length === 0 && (
              <p className="text-[12px] text-mut">Nothing blocked, risk register calm.</p>
            )}
            {waiting.length > 0 && (
              <ul className="mb-3 space-y-1.5">
                {waiting.slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-line bg-ink-900/50 px-2.5 py-2">
                    <span className="truncate text-[12px] text-sub">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
            {risks.length > 0 && (
              <ul className="space-y-1.5">
                {risks.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5 rounded-md border border-line bg-ink-900/50 px-2.5 py-2">
                    <span className={cx(
                      "w-11 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[10.5px] font-semibold",
                      severityTone(r.severity) === "coral" ? "bg-coral/15 text-coral" : severityTone(r.severity) === "amber" ? "bg-amber/15 text-amber" : "bg-mint/15 text-mint",
                    )}>
                      {r.severity.toFixed(2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-sub" title={r.risk}>{r.category}: {r.risk}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* recent decisions (transparency, §56) */}
          <Panel title="Recent AI decisions" delay={210} right={
            <button className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => goto("brain")}>brain <Icon name="arrow" size={12} /></button>
          }>
            {s.reasoning.filter((r) => r.projectId === p?.id).slice(-2).reverse().map((r) => (
              <div key={r.id} className="mb-2.5 rounded-md border border-line bg-ink-900/50 p-2.5 last:mb-0">
                <p className="text-[12px] font-medium leading-snug">{r.decision}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-mut">why: {truncate(r.why, 110)}</p>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-cy/80">confidence {(r.confidence * 100).toFixed(0)}% · {fmtAgo(r.ts, now)}</p>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
