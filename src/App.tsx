import { Component, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { OSProvider, useOS } from "./store";

/* ------------------------------------------------------------------ */
/* Crash boundary — the console must never render a blank screen.      */
/* Any render error surfaces here with diagnostics + one-click recovery */
/* (wipes local snapshots and reseeds).                                 */
/* ------------------------------------------------------------------ */
class CrashBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[founder-os] render failure:", error, info.componentStack);
  }

  recover = () => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("founder-os")) localStorage.removeItem(k);
      }
    } catch {
      /* non-fatal */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const e = this.state.error;
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1016", padding: 24, fontFamily: "'IBM Plex Mono', monospace" }}>
        <div style={{ maxWidth: 640, width: "100%", border: "1px solid #f26d6d55", borderRadius: 8, background: "#0d151d", padding: 28 }}>
          <div style={{ color: "#f26d6d", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            founder/os — render fault contained
          </div>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", color: "#e8f0f6", fontSize: 22, margin: "10px 0 6px" }}>
            The console hit an error — your state is safe.
          </h1>
          <p style={{ color: "#92a7b7", fontSize: 12.5, lineHeight: 1.6 }}>
            A component threw while rendering. Clearing the local snapshots and reseeding almost always resolves it —
            demo data regenerates in seconds.
          </p>
          <pre style={{ margin: "14px 0", padding: 12, background: "#060b10", border: "1px solid #1c2a38", borderRadius: 6, color: "#f2b95c", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 160, overflow: "auto" }}>
            {e.name}: {e.message}
          </pre>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={this.recover}
              style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, fontSize: 13, padding: "10px 18px", borderRadius: 6, border: "1px solid #45e0b066", background: "#45e0b01f", color: "#45e0b0", cursor: "pointer" }}
            >
              Clear snapshots & restart
            </button>
            <button
              onClick={() => { navigator.clipboard?.writeText(`${e.name}: ${e.message}\n${e.stack ?? ""}`); }}
              style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, fontSize: 13, padding: "10px 18px", borderRadius: 6, border: "1px solid #28405466", background: "#15212c", color: "#92a7b7", cursor: "pointer" }}
            >
              Copy error detail
            </button>
          </div>
        </div>
      </div>
    );
  }
}
import { Shell } from "./components/Shell";
import type { ViewId } from "./components/Shell";
import { Dashboard } from "./components/Dashboard";
import { CommandCenter } from "./components/CommandCenter";
import { GoalIntake } from "./components/GoalIntake";
import { ProjectsView, TasksView, AgentsView, ArtifactsView } from "./components/Views";
import { ApprovalsView, ReviewsView, EventsView, SettingsView } from "./components/Governance";
import { AIBrain } from "./components/AIBrain";
import { InsightsView } from "./components/Insights";
import { BacklogView } from "./components/Backlog";
import { ChatPanel } from "./components/ChatPanel";
import { ProjectResultWindow } from "./components/ProjectResult";
import { ToastHost } from "./components/Toasts";
import { BootScreen } from "./components/Boot";

function Console() {
  const s = useOS();
  const [view, setView] = useState<ViewId>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const prevPhases = useRef<Record<string, string>>({});

  /* auto-open the result dossier the moment a project completes */
  useEffect(() => {
    for (const p of s.projects) {
      const prev = prevPhases.current[p.id];
      if (prev && prev !== "COMPLETED" && p.phase === "COMPLETED") {
        setResultId(p.id);
      }
      prevPhases.current[p.id] = p.phase;
    }
  }, [s.projects]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setChatOpen((o) => !o);
      }
      if (e.key === "Escape") setChatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!s.onboarded) return <BootScreen />;

  return (
    <Shell view={view} setView={setView} onToggleChat={() => setChatOpen((o) => !o)} chatOpen={chatOpen}>
      {view === "dashboard" && <Dashboard goto={setView} openResult={setResultId} />}
      {view === "command" && <CommandCenter goto={setView} />}
      {view === "goals" && <GoalIntake goto={setView} />}
      {view === "projects" && <ProjectsView onResult={setResultId} />}
      {view === "tasks" && <TasksView />}
      {view === "agents" && <AgentsView />}
      {view === "brain" && <AIBrain />}
      {view === "reviews" && <ReviewsView />}
      {view === "approvals" && <ApprovalsView />}
      {view === "artifacts" && <ArtifactsView />}
      {view === "insights" && <InsightsView />}
      {view === "backlog" && <BacklogView />}
      {view === "events" && <EventsView />}
      {view === "settings" && <SettingsView />}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      {resultId && <ProjectResultWindow projectId={resultId} onClose={() => setResultId(null)} onSwitch={setResultId} />}
      <ToastHost />
    </Shell>
  );
}

export default function App() {
  return (
    <CrashBoundary>
      <OSProvider>
        <Console />
      </OSProvider>
    </CrashBoundary>
  );
}
