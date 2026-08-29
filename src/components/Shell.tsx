import type { ReactNode } from "react";
import { useOS, useActions } from "../store";
import { Icon, cx, StatusBadge } from "./ui";
import { pendingApprovals } from "../engine/engines";
import { fmtClock, cx as cx2 } from "../engine/engines";
import { modelById } from "../providers";

export type ViewId =
  | "dashboard" | "command" | "goals" | "projects" | "tasks" | "agents"
  | "brain" | "reviews" | "approvals" | "artifacts" | "insights" | "backlog" | "events" | "settings";

const NAV: { section: string; items: { id: ViewId; label: string; icon: string }[] }[] = [
  {
    section: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "grid" },
      { id: "command", label: "Command Center", icon: "radar" },
    ],
  },
  {
    section: "Plan",
    items: [
      { id: "goals", label: "Goals", icon: "target" },
      { id: "projects", label: "Projects", icon: "folder" },
      { id: "tasks", label: "Tasks", icon: "list" },
    ],
  },
  {
    section: "Operate",
    items: [
      { id: "agents", label: "Agents", icon: "bot" },
      { id: "brain", label: "AI Brain", icon: "brain" },
      { id: "artifacts", label: "Artifacts", icon: "box" },
    ],
  },
  {
    section: "Govern",
    items: [
      { id: "approvals", label: "Approvals", icon: "shield" },
      { id: "reviews", label: "Reviews", icon: "scales" },
      { id: "events", label: "Events & Audit", icon: "pulse" },
    ],
  },
  {
    section: "Learn",
    items: [
      { id: "insights", label: "Insights", icon: "chart" },
      { id: "backlog", label: "Backlog", icon: "layers" },
      { id: "settings", label: "Settings", icon: "gear" },
    ],
  },
];

const TITLES: Record<ViewId, string> = {
  dashboard: "Founder Dashboard",
  command: "AI Command Center",
  goals: "Goals",
  projects: "Projects",
  tasks: "Task System",
  agents: "Agent Registry",
  brain: "AI Brain",
  reviews: "Review Council",
  approvals: "Approvals & Gates",
  artifacts: "Artifact Store",
  insights: "Insight & Learning",
  backlog: "Production Backlog",
  events: "Events & Audit Log",
  settings: "System Settings",
};

export function Shell({ view, setView, onToggleChat, chatOpen, children }: {
  view: ViewId;
  setView: (v: ViewId) => void;
  onToggleChat: () => void;
  chatOpen: boolean;
  children: ReactNode;
}) {
  const s = useOS();
  const a = useActions();
  const pend = pendingApprovals(s).length;
  const runningAgents = s.runs.filter((r) => r.status === "running").length;
  const tickerEvents = s.events.slice(-14).reverse();
  const org = s.organizations.find((o) => o.id === s.activeOrganizationId);
  const wsProjects = s.projects.filter((p) => p.workspaceId === s.activeWorkspaceId);
  const active = wsProjects.find((p) => p.id === s.activeProjectId) ?? wsProjects[wsProjects.length - 1];

  return (
    <div className="relative flex h-full">
      {/* ambient layers */}
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-0" />

      {/* sidebar */}
      <aside className="relative z-10 flex w-[218px] shrink-0 flex-col border-r border-line bg-ink-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
          <div className="relative grid h-9 w-9 place-items-center rounded-lg border border-mint/30 bg-mint/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#45e0b0" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 19V5h10M6 12h8" />
            </svg>
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber shadow-[0_0_8px_rgba(242,185,92,0.9)]" />
          </div>
          <div>
            <div className="font-display text-[15px] font-bold leading-none tracking-wide">
              FOUNDER<span className="text-mint">/</span>OS
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-mut">ai operating system</div>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="px-2 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-mut/80">{group.section}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button key={item.id} className={cx("nav-item", view === item.id && "active")} onClick={() => setView(item.id)}>
                    <Icon name={item.icon} size={15} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === "approvals" && pend > 0 && (
                      <span className="grid h-[18px] min-w-[18px] place-items-center rounded bg-amber/15 px-1 font-mono text-[10px] font-semibold text-amber">
                        {pend}
                      </span>
                    )}
                    {item.id === "command" && runningAgents > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cy pulse-dot" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mut">Autonomy</span>
            <span className="chip border-mint/30 text-mint">{s.autonomy}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-amber/25 bg-amber/5 px-2.5 py-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber pulse-dot-amber" />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-amber">demo mode · simulated telemetry</span>
          </div>
        </div>
      </aside>

      {/* main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-ink-900/70 px-5 py-3 backdrop-blur-sm">
          <h1 className="font-display text-[17px] font-bold tracking-wide">{TITLES[view]}</h1>

          {/* org → workspace → project tenancy trail */}
          <div className="ml-2 hidden items-center gap-1.5 md:flex">
            <span
              className="chip cursor-pointer border-line2 text-sub transition-colors hover:border-mint/40 hover:text-mint"
              onClick={() => setView("settings")}
              title={`${org?.name ?? "Organization"} — manage in Settings`}
            >
              <Icon name="folder" size={10} />
              {org?.name ?? "Org"}
            </span>
            <span className="text-mut">/</span>
            <select
              className="input w-auto cursor-pointer py-1 text-[11.5px]"
              value={s.activeWorkspaceId ?? ""}
              onChange={(e) => a.setWorkspace(e.target.value)}
              title="Switch workspace"
            >
              {s.workspaces.map((w) => (
                <option key={w.id} value={w.id} className="bg-ink-850">{w.name}</option>
              ))}
            </select>
            <span className="text-mut">/</span>
          </div>

          {active && (
            <select
              className="input w-auto cursor-pointer py-1.5 text-[12px]"
              value={active.id}
              onChange={(e) => a.setActive(e.target.value)}
            >
              {wsProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-ink-850">
                  {p.name}{p.demo ? " (demo)" : ""}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              className="btn hidden items-center gap-2 px-2.5 py-1.5 sm:flex"
              onClick={() => setView("settings")}
              title="AI model routing — open settings"
            >
              <span className={cx(
                "h-1.5 w-1.5 rounded-full",
                Object.values(s.providerConfig.verified).some(Boolean) ? "bg-mint pulse-dot"
                : s.providerConfig.roles.reasoning.startsWith("demo-") ? "bg-amber pulse-dot-amber" : "bg-cy",
              )} />
              <span className="font-mono text-[10.5px] text-sub">{modelById(s.providerConfig.roles.reasoning).name}</span>
              <Icon name="gear" size={11} className="text-mut" />
            </button>
            <span className="hidden font-mono text-[11px] text-mut md:block">
              {fmtClock(Date.now())} local
            </span>
            <button className={cx("btn", s.paused ? "btn-mint" : "")} onClick={a.togglePause} title="Pause / resume all execution">
              <Icon name={s.paused ? "play" : "pause"} size={13} />
              {s.paused ? "Resume" : "Pause"}
            </button>
            <button className={cx("btn", chatOpen ? "btn-mint" : "")} onClick={onToggleChat} title="Command interface (⌘K)">
              <Icon name="terminal" size={13} />
              Console
            </button>
          </div>
        </header>

        {/* live event ticker */}
        <div className="relative overflow-hidden border-b border-line bg-ink-950/60">
          <div className="ticker-track flex w-max items-center gap-8 whitespace-nowrap px-4 py-1.5">
            {[...tickerEvents, ...tickerEvents].map((e, i) => (
              <span key={`${e.id}-${i}`} className="flex items-center gap-2 font-mono text-[10.5px] text-mut">
                <span className={cx2(
                  "h-1 w-1 rounded-full",
                  e.type.includes("FAIL") || e.type.includes("RISK") ? "bg-coral" :
                  e.type.includes("APPROVAL_REQ") || e.type.includes("PENDING") ? "bg-amber" :
                  e.type.includes("COMPLETED") || e.type.includes("GRANTED") ? "bg-mint" : "bg-cy",
                )} />
                <span className="text-sub/80">{e.type}</span>
                <span className="max-w-[340px] truncate">{e.message}</span>
              </span>
            ))}
          </div>
        </div>

        {s.paused && (
          <div className="flex items-center gap-2 border-b border-amber/25 bg-amber/8 px-5 py-1.5">
            <Icon name="pause" size={12} className="text-amber" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber">
              execution paused — state preserved, agents idle
            </span>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1240px] p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PhaseChip({ phase }: { phase: string }) {
  const map: Record<string, string> = {
    PLANNING: "bg-cy/10 border-cy/30 text-cy",
    PLAN_REVIEW: "bg-amber/10 border-amber/35 text-amber",
    EXECUTING: "bg-mint/10 border-mint/30 text-mint",
    MEASURING: "bg-cy/10 border-cy/30 text-cy",
    COMPLETED: "bg-mint/10 border-mint/30 text-mint",
  };
  return <span className={cx("chip border", map[phase] ?? "bg-sub/10 text-sub")}>{phase.replace("_", " ")}</span>;
}

export { StatusBadge };
