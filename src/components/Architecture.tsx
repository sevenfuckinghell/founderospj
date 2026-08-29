import { useOS } from "../store";
import { Icon, cx } from "./ui";
import { pendingApprovals } from "../engine/engines";
import { isDemo } from "../providers";

/* ------------------------------------------------------------------ */
/* Runtime architecture — the exact stack this console executes on,    */
/* rendered live: each layer reports real numbers from state.          */
/* ------------------------------------------------------------------ */

export function ArchitecturePanel() {
  const s = useOS();

  const agentsRunning = s.runs.filter((r) => r.status === "running").length;
  const activePhases = s.projects.filter((p) => ["PLANNING", "EXECUTING", "MEASURING"].includes(p.phase)).length;
  const pend = pendingApprovals(s).length;
  const stateBytes = new Blob([JSON.stringify(s)]).size;

  const layers: { id: string; label: string; note: string; metric: string; tone?: string; icon: string }[] = [
    { id: "browser",  label: "Browser",          note: "single client · zero servers in demo mode", metric: "1 client", icon: "eye" },
    { id: "react",    label: "React",            note: "view layer · subscribes to the store",      metric: `${13 + s.projects.length} views mounted`, icon: "grid" },
    { id: "reducer",  label: "Reducer",          note: "pure state transitions · events are the log", metric: `${s.events.length} domain events`, icon: "refresh" },
    { id: "orch",     label: "Orchestrator",     note: "action engine owns the workflow state machine", metric: `${activePhases} active phase${activePhases === 1 ? "" : "s"} · ${agentsRunning} agent run${agentsRunning === 1 ? "" : "s"}`, tone: agentsRunning ? "text-cy" : undefined, icon: "radar" },
    { id: "planner",  label: "Planner",          note: "goal → task DAG · deterministic domain packs", metric: `${s.tasks.length} tasks · ${s.projects.reduce((a, p) => a + p.planVersion, 0)} plan versions`, icon: "target" },
    { id: "memory",   label: "Memory",           note: "working · episodic · semantic · preference · procedural", metric: `${s.memories.length} entries · ${s.learnings.length} lessons`, icon: "brain" },
    { id: "approvals",label: "Approvals",        note: "HIGH / CRITICAL always gate on you", metric: pend ? `${pend} awaiting decision` : "queue clear", tone: pend ? "text-amber" : "text-mint", icon: "shield" },
    { id: "tools",    label: "Tool execution",   note: "controlled executor · risk-classed registry · audited", metric: `${s.toolExecs.length} calls · ${s.toolExecs.filter((t) => t.decision.includes("founder")).length} founder-approved`, icon: "zap" },
    { id: "storage",  label: "localStorage",     note: "persisted every tick · versioned schema", metric: `${(stateBytes / 1024).toFixed(1)} KB`, icon: "box" },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-[260px_1fr]">
      {/* the stack */}
      <div className="relative">
        {layers.map((l, i) => (
          <div key={l.id} className="group relative">
            <div
              className={cx(
                "relative z-10 flex items-center gap-2.5 rounded-md border px-3 py-2 transition-all duration-200",
                l.tone === "text-amber"
                  ? "border-amber/35 bg-amber/5 hover:bg-amber/10"
                  : "border-line bg-ink-900/80 hover:translate-x-1 hover:border-line2 hover:bg-ink-800",
              )}
            >
              <span className={cx("shrink-0", l.tone ?? "text-mut", "transition-colors group-hover:text-mint")}>
                <Icon name={l.icon} size={13} />
              </span>
              <span className="font-mono text-[11.5px] font-medium tracking-wide text-sub group-hover:text-txt">{l.label}</span>
              {agentsRunning > 0 && i > 0 && i < layers.length - 1 && (
                <span className="absolute -left-[13px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-cy pulse-dot" />
              )}
            </div>
            {i < layers.length - 1 && (
              <div className="relative z-0 ml-[22px] h-3.5 w-px bg-line">
                {agentsRunning > 0 && <span className={cx("absolute left-0 top-0 h-1.5 w-px bg-cy", "edge-drop")} />}
              </div>
            )}
          </div>
        ))}
        <style>{`@keyframes edgeDrop { from { transform: translateY(0); opacity: 1; } to { transform: translateY(12px); opacity: 0; } } .edge-drop { animation: edgeDrop 0.8s linear infinite; }`}</style>
      </div>

      {/* live readouts */}
      <div className="grid content-start gap-2.5 sm:grid-cols-2">
        {layers.map((l) => (
          <div key={l.id} className="rounded-md border border-line bg-ink-950/60 px-3 py-2.5 transition-colors hover:border-line2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">{l.label}</span>
              <span className={cx("font-mono text-[10.5px] font-semibold", l.tone ?? "text-cy")}>{l.metric}</span>
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-mut">{l.note}</p>
          </div>
        ))}
        <div className="rounded-md border border-mint/20 bg-mint/5 px-3 py-2.5 sm:col-span-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-mint/80">invariants</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            The reducer is the only writer. The orchestrator owns workflow state — never conversation history. Tool calls pass the
            permission matrix before executing, and every execution lands in the audit log. Provider engine:{" "}
            <span className="font-mono text-[10.5px] text-mint">{isDemo(s.providerConfig) ? "demo (deterministic, no network)" : "live keys configured"}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
