import { useOS, useActiveProject } from "../store";
import { Icon, Panel, Stat, cx, useNow, TimeAgo, EmptyState } from "./ui";
import { truncate } from "../engine/engines";

export function InsightsView() {
  const s = useOS();
  const p = useActiveProject();
  const now = useNow(1000);

  const scope = <T extends { projectId: string }>(xs: T[]) => xs.filter((x) => !p || x.projectId === p.id);

  const runs = scope(s.runs);
  const tokens = runs.reduce((a, r) => a + r.tokens, 0);
  const cost = runs.reduce((a, r) => a + r.cost, 0);
  const cycle = scope(s.metrics).filter((m) => m.name === "task.cycle_time");
  const avgCycle = cycle.length ? Math.round(cycle.reduce((a, m) => a + m.value, 0) / cycle.length) : 0;
  const decided = s.approvals.filter((a2) => a2.status !== "PENDING" && (!p || a2.projectId === p.id));
  const approvalRate = decided.length ? Math.round((decided.filter((a2) => a2.status === "APPROVED").length / decided.length) * 100) : 100;
  const recoveries = scope(s.tasks).filter((t) => t.retryCount > 0 && t.status === "COMPLETED").length;
  const outcomes = scope(s.metrics).filter((m) => m.name !== "task.cycle_time");
  const learnings = scope(s.learnings).slice().reverse();
  const agg = scope(s.aggregates).slice(-1)[0];
  const completedTasks = scope(s.tasks).filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Tasks completed" value={completedTasks} icon="check" sub={p ? `in ${p.name}` : "all projects"} tone="text-mint" delay={0} />
        <Stat label="Tokens used" value={tokens.toLocaleString()} icon="zap" sub="demo telemetry" delay={40} />
        <Stat label="Cost estimate" value={`$${cost.toFixed(2)}`} icon="chart" sub="rate card: demo" delay={80} />
        <Stat label="Avg cycle time" value={avgCycle ? `${avgCycle}m` : "—"} icon="clock" sub="start → completion" delay={120} />
        <Stat label="Approval rate" value={`${approvalRate}%`} icon="shield" sub={`${decided.length} decisions`} tone="text-amber" delay={160} />
        <Stat label="Failures recovered" value={recoveries} icon="refresh" sub="regen engine" tone="text-cy" delay={200} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <Panel title="Learnings — stored, never self-modifying" delay={60}>
            {learnings.length === 0 ? (
              <EmptyState icon="book" title="No lessons yet" hint="The Learning Engine writes lessons after measurement, and after every recovered failure." />
            ) : (
              <ul className="space-y-2.5">
                {learnings.map((l) => (
                  <li key={l.id} className="rounded-md border border-mint/20 bg-mint/5 p-3.5">
                    <p className="text-[13px] font-medium leading-snug">{l.lesson}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">
                      <span>context · {truncate(l.context, 34)}</span>
                      <span>applies to · {truncate(l.applicability, 30)}</span>
                      <span className="text-mint">conf {(l.confidence * 100).toFixed(0)}%</span>
                      <TimeAgo ts={l.ts} now={now} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9.5px] leading-relaxed text-mut">
              guardrail: learnings influence future decisions through structured memory and recommendations only — the OS never rewrites its own prompts or code from a lesson.
            </p>
          </Panel>

          <Panel title="Recommendations — feeding the next loop" delay={120}>
            {(agg?.changes.length ?? 0) === 0 ? (
              <p className="text-[12px] text-mut">Recommendations appear after the review council or a measurement cycle.</p>
            ) : (
              <ul className="space-y-1.5">
                {(agg?.changes ?? []).map((c, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border border-line bg-ink-900/50 px-3 py-2.5">
                    <Icon name="arrow" size={13} className="mt-0.5 shrink-0 text-cy" />
                    <span className="text-[12.5px] text-sub">{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Outcome metrics — demo telemetry, labeled as such" delay={90}>
          {outcomes.length === 0 ? (
            <EmptyState icon="chart" title="No outcome metrics yet" hint="Recorded during the measurement phase, after all tasks complete." />
          ) : (
            <ul className="space-y-2">
              {outcomes.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-md border border-line bg-ink-900/50 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium">{m.name}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-mut">{m.demo ? "demo value · simulated" : "live"} · <TimeAgo ts={m.ts} now={now} /></p>
                  </div>
                  <span className="font-display text-[22px] font-bold text-mint">{m.value}</span>
                  <span className="font-mono text-[10px] text-mut">{m.unit}</span>
                </li>
              ))}
            </ul>
          )}
          <div className={cx("mt-4 rounded-md border border-line bg-ink-900/50 p-3")}>
            <p className="panel-title mb-2">insight aggregator scope</p>
            <div className="flex flex-wrap gap-1.5">
              {["project", "agent", "task", "execution", "cost", "time", "quality", "business"].map((k) => (
                <span key={k} className="chip">{k}</span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-mut">
              dashboard · trend · insight · lesson · recommendation · report — assembled from real state, never invented.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
