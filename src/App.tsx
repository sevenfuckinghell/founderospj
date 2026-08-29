import { useEffect, useRef, useState } from "react";
import { OSProvider, useOS } from "./store";
import { Shell } from "./components/Shell";
import type { ViewId } from "./components/Shell";
import { Dashboard } from "./components/Dashboard";
import { CommandCenter } from "./components/CommandCenter";
import { GoalIntake } from "./components/GoalIntake";
import { ProjectsView, TasksView, AgentsView, ArtifactsView } from "./components/Views";
import { ApprovalsView, ReviewsView, EventsView, SettingsView } from "./components/Governance";
import { AIBrain } from "./components/AIBrain";
import { InsightsView } from "./components/Insights";
import { ChatPanel } from "./components/ChatPanel";
import { ProjectResultWindow } from "./components/ProjectResult";
import { ToastHost } from "./components/Toasts";

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
    <OSProvider>
      <Console />
    </OSProvider>
  );
}
