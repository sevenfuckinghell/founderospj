import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import type { OSState, GoalInput, Autonomy } from "./types";
import { reducer, createInitialState } from "./engine/orchestrator";
import type { Action } from "./engine/orchestrator";
import { DEFAULT_PROVIDER_CONFIG } from "./providers";
import type { ModelRole } from "./providers";

const LS_KEY = "founder-os-state-v6";
const LEGACY_KEYS = ["founder-os-state-v3", "founder-os-state-v4", "founder-os-state-v5"];

/* every collection the UI maps over — a missing one means a blank screen */
const REQUIRED_ARRAYS = [
  "organizations", "members", "teams", "workspaces", "integrations", "billings",
  "projects", "goals", "tasks", "runs", "artifacts", "risks", "reviews",
  "aggregates", "approvals", "toolExecs", "events", "memories", "learnings",
  "metrics", "reasoning", "chat", "recommendations",
] as const;

function isValidState(parsed: unknown): parsed is OSState {
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as OSState;
  if (p.v !== 6 || !p.providerConfig || typeof p.onboarded !== "boolean") return false;
  return REQUIRED_ARRAYS.every((k) => Array.isArray(p[k as keyof OSState]));
}

/* heal provider config shapes written by older builds — a missing
   sub-object (keys / verified / roles) would blank the whole console */
function normalizeProviderConfig(p: OSState) {
  const d = DEFAULT_PROVIDER_CONFIG;
  p.providerConfig = {
    roles: { ...d.roles, ...(p.providerConfig.roles ?? {}) },
    keys: { ...(p.providerConfig.keys ?? {}) },
    verified: { ...(p.providerConfig.verified ?? {}) },
  };
}

function loadInitial(): OSState {
  const now = Date.now();
  try {
    /* drop every legacy schema — a drifted snapshot must never render */
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  } catch {
    /* non-fatal */
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OSState;
      if (isValidState(parsed)) {
        normalizeProviderConfig(parsed);
        return parsed;
      }
      /* shape drifted between builds → wipe and reseed rather than crash */
      localStorage.removeItem(LS_KEY);
    }
  } catch {
    /* corrupted storage → reseed */
  }
  try {
    return createInitialState(now);
  } catch {
    /* absolute last resort — never render a blank screen */
    return {
      v: 6, seed: 42, paused: false, onboarded: false, autonomy: "ASSISTED",
      currentMemberId: null, activeOrganizationId: null, activeWorkspaceId: null,
      activeProjectId: null, startedAt: now,
      providerConfig: structuredClone(DEFAULT_PROVIDER_CONFIG),
      organizations: [], members: [], teams: [], workspaces: [], integrations: [], billings: [],
      projects: [], goals: [], tasks: [], runs: [], artifacts: [], risks: [],
      reviews: [], aggregates: [], approvals: [], toolExecs: [], events: [],
      memories: [], learnings: [], metrics: [], reasoning: [], chat: [], recommendations: [],
    };
  }
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
  setWorkspace: (id: string) => void;
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
      setWorkspace: (id) => dispatch({ type: "SET_WORKSPACE", id }),
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

export function useOrganization() {
  const s = useOS();
  return s.organizations.find((o) => o.id === s.activeOrganizationId) ?? s.organizations[0] ?? null;
}

export function useActiveWorkspace() {
  const s = useOS();
  return s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? s.workspaces[0] ?? null;
}

/* projects scoped to the active workspace (multi-tenant isolation) */
export function useWorkspaceProjects() {
  const s = useOS();
  const wsId = s.activeWorkspaceId;
  return s.projects.filter((p) => p.workspaceId === wsId);
}

export function useActiveProject() {
  const s = useOS();
  const wsProjects = s.projects.filter((p) => p.workspaceId === s.activeWorkspaceId);
  return (
    wsProjects.find((p) => p.id === s.activeProjectId) ??
    wsProjects[wsProjects.length - 1] ??
    null
  );
}
