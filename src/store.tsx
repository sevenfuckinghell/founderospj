import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import type { OSState, GoalInput, Autonomy } from "./types";
import { reducer, createInitialState } from "./engine/orchestrator";
import type { Action } from "./engine/orchestrator";
import { DEFAULT_PROVIDER_CONFIG } from "./providers";
import type { ModelRole } from "./providers";

const LS_KEY = "founder-os-state-v4";

function loadInitial(): OSState {
  const now = Date.now();
  try {
    localStorage.removeItem("founder-os-state-v3");
  } catch {
    /* non-fatal */
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OSState;
      if (parsed && parsed.v === 4 && Array.isArray(parsed.projects)) {
        if (!parsed.providerConfig) parsed.providerConfig = structuredClone(DEFAULT_PROVIDER_CONFIG);
        if (!parsed.recommendations) parsed.recommendations = [];
        if (!parsed.workspace) {
          parsed.workspace = { name: "Founder Workspace", founder: "Founder", onboarded: true, createdAt: parsed.startedAt };
        }
        return parsed;
      }
    }
  } catch {
    /* corrupted storage → reseed */
  }
  return createInitialState(now);
}

interface OSActions {
  tick: (now: number) => void;
  completeOnboarding: (o: { name: string; founder: string; autonomy: Autonomy; reasoningModel: string; fastModel: string; loadDemo: boolean }) => void;
  submitGoal: (input: GoalInput) => void;
  decideApproval: (id: string, decision: "APPROVED" | "REJECTED") => void;
  setAutonomy: (level: Autonomy) => void;
  togglePause: () => void;
  skipPlanning: () => void;
  chat: (text: string) => void;
  setActive: (id: string) => void;
  retryTask: (id: string) => void;
  queueRecommendation: (id: string) => void;
  dismissRecommendation: (id: string) => void;
  setModelRole: (role: ModelRole, modelId: string) => void;
  setApiKey: (providerId: string, key: string) => void;
  markProviderVerified: (providerId: string, ok: boolean) => void;
  reset: () => void;
}

const StateCtx = createContext<OSState | null>(null);
const ActionsCtx = createContext<OSActions | null>(null);

export function OSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  const saveTimer = useRef<number | null>(null);

  /* persist (debounced) */
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch {
        /* storage full — non-fatal */
      }
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state]);

  /* simulation heartbeat */
  useEffect(() => {
    const t = window.setInterval(() => dispatch({ type: "TICK", now: Date.now() }), 1150);
    return () => window.clearInterval(t);
  }, []);

  const actions = useMemo<OSActions>(
    () => ({
      tick: (now) => dispatch({ type: "TICK", now }),
      completeOnboarding: (o) => dispatch({ type: "COMPLETE_ONBOARDING", now: Date.now(), ...o }),
      submitGoal: (input) => dispatch({ type: "SUBMIT_GOAL", input, now: Date.now() }),
      decideApproval: (id, decision) => dispatch({ type: "DECIDE_APPROVAL", id, decision, now: Date.now() }),
      setAutonomy: (level) => dispatch({ type: "SET_AUTONOMY", level, now: Date.now() }),
      togglePause: () => dispatch({ type: "TOGGLE_PAUSE", now: Date.now() }),
      skipPlanning: () => dispatch({ type: "SKIP_PLANNING", now: Date.now() }),
      chat: (text) => dispatch({ type: "CHAT", text, now: Date.now() }),
      setActive: (id) => dispatch({ type: "SET_ACTIVE", id }),
      retryTask: (id) => dispatch({ type: "RETRY_TASK", id, now: Date.now() }),
      queueRecommendation: (id) => dispatch({ type: "QUEUE_RECOMMENDATION", id, now: Date.now() }),
      dismissRecommendation: (id) => dispatch({ type: "DISMISS_RECOMMENDATION", id }),
      setModelRole: (role, modelId) => dispatch({ type: "SET_MODEL_ROLE", role, modelId }),
      setApiKey: (providerId, key) => dispatch({ type: "SET_API_KEY", providerId, key }),
      markProviderVerified: (providerId, ok) => dispatch({ type: "MARK_PROVIDER_VERIFIED", providerId, ok }),
      reset: () => dispatch({ type: "RESET", now: Date.now() }),
    }),
    [],
  );

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useOS(): OSState {
  const s = useContext(StateCtx);
  if (!s) throw new Error("useOS outside provider");
  return s;
}

export function useActions(): OSActions {
  const a = useContext(ActionsCtx);
  if (!a) throw new Error("useActions outside provider");
  return a;
}

export function useActiveProject() {
  const s = useOS();
  return s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[s.projects.length - 1] ?? null;
}
