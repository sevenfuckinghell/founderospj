import { useOS } from "../store";
import { Icon, cx } from "./ui";

/* ------------------------------------------------------------------ */
/* Production topology — the deployment target, drawn live.            */
/* Every node reports its true status: LIVE in this build, BLUEPRINT   */
/* in the shipped server/, or NOT CONFIGURED for external edges.       */
/* ------------------------------------------------------------------ */

type NodeState = "live" | "blueprint" | "off";

const STATE_META: Record<NodeState, { label: string; chip: string; node: string; dot: string }> = {
  live:      { label: "LIVE",           chip: "border-mint/40 text-mint bg-mint/10", node: "border-mint/30 hover:border-mint/60", dot: "bg-mint" },
  blueprint: { label: "BLUEPRINT",      chip: "border-cy/40 text-cy bg-cy/10",       node: "border-cy/25 hover:border-cy/55",     dot: "bg-cy" },
  off:       { label: "NOT CONFIGURED", chip: "border-line2 text-mut bg-sub/5",      node: "border-line hover:border-line2",      dot: "bg-mut" },
};

function Node({ title, sub, state, detail, icon }: {
  title: string; sub: string; state: NodeState; detail: string; icon?: string;
}) {
  const m = STATE_META[state];
  return (
    <div
      className={cx(
        "group relative w-full rounded-lg border bg-ink-850/90 px-3.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
        m.node,
      )}
      title={detail}
    >
      {state === "live" && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-mint pulse-dot" />}
      {state === "blueprint" && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-cy/70" />}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-display text-[12.5px] font-bold tracking-wide">
          {icon && <Icon name={icon} size={13} className="shrink-0 text-sub" />}
          <span className="truncate">{title}</span>
        </span>
        <span className={cx("chip shrink-0 border", m.chip)}>{m.label}</span>
      </div>
      <p className="mt-1 truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">{sub}</p>
      <p className="mt-0 max-h-0 overflow-hidden text-[10.5px] leading-snug text-sub/90 transition-all duration-300 group-hover:mt-1.5 group-hover:max-h-20">
        {detail}
      </p>
    </div>
  );
}

function Trunk({ label }: { label?: string }) {
  return (
    <div className="relative mx-auto flex h-8 w-px items-start justify-center overflow-visible bg-line2">
      <span className="flow-dot absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cy" />
      {label && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[8.5px] uppercase tracking-[0.16em] text-mut">
          {label}
        </span>
      )}
    </div>
  );
}

function Split({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute left-1/4 right-1/4 top-0 h-px bg-line2" />
      <div className="grid grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

function Stub() {
  return <div className="mx-auto h-5 w-px bg-line2" />;
}

const INTEGRATIONS = [
  { name: "GitHub", icon: "branch" },
  { name: "Slack", icon: "chat" },
  { name: "Gmail", icon: "send" },
  { name: "Calendar", icon: "clock" },
  { name: "Cloud", icon: "layers" },
];

export function TopologyPanel() {
  const s = useOS();
  let payload = 0;
  try {
    const raw = localStorage.getItem("founder-os-state-v4");
    if (raw) payload = raw.length;
  } catch { /* private mode */ }

  return (
    <div>
      {/* legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">
        {(Object.keys(STATE_META) as NodeState[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cx("h-1.5 w-1.5 rounded-full", STATE_META[k].dot)} /> {STATE_META[k].label}
          </span>
        ))}
        <span className="ml-auto hidden text-mut/70 sm:block">hover a node for its role</span>
      </div>

      <div className="mx-auto max-w-[620px]">
        {/* web app */}
        <Node
          icon="grid" title="Web App" sub="react · vite · this build" state="live"
          detail="The console you're using. In production it only ever talks to the control plane over HTTPS + SSE — no secrets, no direct model calls."
        />
        <Trunk label="HTTPS / SSE" />

        {/* control plane */}
        <Node
          icon="shield" title="API / Control Plane" sub="auth · RBAC · policy · /api/v1" state="blueprint"
          detail="server/main.py — FastAPI service: bearer auth, OWNER/ADMIN/MEMBER/VIEWER roles, the autonomy policy matrix, goal/task/approval routes, and the SSE event stream."
        />
        <Stub />

        {/* data layer */}
        <Split>
          <div>
            <Stub />
            <Node
              icon="box" title="PostgreSQL" sub="state of record" state="blueprint"
              detail={`server/schema.sql — 16 tables, UUID keys, org isolation, indexed hot paths. Demo mode persists the same domain model to localStorage (${(payload / 1024).toFixed(1)} KB right now).`}
            />
          </div>
          <div>
            <Stub />
            <Node
              icon="zap" title="Redis / Queue" sub="jobs · pub/sub events" state="blueprint"
              detail="Agent jobs land in founder-os:jobs; domain events fan out over pub/sub to the SSE stream. Demo mode uses the 900 ms tick loop and the in-memory event log."
            />
          </div>
        </Split>
        <div className="relative">
          <div className="absolute left-1/4 right-1/4 bottom-0 h-px bg-line2" />
          <div className="grid grid-cols-2 gap-3"><Stub /><Stub /></div>
        </div>

        {/* worker */}
        <Node
          icon="bot" title="Worker / Agent" sub="planner · research · code · test" state="live"
          detail={`Runs the same Action Engine contracts in-browser right now (${s.runs.length} runs recorded). Production runs server/worker.py: queue consumer, exponential backoff, dead-letter queue, MAX_RETRIES = 2 — no unbounded agent loops.`}
        />
        <Stub />

        {/* gateways */}
        <Split>
          <div>
            <Stub />
            <Node
              icon="brain" title="AI Gateway" sub="providers · routing · pricing" state="live"
              detail="Live in this build: 16-model catalog, role routing (reasoning/fast/embedding), list pricing for cost telemetry, and a real connection probe against your keys."
            />
          </div>
          <div>
            <Stub />
            <Node
              icon="terminal" title="Tool Gateway" sub="permissions · audit · risk classes" state="live"
              detail={`Live in this build: ${s.toolExecs.length} audited executions. Every tool declares schema + permissions + risk level; HIGH/CRITICAL can only execute founder-approved.`}
            />
          </div>
        </Split>
        <div className="relative">
          <div className="absolute right-1/4 bottom-0 h-5 w-px translate-x-1/2 bg-line2" />
          <Stub />
        </div>

        {/* integration bus */}
        <div className="relative">
          <div className="absolute left-[8%] right-[8%] top-0 h-px bg-line2" />
          <div className="grid grid-cols-5 gap-1.5 pt-5">
            {INTEGRATIONS.map((it) => (
              <div key={it.name} className="flex flex-col items-center">
                <div className="mb-1 h-4 w-px bg-line2" />
                <div
                  className="group flex w-full cursor-default flex-col items-center gap-1 rounded-md border border-line bg-ink-900/70 px-1 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-line2 hover:bg-ink-800"
                  title="OAuth lives server-side — configure env vars in .env.example, never in the browser."
                >
                  <Icon name={it.icon} size={14} className="text-mut transition-colors group-hover:text-sub" />
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-mut group-hover:text-sub">{it.name}</span>
                  <span className="h-1 w-1 rounded-full bg-line2" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-mut/80">
            edge integrations · not configured · OAuth stays server-side
          </p>
        </div>
      </div>

      {/* blueprint inventory */}
      <div className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
        {[
          ["server/main.py", "control plane · REST + SSE", "blueprint"],
          ["server/worker.py", "queue consumer · agent runner", "blueprint"],
          ["server/schema.sql", "16 tables · UUIDs · indexes", "blueprint"],
          ["docker-compose.yml", "postgres · redis · api · worker · web", "blueprint"],
        ].map(([file, desc]) => (
          <div key={file} className="flex items-center gap-2.5 rounded-md border border-line bg-ink-900/50 px-3 py-2 transition-colors hover:border-cy/30">
            <Icon name="book" size={13} className="shrink-0 text-cy/80" />
            <span className="truncate font-mono text-[11px] text-sub">{file}</span>
            <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-mut">{desc}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-mut">
        The browser demo collapses this whole topology into one process — but the contracts (domain events, approval gates, audit log, policy matrix)
        are identical, so the server blueprint slots in without changing a single view. Bring it up with <span className="font-mono text-cy">docker compose up</span>.
        All four files ship in Settings → Source code & export.
      </p>
    </div>
  );
}
