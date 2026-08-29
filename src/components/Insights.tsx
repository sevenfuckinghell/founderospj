import { useOS, useActions, useActiveProject } from "../store";
import { Icon, Panel, Stat, cx, useNow, TimeAgo, EmptyState } from "./ui";
import { agentById } from "../data/registry";
import { truncate } from "../engine/engines";
import type { Recommendation } from "../types";

const SOURCE_META: Record<Recommendation["source"], { label: string; cls: string }> = {
  COUNCIL:  { label: "council",  cls: "border-cy/35 text-cy bg-cy/10" },
  LEARNING: { label: "learning", cls: "border-mint/35 text-mint bg-mint/10" },
  MEASURE:  { label: "measure",  cls: "border-amber/35 text-amber bg-amber/10" },
};

function RecommendationCard({ rec, onQueue, onDismiss }: {
  rec: Recommendation;
  onQueue: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const src = SOURCE_META[rec.source];
  const agent = agentById(rec.agentId);
  const queued = rec.status === "QUEUED";
  const dismissed = rec.status === "DISMISSED";

  return (
    <li
      className={cx(
        "group relative overflow-hidden rounded-md border px-3.5 py-3 transition-all duration-200",
        dismissed
          ? "border-line bg-ink-900/30 opacity-40"
          : queued
            ? "border-mint/30 bg-mint/5"
            : "border-line bg-ink-900/50 hover:-translate-y-px hover:border-cy/40 hover:shadow-[0_4px_18px_rgba(86,200,240,0.07)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cx("chip border", src.cls)}>{src.label}</span>
          <span className="chip border-line2 text-sub">
            <Icon name="bot" size={10} /> {agent.name}
          </span>
        </div>
        <TimeAgo ts={rec.ts} now={Date.now()} />
      </div>

      <p className={cx("mt-2 text-[12.5px] leading-snug", dismissed ? "text-mut line-through" : "text-txt")}>
        {rec.text}
      </p>

      {queued ? (
        <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mint">
          <Icon name="check" size={11} /> queued → entered the execution loop as a task
        </div>
      ) : dismissed ? (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-mut">dismissed</div>
      ) : (
        <div className="mt-2.5 flex items-center gap-2 opacity-90 transition-opacity group-hover:opacity-100">
          <button className="btn btn-mint px-2.5 py-1 text-[11px]" onClick={() => onQueue(rec.id)}>
            <Icon name="zap" size={11} /> Queue as task
          </button>
          <button
            className="btn btn-ghost px-2 py-1 text-[11px] text-mut hover:text-coral"
            onClick={() => onDismiss(rec.id)}
            title="Dismiss recommendation"
          >
            <Icon name="x" size={11} /> Dismiss
          </button>
        </div>
      )}
    </li>
  );
}

export function InsightsView() {
  const s = useOS();
  const a = useActions();
  const p = useActiveProject();
  const now = useNow(1000);

  const scope = <T extends { projectId: string }>(xs: T[]) => xs.filter((x) => !p || x.projectId === p.id);

  const runs = scope(s.runs);
  const tokens = runs.reduce((acc, r) => acc + r.tokens, 0);
  const cost = runs.reduce((acc, r) => acc + r.cost, 0);
  const cycle = scope(s.metrics).filter((m) => m.name === "task.cycle_time");
  const avgCycle = cycle.length ? Math.round(cycle.reduce((acc, m) => acc + m.value, 0) / cycle.length) : 0;
  const decided = s.approvals.filter((x) => x.status !== "PENDING" && (!p || x.projectId === p.id));
  const approvalRate = decided.length ? Math.round((decided.filter((x) => x.status === "APPROVED").length / decided.length) * 100) : 100;
  const recoveries = scope(s.tasks).filter((t) => t.retryCount > 0 && t.status === "COMPLETED").length;
  const outcomes = scope(s.metrics).filter((m) => m.name !== "task.cycle_time");
  const learnings = scope(s.learnings).slice().reverse();
  const completedTasks = scope(s.tasks).filter((t) => t.status === "COMPLETED").length;

  const recs = scope(s.recommendations);
  const suggested = recs.filter((r) => r.status === "SUGGESTED").sort((x, y) => y.ts - x.ts);
  const queued = recs.filter((r) => r.status === "QUEUED").sort((x, y) => y.ts - x.ts);
  const dismissed = recs.filter((r) => r.status === "DISMISSED").slice(-2);

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

          <Panel
            title="Recommendations — feeding the next loop"
            delay={120}
            right={
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mut">
                <Icon name="refresh" size={11} className="text-cy" />
                {suggested.length} open · {queued.length} queued
              </span>
            }
          >
            {suggested.length === 0 && queued.length === 0 ? (
              <EmptyState
                icon="refresh"
                title="No recommendations yet"
                hint="Recommendations are harvested from the review council, the learning engine, and measurement — then you can queue them straight into the loop."
              />
            ) : (
              <ul className="space-y-2.5">
                {suggested.map((r) => (
                  <RecommendationCard key={r.id} rec={r} onQueue={a.queueRecommendation} onDismiss={a.dismissRecommendation} />
                ))}
                {queued.map((r) => (
                  <RecommendationCard key={r.id} rec={r} onQueue={a.queueRecommendation} onDismiss={a.dismissRecommendation} />
                ))}
                {dismissed.map((r) => (
                  <RecommendationCard key={r.id} rec={r} onQueue={a.queueRecommendation} onDismiss={a.dismissRecommendation} />
                ))}
              </ul>
            )}
            <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9.5px] leading-relaxed text-mut">
              queueing turns a recommendation into a READY task owned by the matched agent — it joins the priority-ordered execution loop. still subject to approval gates.
            </p>
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
