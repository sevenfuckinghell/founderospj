import type {
  OSState, GoalInput, Project, Task, AgentRun, Autonomy, Approval, RiskLevel,
  Recommendation, RecommendationSource, ArtifactType,
} from "../types";
import {
  assembleTasks, assembleRisks, pipelineScript, artifactFor, detectDomain, DOMAIN_LABEL, getPack, truncate,
} from "./planner";
import {
  rng, uid, applyPriorities, runCouncil, reasoning, memory, makeLearnings, bumpRisk,
} from "./engines";
import { agentById, toolById, policyAllows, autoRecovery } from "../data/registry";
import { DEFAULT_PROVIDER_CONFIG, resolveModel, costFor } from "../providers";

/* ================================================================== */
/* Action Engine — the application owns state; the "model" is a        */
/* swappable reasoning component. Here: a deterministic demo engine    */
/* (DEMO_MODE=true) implementing the exact same contracts.             */
/* ================================================================== */

export type Action =
  | { type: "TICK"; now: number }
  | { type: "SUBMIT_GOAL"; input: GoalInput; now: number }
  | { type: "DECIDE_APPROVAL"; id: string; decision: "APPROVED" | "REJECTED"; now: number }
  | { type: "SET_AUTONOMY"; level: Autonomy; now: number }
  | { type: "TOGGLE_PAUSE"; now: number }
  | { type: "SKIP_PLANNING"; now: number }
  | { type: "CHAT"; text: string; now: number }
  | { type: "SET_ACTIVE"; id: string }
  | { type: "RETRY_TASK"; id: string; now: number }
  | { type: "QUEUE_RECOMMENDATION"; id: string; now: number }
  | { type: "DISMISS_RECOMMENDATION"; id: string }
  | { type: "SET_MODEL_ROLE"; role: "reasoning" | "fast" | "embedding"; modelId: string }
  | { type: "SET_API_KEY"; providerId: string; key: string }
  | { type: "MARK_PROVIDER_VERIFIED"; providerId: string; ok: boolean }
  | { type: "RESET"; now: number };

const clone = (s: OSState): OSState => structuredClone(s);

function emit(s: OSState, projectId: string, type: string, message: string, ts: number = Date.now()) {
  s.events.push({ id: uid("evt"), type, projectId, ts, message });
  if (s.events.length > 500) s.events = s.events.slice(-500);
}

function say(s: OSState, text: string, ts: number, role: "os" | "founder" = "os") {
  s.chat.push({ id: uid("msg"), role, text, ts });
  if (s.chat.length > 80) s.chat = s.chat.slice(-80);
}

const readyDeps = (task: Task, all: Task[]) =>
  task.dependsOn.every((k) => all.some((t) => t.projectId === task.projectId && t.key === k && t.status === "COMPLETED"));

function refreshReady(s: OSState, projectId: string) {
  const all = s.tasks.filter((t) => t.projectId === projectId);
  s.tasks = s.tasks.map((t) =>
    t.projectId === projectId && t.status === "PLANNED" && readyDeps(t, all) ? { ...t, status: "READY" } : t,
  );
}

function newRun(s: OSState, task: Task, now: number): AgentRun {
  const agent = agentById(task.agentId);
  return {
    id: uid("run"), projectId: task.projectId, taskId: task.id, agentId: agent.id,
    status: "running", startedAt: now, progress: 0,
    tokens: 0, latencyMs: 0,
    model: resolveModel(s.providerConfig, task.agentId),
    promptVersion: `${agent.id}.v${agent.version.slice(1)}`, cost: 0,
  };
}

function finishRun(run: AgentRun, task: Task, now: number, failed: boolean): AgentRun {
  const hash = task.title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tokens = failed ? 600 + (hash % 500) : 950 + (hash % 1500);
  const latencyMs = 3600 + ((hash * 37) % 5600);
  return {
    ...run, status: failed ? "failed" : "completed", endedAt: now, progress: 100,
    tokens, latencyMs, cost: costFor(run.model, tokens),
    summary: failed ? undefined : `${agentById(task.agentId).name} delivered against acceptance: “${task.acceptance[0]}”`,
  };
}

/* ---------------- task settlement ---------------- */

function completeTask(s: OSState, task: Task, run: AgentRun, now: number, rand: () => number) {
  const agent = agentById(task.agentId);
  const pack = getPack(s.projects.find((p) => p.id === task.projectId)?.domain ?? "venture");
  void pack;
  const art = artifactFor(s.projects.find((p) => p.id === task.projectId)?.domain ?? "venture", task.key, goalTitleOf(s, task.projectId));
  s.runs = s.runs.map((r) => (r.id === run.id ? finishRun(r, task, now, false) : r));
  s.tasks = s.tasks.map((t) =>
    t.id === task.id ? { ...t, status: "COMPLETED", progress: 100, completedAt: now } : t,
  );
  s.artifacts.push({
    id: uid("art"), projectId: task.projectId, taskId: task.id, agentId: agent.id,
    type: art.type, title: art.title, version: task.retryCount + 1, ts: now, content: art.content,
  });
  const cycleMin = Math.max(1, Math.round((now - (task.startedAt ?? now)) / 60000));
  s.metrics.push({ id: uid("met"), projectId: task.projectId, name: "task.cycle_time", value: cycleMin, unit: "min", ts: now, demo: true });
  s.memories.push(memory(task.projectId, now, "EPISODIC",
    `Task “${task.title}” completed by ${agent.name} on attempt ${task.retryCount + 1}.`, "execution-trace", 0.95, 5));
  if (task.agentId === "research") {
    s.memories.push(memory(task.projectId, now, "SEMANTIC",
      `${art.title}: verified claims separated from assumptions; top signal stored for retrieval.`, "research-agent", 0.8, 7));
  }
  const done = s.tasks.filter((t) => t.projectId === task.projectId && t.status === "COMPLETED").length;
  if (done % 3 === 0) {
    s.memories.push(memory(task.projectId, now, "PROCEDURAL",
      `Sequence pattern effective: dependency-gated execution with review gates (${done} tasks completed).`, "learning-engine", 0.75, 6));
  }
  emit(s, task.projectId, "ARTIFACT_CREATED", `${art.title} v${task.retryCount + 1} → ${agent.name}`);
  emit(s, task.projectId, "AGENT_COMPLETED", `${agent.name} finished “${task.title}” · ${run.tokens || "—"} tok`);
  emit(s, task.projectId, "TASK_COMPLETED", task.title);
  refreshReady(s, task.projectId);

  const all = s.tasks.filter((t) => t.projectId === task.projectId);
  if (all.every((t) => t.status === "COMPLETED")) {
    const p = s.projects.find((pp) => pp.id === task.projectId)!;
    p.phase = "MEASURING";
    p.measureTicks = 3;
    emit(s, p.id, "METRIC_RECORDED", "All tasks completed — entering measurement phase");
  } else if (rand() < 0.5) {
    /* occasional ambient event keeps the console alive without noise */
  }
}

function runTools(s: OSState, task: Task, now: number, decision: string, actor: string) {
  for (const toolId of task.tools) {
    const tool = toolById(toolId);
    s.toolExecs.push({
      id: uid("tex"), projectId: task.projectId, toolId, taskId: task.id,
      status: "SUCCESS",
      input: `${tool.name} ← ${truncate(task.title, 40)}`,
      output: tool.id.includes("github") ? `ok — ref feat/${task.key}` : tool.id.includes("deploy") || tool.id.includes("cloud") ? "ok — staged behind approval gate" : "ok",
      ts: now, durationMs: 240 + ((task.title.length * 53) % 900),
      actor, permission: tool.permissions[0] ?? "—", decision,
    });
    emit(s, task.projectId, "TOOL_EXECUTED", `${tool.name} · ${decision}`);
  }
}

function settle(s: OSState, task: Task, run: AgentRun, now: number) {
  const p = s.projects.find((pp) => pp.id === task.projectId)!;
  const pack = getPack(p.domain);

  if (task.willFailOnce && task.retryCount === 0) {
    s.runs = s.runs.map((r) => (r.id === run.id ? finishRun(r, task, now, true) : r));
    s.tasks = s.tasks.map((t) => (t.id === task.id ? { ...t, status: "FAILED", progress: 0 } : t));
    emit(s, p.id, "TASK_FAILED", `${task.title} — run aborted, trace captured`);
    const target = s.risks.find((r) => r.projectId === p.id && (r.category === "Technical" || r.category === "Timeline")) ??
      s.risks.filter((r) => r.projectId === p.id).sort((a, b) => b.severity - a.severity)[0];
    if (target) {
      s.risks = s.risks.map((r) => (r.id === target.id ? bumpRisk(r, 0.15, 0, now) : r));
      emit(s, p.id, "RISK_UPDATED", `${target.category} risk severity ↑ ${target.severity} → recomputed`);
    }
    s.reasoning.push(reasoning(p.id, now, {
      decision: `Halt “${task.title}” and open a regeneration cycle`,
      why: pack.failure.rootCause,
      evidence: "Test trace: 3 failing assertions, all downstream of the same schema/contract mismatch",
      riskNote: "Repeating the identical run is disallowed — the retry must include a plan change",
      next: autoRecovery(s.autonomy) ? "Architect proposes an alternative; auto-retry queued (2 ticks)" : "Escalated to founder — use Retry with mitigation in Tasks, or ask the console",
      confidence: 0.87,
    }));
    s.memories.push(memory(p.id, now, "EPISODIC", `Failure captured for “${task.title}”: ${pack.failure.rootCause}`, "regeneration-engine", 0.9, 9));
    if (autoRecovery(s.autonomy)) p.regenCooldown = 2;
    return;
  }

  /* tool gating before completion */
  const gated = task.tools.filter((id) => !policyAllows(s.autonomy, toolById(id).riskLevel));
  if (gated.length > 0) {
    s.runs = s.runs.map((r) => (r.id === run.id ? finishRun(r, task, now, false) : r));
    s.tasks = s.tasks.map((t) => (t.id === task.id ? { ...t, status: "WAITING", progress: 100 } : t));
    for (const toolId of gated) {
      const tool = toolById(toolId);
      const exists = s.approvals.some((a) => a.taskId === task.id && a.toolId === toolId && a.status === "PENDING");
      if (!exists) {
        s.approvals.push({
          id: uid("apr"), projectId: p.id, kind: "TOOL",
          title: `${tool.name} — ${tool.description}`,
          desc: `Requested by ${agentById(task.agentId).name} while completing “${task.title}”. Risk level ${tool.riskLevel} exceeds the ${s.autonomy} policy boundary.`,
          riskLevel: tool.riskLevel, taskId: task.id, toolId,
          status: "PENDING", createdAt: now,
        });
        emit(s, p.id, "APPROVAL_REQUESTED", `${tool.name} (${tool.riskLevel}) for “${task.title}”`);
      }
    }
    s.reasoning.push(reasoning(p.id, now, {
      decision: `Gate ${gated.map((g) => toolById(g).name).join(", ")} behind founder approval`,
      why: `Risk level ${gated.map((g) => toolById(g).riskLevel).join("/")} is outside the ${s.autonomy} autonomy boundary`,
      evidence: `Tool registry policy table (Settings → Autonomy). HIGH/CRITICAL always require a human.`,
      riskNote: "Executing without approval would violate the permission model",
      next: "Founder decides in Approvals — or raise autonomy for MEDIUM-risk tools",
      confidence: 0.97,
    }));
    return;
  }

  if (task.tools.length > 0) runTools(s, task, now, `auto · ${s.autonomy} policy`, "orchestrator");
  completeTask(s, task, run, now, rng(s.seed));
}

/* ---------------- per-project advance ---------------- */

function advancePlanning(s: OSState, p: Project, now: number) {
  const stage = p.pipeline.find((st) => st.status === "running");
  if (!stage) return;
  stage.shown += 1;
  if (stage.shown >= stage.lines.length) {
    stage.status = "done";
    if (stage.id === "roadmap") emit(s, p.id, "PLAN_CREATED", `Roadmap v${p.planVersion} — ${s.tasks.filter((t) => t.projectId === p.id).length} tasks, DAG validated`);
    if (stage.id === "risks") emit(s, p.id, "RISKS_IDENTIFIED", `${s.risks.filter((r) => r.projectId === p.id).length} risks registered, severity = p × i`);
    if (stage.id === "review") {
      const { reviews, agg } = runCouncil(p.id, p.domain, p.planVersion, now, rng(s.seed + p.planVersion));
      s.reviews.push(...reviews);
      s.aggregates.push(agg);
      genRecommendations(s, p.id, agg.changes, "COUNCIL", now);
      emit(s, p.id, "REVIEW_COMPLETED", `Council pass ${p.planVersion}: overall ${agg.overall}/10 — ${agg.status}`);
    }
    const next = p.pipeline.find((st) => st.status === "waiting");
    if (next) {
      next.status = "running";
      if (next.id === "review") emit(s, p.id, "REVIEW_REQUESTED", "Proposal dispatched to 6 evaluation passes");
    } else {
      /* plan ready → approval checkpoint */
      p.phase = "PLAN_REVIEW";
      const agg = s.aggregates.filter((a) => a.projectId === p.id).slice(-1)[0];
      s.approvals.push({
        id: uid("apr"), projectId: p.id, kind: "PLAN",
        title: `Execution plan v${p.planVersion} — ${DOMAIN_LABEL[p.domain] ?? p.domain}`,
        desc: `Objectives, ${s.tasks.filter((t) => t.projectId === p.id).length}-task roadmap, ${s.risks.filter((r) => r.projectId === p.id).length} risks, council score ${agg?.overall ?? "—"}/10. Nothing executes until you approve.`,
        riskLevel: "PLAN", status: "PENDING", createdAt: now,
      });
      emit(s, p.id, "APPROVAL_REQUESTED", `Execution plan v${p.planVersion} awaits founder decision`);
      s.reasoning.push(reasoning(p.id, now, {
        decision: "Recommend proceeding with the gated execution plan",
        why: "Validation tasks precede build tasks; every high-risk tool is approval-gated",
        evidence: `Council overall ${agg?.overall ?? "—"}/10 · critical issues: ${agg?.critical.length ?? 0}`,
        riskNote: "Top risk carries an owner and mitigation; replan triggers are defined",
        next: "Founder approves, requests changes (replan), or rejects",
        confidence: 0.84,
      }));
      s.memories.push(memory(p.id, now, "WORKING", `Plan v${p.planVersion} assembled — awaiting founder decision.`, "action-engine", 0.99, 8));
    }
  }
}

function skipPlanning(s: OSState, p: Project, now: number) {
  for (const st of p.pipeline) {
    st.shown = st.lines.length;
    if (st.status !== "done") {
      st.status = "done";
      if (st.id === "risks") emit(s, p.id, "RISKS_IDENTIFIED", `${s.risks.filter((r) => r.projectId === p.id).length} risks registered`);
      if (st.id === "review") {
        const { reviews, agg } = runCouncil(p.id, p.domain, p.planVersion, now, rng(s.seed + p.planVersion));
        s.reviews.push(...reviews);
        s.aggregates.push(agg);
        genRecommendations(s, p.id, agg.changes, "COUNCIL", now);
      }
    }
  }
  if (p.phase === "PLANNING") {
    p.phase = "PLAN_REVIEW";
    s.approvals.push({
      id: uid("apr"), projectId: p.id, kind: "PLAN",
      title: `Execution plan v${p.planVersion} — ${DOMAIN_LABEL[p.domain] ?? p.domain}`,
      desc: "Planning fast-forwarded by founder. Review the plan before approving execution.",
      riskLevel: "PLAN", status: "PENDING", createdAt: now,
    });
    emit(s, p.id, "APPROVAL_REQUESTED", `Execution plan v${p.planVersion} awaits founder decision`);
  }
}

function advanceExecuting(s: OSState, p: Project, now: number, rand: () => number) {
  /* regeneration cooldown (auto-recovery only) */
  if (p.regenCooldown > 0 && autoRecovery(s.autonomy)) {
    p.regenCooldown -= 1;
    if (p.regenCooldown === 0) {
      const failed = s.tasks.find((t) => t.projectId === p.id && t.status === "FAILED");
      if (failed) {
        const pack = getPack(p.domain);
        s.tasks = s.tasks.map((t) => (t.id === failed.id ? { ...t, status: "READY", retryCount: t.retryCount + 1, progress: 0 } : t));
        emit(s, p.id, "PLAN_REGENERATED", `Retry scheduled for “${failed.title}” with modified approach`);
        s.reasoning.push(reasoning(p.id, now, {
          decision: `Retry “${failed.title}” with a different plan, not the same action`,
          why: pack.failure.alternative,
          evidence: "Root cause from failure trace + architect capability query",
          riskNote: "Retry budget: 2 additional attempts before human escalation",
          next: "Re-run with the modified approach and verify against the same suite",
          confidence: 0.82,
        }));
      }
    }
  }

  const running = s.runs.find((r) => r.projectId === p.id && r.status === "running");
  if (running) {
    const task = s.tasks.find((t) => t.id === running.taskId)!;
    const inc = 24 + rand() * 16;
    const next = Math.min(100, Math.round(running.progress + inc));
    s.runs = s.runs.map((r) => (r.id === running.id ? { ...r, progress: next } : r));
    s.tasks = s.tasks.map((t) => (t.id === task.id ? { ...t, progress: next } : t));
    if (next >= 100) settle(s, task, running, now);
    return;
  }

  const candidates = s.tasks
    .filter((t) => t.projectId === p.id && t.status === "READY")
    .sort((a, b) => b.priorityScore - a.priorityScore);
  if (candidates.length > 0) {
    const task = candidates[0];
    s.tasks = s.tasks.map((t) => (t.id === task.id ? { ...t, status: "RUNNING", startedAt: t.startedAt ?? now } : t));
    s.runs.push(newRun(s, task, now));
    const agent = agentById(task.agentId);
    emit(s, p.id, "TASK_STARTED", task.title);
    emit(s, p.id, "AGENT_STARTED", `${agent.name} → “${task.title}” (${agent.model}, ${agent.version})`);
    s.memories.push(memory(p.id, now, "WORKING", `${agent.name} is executing “${task.title}”.`, "agent-dispatcher", 0.99, 4));
  }
}

function advanceMeasuring(s: OSState, p: Project, now: number) {
  p.measureTicks -= 1;
  if (p.measureTicks > 0) return;
  const pack = getPack(p.domain);
  const hadFailure = s.tasks.some((t) => t.projectId === p.id && t.retryCount > 0);
  const goal = s.goals.find((g) => g.projectId === p.id);
  for (const m of pack.outcomeMetrics) {
    s.metrics.push({ id: uid("met"), projectId: p.id, name: m.name, value: m.value, unit: m.unit, ts: now, demo: true });
    emit(s, p.id, "METRIC_RECORDED", `${m.name}: ${m.value} ${m.unit} (demo telemetry)`);
  }
  const learnings = makeLearnings(p.id, p.domain, now, hadFailure);
  s.learnings.push(...learnings);
  for (const l of learnings) emit(s, p.id, "LEARNING_CREATED", truncate(l.lesson, 90));
  genRecommendations(s, p.id, learnings.slice(0, 3).map((l) => l.lesson), "LEARNING", now);
  s.memories.push(memory(p.id, now, "PROCEDURAL",
    `Completed workflow for “${truncate(goal?.title ?? p.name, 50)}”: validation→gates→build→measure held up${hadFailure ? ", including one recovered failure" : ""}.`,
    "learning-engine", 0.88, 9));
  s.reasoning.push(reasoning(p.id, now, {
    decision: "Close the loop: store learnings and hand recommendations to the next goal",
    why: "Outcomes evaluated against founder-defined success criteria",
    evidence: `${pack.outcomeMetrics.length} outcome metrics · ${learnings.length} lessons extracted`,
    riskNote: "Learnings influence future plans via memory — never by rewriting system code",
    next: "Recommendations available in Insights; start the next goal when ready",
    confidence: 0.9,
  }));
  p.phase = "COMPLETED";
  if (goal) goal.status = "COMPLETED";
  emit(s, p.id, "GOAL_COMPLETED", `“${truncate(goal?.title ?? p.name, 60)}” — measurement & learning stored`);
  say(s, `Goal complete: “${truncate(goal?.title ?? p.name, 60)}”.\n• ${pack.outcomeMetrics.map((m) => `${m.name}: ${m.value} ${m.unit}`).join("\n• ")}\n• ${learnings.length} lessons stored to memory\nReview them in Insights — or give me the next goal.`, now);
}

export function advance(state: OSState, now: number): OSState {
  if (state.paused) return state;
  const s = clone(state);
  const rand = rng(s.seed ^ (now % 100000));
  for (const p of s.projects) {
    if (p.phase === "PLANNING") advancePlanning(s, p, now);
    else if (p.phase === "EXECUTING") advanceExecuting(s, p, now, rand);
    else if (p.phase === "MEASURING") advanceMeasuring(s, p, now);
  }
  s.seed = (s.seed + 7919) % 2147483647;
  return s;
}

/* ---------------- recommendation engine ----------------
   Recommendations are harvested from real outputs (council, learnings,
   measurement) and can be queued into the loop as READY tasks — they are
   the mechanism that "feeds the next loop". */

const REC_RULES: Array<{ re: RegExp; agent: string }> = [
  { re: /architect|api|data model|schema|tech choice/i, agent: "architect" },
  { re: /test|regression|edge case|qa\b/i, agent: "testing" },
  { re: /readme|doc\b|documentation|guide/i, agent: "docs" },
  { re: /customer|interview|discovery|persona|research|market\b|competitor/i, agent: "research" },
  { re: /landing|copy|campaign|seo|positioning|marketing|lead|funnel|conversion|brand|content/i, agent: "marketing" },
  { re: /wireframe|design|ux\b|ui\b|component|page\b|interactive|sample output/i, agent: "ui" },
  { re: /ship|build|implement|module|backend|frontend|deploy/i, agent: "coding" },
  { re: /scope|priorit|roadmap|plan|workflow|milestone|narrow/i, agent: "planner" },
];

function agentForRecommendation(text: string): string {
  for (const r of REC_RULES) if (r.re.test(text)) return r.agent;
  return "planner";
}

const AGENT_DELIVERABLE: Record<string, ArtifactType> = {
  coding: "CODE", ui: "UI", marketing: "MARKETING", research: "REPORT",
  testing: "DATA", architect: "DOCUMENT", planner: "DOCUMENT", docs: "DOCUMENT",
};

function genRecommendations(s: OSState, projectId: string, texts: string[], source: RecommendationSource, ts: number) {
  for (const text of texts) {
    const clean = text.trim();
    if (!clean) continue;
    const dupe = s.recommendations.some((r) => r.projectId === projectId && r.text === clean);
    if (dupe) continue;
    s.recommendations.push({
      id: uid("rec"), projectId, text: clean, source,
      agentId: agentForRecommendation(clean), status: "SUGGESTED", ts,
    });
  }
  /* keep the store bounded — newest suggested first, drop stale dismissed */
  const scoped = s.recommendations.filter((r) => r.projectId === projectId);
  if (scoped.length > 12) {
    const drop = scoped.filter((r) => r.status === "DISMISSED").slice(0, scoped.length - 12).map((r) => r.id);
    s.recommendations = s.recommendations.filter((r) => !drop.includes(r.id));
  }
}

function queueRecommendation(s: OSState, id: string, now: number) {
  const rec = s.recommendations.find((r) => r.id === id);
  if (!rec || rec.status !== "SUGGESTED") return;
  const p = s.projects.find((pp) => pp.id === rec.projectId);
  const task: Task = {
    id: uid("tsk"), projectId: rec.projectId, key: `rec-${rec.id.slice(4, 10)}`,
    title: `Recommendation — ${truncate(rec.text, 46)}`,
    desc: `Founder-queued recommendation (${rec.source.toLowerCase()}). Owning agent proposes the concrete next step.`,
    status: p?.phase === "EXECUTING" ? "READY" : "PLANNED",
    agentId: rec.agentId, dependsOn: [], tools: [],
    deliverable: AGENT_DELIVERABLE[rec.agentId] ?? "DOCUMENT",
    priorityScore: 55, priorityReason: "founder-queued recommendation · urgency 7 · founder-directed",
    factors: { value: 7, urgency: 7, dependency: 2, risk: 2, effort: 3 },
    acceptance: ["Concrete next step proposed", "Output filed as an artifact"],
    retryCount: 0, willFailOnce: false, progress: 0, createdAt: now,
  };
  s.tasks.push(task);
  s.recommendations = s.recommendations.map((r) => (r.id === id ? { ...r, status: "QUEUED", taskId: task.id } : r));
  emit(s, rec.projectId, "TASK_CREATED", `Recommendation queued → ${agentById(rec.agentId).name} (“${truncate(rec.text, 40)}”)`);
  s.reasoning.push(reasoning(rec.projectId, now, {
    decision: `Turn “${truncate(rec.text, 48)}” into an executable task for ${agentById(rec.agentId).name}`,
    why: "Founder queued a harvested recommendation — this is the loop closing into the next cycle",
    evidence: `Source: ${rec.source.toLowerCase()} · capability match → ${agentById(rec.agentId).name}`,
    riskNote: "Queued as a normal task: still subject to priority ordering and approval gates",
    next: p?.phase === "EXECUTING" ? "Enters the READY queue and runs in priority order" : "Attached to the project; runs once execution starts",
    confidence: 0.8,
  }));
}

function dismissRecommendation(s: OSState, id: string) {
  s.recommendations = s.recommendations.map((r) => (r.id === id ? { ...r, status: "DISMISSED" } : r));
}

/* ---------------- goal intake ---------------- */

function goalTitleOf(s: OSState, projectId: string): string {
  return s.goals.find((g) => g.projectId === projectId)?.title ?? "";
}

function submitGoal(s: OSState, input: GoalInput, now: number) {
  const domain = detectDomain(`${input.title} ${input.description}`);
  const pid = uid("prj");
  const deadlineBoost = input.deadline ? 1 : 0;
  let tasks = assembleTasks(domain, pid, now, 1);
  tasks = applyPriorities(tasks, deadlineBoost);
  const project: Project = {
    id: pid,
    name: DOMAIN_LABEL[domain] ?? "New Venture",
    demo: false,
    goalId: uid("goal"),
    phase: "PLANNING",
    createdAt: now,
    planVersion: 1,
    planRejectedOnce: false,
    pipeline: pipelineScript(domain, input, tasks.length, getPack(domain).risks.length),
    regenCooldown: 0,
    measureTicks: 0,
    reprioritized: false,
    domain,
  };
  s.projects.push(project);
  s.goals.push({
    id: project.goalId, projectId: pid,
    title: input.title, description: input.description,
    successCriteria: input.successCriteria.filter(Boolean),
    constraints: input.constraints.filter(Boolean),
    budget: input.budget || undefined, deadline: input.deadline || undefined,
    priority: input.deadline ? "P0" : "P1",
    status: "ACTIVE", createdAt: now,
  });
  s.tasks.push(...tasks);
  s.risks.push(...assembleRisks(domain, pid, now));
  s.activeProjectId = pid;
  emit(s, pid, "GOAL_CREATED", `“${truncate(input.title, 70)}”`);
  emit(s, pid, "PROJECT_CREATED", `${project.name} · domain profile ${DOMAIN_LABEL[domain]}`);
  emit(s, pid, "TASK_CREATED", `${tasks.length} tasks decomposed · dependency DAG validated`);
  s.memories.push(memory(pid, now, "WORKING", `Goal ingested: “${truncate(input.title, 60)}”. Planning pipeline started.`, "goal-manager", 0.99, 8));
  if (input.constraints.length > 0) {
    s.memories.push(memory(pid, now, "PREFERENCE", `Founder constraints on record: ${input.constraints.join("; ")}`, "goal-intake", 0.9, 7));
  }
  say(s, `Goal received. Planning pipeline started for ${DOMAIN_LABEL[domain]}.\nI'll analyze → plan → run the review council, then stop for your approval. Watch it live in the Command Center.`, now);
}

/* ---------------- approvals ---------------- */

function decideApproval(s: OSState, id: string, decision: "APPROVED" | "REJECTED", now: number) {
  const ap = s.approvals.find((a) => a.id === id);
  if (!ap || ap.status !== "PENDING") return;
  ap.status = decision;
  ap.decidedAt = now;

  if (ap.kind === "PLAN") {
    const p = s.projects.find((pp) => pp.id === ap.projectId)!;
    if (decision === "APPROVED") {
      emit(s, p.id, "APPROVAL_GRANTED", `Execution plan v${p.planVersion} approved by founder`);
      p.phase = "EXECUTING";
      refreshReady(s, p.id);
      s.memories.push(memory(p.id, now, "WORKING", "Plan approved — execution started.", "approval-manager", 0.99, 8));
      say(s, `Plan v${p.planVersion} approved. Execution started — I'll stop again at every high-risk tool.`, now);
    } else {
      /* replan: new version, modified tasks, fresh council pass */
      p.planVersion += 1;
      p.planRejectedOnce = true;
      s.tasks = s.tasks.filter((t) => t.projectId !== p.id);
      const g = s.goals.find((gg) => gg.projectId === p.id);
      let tasks = assembleTasks(p.domain, p.id, now, p.planVersion);
      tasks = applyPriorities(tasks, (g?.deadline ? 1 : 0) + 1);
      s.tasks.push(...tasks);
      const { reviews, agg } = runCouncil(p.id, p.domain, p.planVersion, now, rng(s.seed + p.planVersion * 13));
      s.reviews.push(...reviews);
      s.aggregates.push(agg);
      genRecommendations(s, p.id, agg.changes, "COUNCIL", now);
      s.approvals.push({
        id: uid("apr"), projectId: p.id, kind: "PLAN",
        title: `Execution plan v${p.planVersion} — revised`,
        desc: `Replanned after your rejection: scope buffer added, urgency weights increased, council re-run (pass ${p.planVersion}, score ${agg.overall}/10).`,
        riskLevel: "PLAN", status: "PENDING", createdAt: now,
      });
      emit(s, p.id, "PLAN_REGENERATED", `Plan v${p.planVersion} generated with structural changes (not a cosmetic edit)`);
      emit(s, p.id, "APPROVAL_REQUESTED", `Revised plan v${p.planVersion} awaits founder decision`);
      s.reasoning.push(reasoning(p.id, now, {
        decision: `Replan as v${p.planVersion} instead of re-submitting the same plan`,
        why: "Founder rejected v" + (p.planVersion - 1) + " — regeneration rules require a structural change",
        evidence: "Added scope-buffer task, re-weighted urgency, fresh council pass",
        riskNote: "Repeated identical resubmission is disallowed by the regeneration engine",
        next: "Founder reviews the revised plan in Approvals",
        confidence: 0.8,
      }));
    }
    return;
  }

  /* TOOL approval */
  const task = s.tasks.find((t) => t.id === ap.taskId);
  emit(s, ap.projectId, decision === "APPROVED" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED",
    `${ap.title} — founder ${decision.toLowerCase()}`);
  if (!task) return;
  const pendings = s.approvals.filter((a) => a.taskId === task.id && a.status === "PENDING");
  const rejected = s.approvals.some((a) => a.taskId === task.id && a.status === "REJECTED");
  if (rejected) {
    if (task.status === "BLOCKED") return; // already blocked — no duplicate escalation
    s.tasks = s.tasks.map((t) => (t.id === task.id ? { ...t, status: "BLOCKED" } : t));
    s.reasoning.push(reasoning(ap.projectId, now, {
      decision: `Block “${task.title}” and prepare a fallback path`,
      why: "Founder rejected a required tool execution — the original path is no longer authorized",
      evidence: `Rejected: ${toolById(ap.toolId ?? "").name}`,
      riskNote: "Retrying the identical request is disallowed",
      next: "Use “Retry with fallback” in Tasks — it removes the rejected tool and re-runs",
      confidence: 0.93,
    }));
    return;
  }
  if (pendings.length === 0) {
    /* if the task was already blocked by an earlier rejection, don't silently complete it —
       the founder must explicitly take the fallback path */
    if (task.status === "BLOCKED") return;
    runTools(s, task, now, "founder-approved", "founder");
    const run = s.runs.filter((r) => r.taskId === task.id).slice(-1)[0];
    completeTask(s, task, run ?? newRun(s, task, now), now, rng(s.seed));
  }
}

function retryTask(s: OSState, id: string, now: number) {
  const task = s.tasks.find((t) => t.id === id);
  if (!task || (task.status !== "FAILED" && task.status !== "BLOCKED")) return;
  const rejectedTools = s.approvals
    .filter((a) => a.taskId === id && a.status === "REJECTED")
    .map((a) => a.toolId);
  s.tasks = s.tasks.map((t) =>
    t.id === id
      ? { ...t, status: "READY", retryCount: t.retryCount + 1, progress: 0, tools: t.tools.filter((tl) => !rejectedTools.includes(tl)) }
      : t,
  );
  emit(s, task.projectId, "PLAN_REGENERATED", `“${task.title}” retried with fallback (rejected tools removed)`);
  s.reasoning.push(reasoning(task.projectId, now, {
    decision: `Retry “${task.title}” via fallback path`,
    why: rejectedTools.length
      ? `Rejected tools (${rejectedTools.map((t) => toolById(t ?? "").name).join(", ")}) removed from the plan; remaining work uses manual alternatives`
      : "Mitigation from the failure analysis applied before the retry",
    evidence: "Regeneration rule: never repeat the identical failed action",
    riskNote: "Further failures escalate directly to the founder",
    next: "Task re-enters the ready queue ordered by priority score",
    confidence: 0.85,
  }));
}

/* ---------------- command interface (chat invokes real functions) -------- */

function handleCommand(s: OSState, raw: string, now: number): string {
  const t = raw.toLowerCase();
  const p = s.projects.find((pp) => pp.id === s.activeProjectId) ?? s.projects[s.projects.length - 1];
  if (!p) return "No project yet — create a goal first and I'll build the plan.";
  const tasks = s.tasks.filter((x) => x.projectId === p.id);

  if (/(^|\s)(help|commands)(\s|$|\?)/.test(t) || t === "?") {
    return "Commands I execute for real:\n• status — what I'm working on right now\n• biggest risks — ranked open risks\n• why is <task> blocked/waiting — dependency & approval trace\n• reprioritize the roadmap — recompute all priority scores\n• pause all executions / resume\n• create a marketing plan — dispatch the Marketing agent\n• review the architecture — run an extra evaluation pass\n• memory / agents / approvals / learnings";
  }
  if (t.includes("pause")) {
    if (!s.paused) { s.paused = true; emit(s, p.id, "EXECUTION_PAUSED", "All agent execution paused by founder"); }
    return "Paused. Agents finish nothing until you resume — state is preserved exactly.";
  }
  if (t.includes("resume") || t.includes("unpause")) {
    if (s.paused) { s.paused = false; emit(s, p.id, "EXECUTION_RESUMED", "Execution resumed by founder"); }
    return "Resumed. Picking the ready queue back up in priority order.";
  }
  if (t.includes("risk")) {
    const rs = s.risks.filter((r) => r.projectId === p.id && r.status !== "MITIGATED").sort((a, b) => b.severity - a.severity).slice(0, 4);
    if (!rs.length) return "No open risks on this project — the register is clear.";
    return "Top open risks (severity = probability × impact):\n" +
      rs.map((r, i) => `${i + 1}. [${r.severity.toFixed(2)}] ${r.category}: ${r.risk}\n   mitigation: ${r.mitigation}`).join("\n");
  }
  if (t.includes("repriorit")) {
    s.tasks = s.tasks.map((x) => (x.projectId === p.id ? { ...x } : x));
    const boosted = applyPriorities(tasks, 2);
    s.tasks = s.tasks.map((x) => (x.projectId === p.id ? boosted.find((b) => b.id === x.id) ?? x : x));
    p.reprioritized = true;
    emit(s, p.id, "TASKS_REPRIORITIZED", "Priority engine re-scored all tasks (urgency weight boosted)");
    s.reasoning.push(reasoning(p.id, now, {
      decision: "Re-rank the roadmap with boosted urgency weight",
      why: "Founder requested reprioritization — deadline pressure weighted higher",
      evidence: "Deterministic formula in Settings; every score has an inspectable reason string",
      riskNote: "Reordering READY tasks changes what executes next",
      next: "Next execution tick picks the new top of the queue",
      confidence: 0.9,
    }));
    const top = boosted.filter((x) => x.status !== "COMPLETED").sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 4);
    return "Done — scores recomputed with the deterministic formula (inspectable in Tasks).\nNew order:\n" +
      top.map((x, i) => `${i + 1}. ${x.title} — ${x.priorityScore}`).join("\n");
  }
  if (t.includes("marketing") && (t.includes("plan") || t.includes("create"))) {
    const key = `marketing-adhoc-${s.tasks.length}`;
    s.tasks.push({
      id: uid("tsk"), projectId: p.id, key,
      title: "Ad-hoc Marketing Plan", desc: "Founder-requested: positioning summary, 3 campaign ideas, experiment backlog.",
      status: p.phase === "EXECUTING" ? "READY" : "PLANNED",
      agentId: "marketing", dependsOn: [], tools: [], deliverable: "MARKETING",
      priorityScore: 62, priorityReason: "founder-directed dispatch · urgency 8",
      factors: { value: 7, urgency: 8, dependency: 3, risk: 3, effort: 3 },
      acceptance: ["1-page plan", "3 campaign ideas", "experiment backlog"],
      retryCount: 0, willFailOnce: false, progress: 0, createdAt: now,
    });
    emit(s, p.id, "TASK_CREATED", "Ad-hoc Marketing Plan dispatched to Marketing agent");
    return p.phase === "EXECUTING"
      ? "Dispatched. The Marketing agent will pick it up from the ready queue and file the artifact."
      : "Created and attached to the project — it will enter the queue once execution starts.";
  }
  if (t.includes("review") && (t.includes("architect") || t.includes("plan"))) {
    const { reviews, agg } = runCouncil(p.id, p.domain, 90 + p.planVersion, now, rng(s.seed + 5));
    const tech = reviews.find((r) => r.reviewerId === "technical") ?? reviews[0];
    s.reviews.push(...reviews);
    s.aggregates.push(agg);
    genRecommendations(s, p.id, agg.changes, "COUNCIL", now);
    emit(s, p.id, "REVIEW_COMPLETED", `Extra council pass: overall ${agg.overall}/10`);
    return `Ran a full evaluation pass (6 reviewers, labeled as independent passes).\nOverall ${agg.overall}/10 — ${agg.status}.\nTechnical reviewer: ${tech.weaknesses[0] ?? "no blocking weakness"} → suggests: ${tech.recommendations[0] ?? "—"}. Full detail in Reviews.`;
  }
  if (t.includes("memory")) {
    const ms = s.memories.filter((m) => m.projectId === p.id);
    const by = (ty: string) => ms.filter((m) => m.type === ty).length;
    const latest = ms.slice(-2).reverse();
    return `Memory store for this project:\n• working ${by("WORKING")} · episodic ${by("EPISODIC")} · semantic ${by("SEMANTIC")} · preference ${by("PREFERENCE")} · procedural ${by("PROCEDURAL")}\nLatest:\n${latest.map((m) => `- [${m.type}] ${truncate(m.content, 90)}`).join("\n") || "- empty"}`;
  }
  if (t.includes("agent")) {
    const running = s.runs.filter((r) => r.status === "running");
    return running.length
      ? "Active agents:\n" + running.map((r) => `• ${agentById(r.agentId).name} — ${truncate(s.tasks.find((x) => x.id === r.taskId)?.title ?? "", 50)} (${r.progress}%)`).join("\n")
      : "No agents mid-run right now. The dispatcher picks from the READY queue in priority order.";
  }
  if (t.includes("approv")) {
    const pend = s.approvals.filter((a) => a.status === "PENDING");
    return pend.length
      ? "Pending approvals:\n" + pend.map((a) => `• [${a.riskLevel}] ${truncate(a.title, 70)} — decide in Approvals`).join("\n")
      : "Approval queue is clear. High-risk tools will stop here automatically when they appear.";
  }
  if (t.includes("learn")) {
    const ls = s.learnings.filter((l) => l.projectId === p.id);
    return ls.length ? ls.map((l) => `• ${l.lesson}`).join("\n") : "No lessons stored yet — the Learning Engine writes them after measurement. Failures also produce lessons once recovered.";
  }
  if (t.includes("status") || t.includes("working")) {
    const runningTask = tasks.find((x) => x.status === "RUNNING");
    const next = tasks.filter((x) => x.status === "READY").sort((a, b) => b.priorityScore - a.priorityScore)[0];
    const waiting = tasks.filter((x) => x.status === "WAITING").length;
    return `Project: ${p.name} · phase ${p.phase}${s.paused ? " · PAUSED" : ""}\n` +
      (runningTask ? `Now: ${runningTask.title} (${runningTask.progress}%) via ${agentById(runningTask.agentId).name}\n` : "No agent running this tick.\n") +
      (next ? `Next in queue: ${next.title} (score ${next.priorityScore})\n` : "") +
      (waiting ? `${waiting} task(s) waiting on your approval.\n` : "") +
      `Completed ${tasks.filter((x) => x.status === "COMPLETED").length}/${tasks.length}.`;
  }
  if (t.includes("why") || t.includes("block") || t.includes("waiting") || t.includes("fail")) {
    const interesting = tasks.filter((x) => ["WAITING", "BLOCKED", "FAILED"].includes(x.status));
    if (!interesting.length) return "Nothing is blocked or waiting — the queue is flowing.";
    return interesting.map((x) => {
      if (x.status === "WAITING") {
        const ap = s.approvals.find((a) => a.taskId === x.id && a.status === "PENDING");
        return `• ${x.title} — WAITING on approval: ${ap ? truncate(ap.title, 60) + ` (${ap.riskLevel})` : "tool gate"}. Decide in Approvals.`;
      }
      if (x.status === "FAILED") {
        const pack = getPack(p.domain);
        return `• ${x.title} — FAILED. Root cause: ${pack.failure.rootCause} ${autoRecovery(s.autonomy) ? "Auto-retry queued." : "Use “Retry with fallback” in Tasks."}`;
      }
      const unmet = x.dependsOn.filter((k) => !tasks.some((y) => y.key === k && y.status === "COMPLETED"));
      return `• ${x.title} — BLOCKED. Unmet dependencies: ${unmet.join(", ") || "a rejected tool — retry with fallback removes it"}.`;
    }).join("\n");
  }
  return "I didn't map that to a system function — I don't fake actions. Try “status”, “biggest risks”, “why is X waiting”, “reprioritize”, or “help”.";
}

/* ---------------- seed (demo project, per spec §50) ---------------- */

function seedState(now: number): OSState {
  const s: OSState = {
    v: 4, seed: 20260214, paused: false, autonomy: "ASSISTED",
    activeProjectId: null, startedAt: now - 3 * 3600_000,
    providerConfig: structuredClone(DEFAULT_PROVIDER_CONFIG),
    projects: [], goals: [], tasks: [], runs: [], artifacts: [], risks: [],
    reviews: [], aggregates: [], approvals: [], toolExecs: [], events: [],
    memories: [], learnings: [], metrics: [], reasoning: [], chat: [],
    recommendations: [],
  };
  const H = 3600_000;
  const t0 = now - 3 * H;
  const domain = "healthcare";
  const pid = "prj_demo_health";
  const input: GoalInput = {
    title: "Build and launch an AI-powered healthcare SaaS product for small clinics",
    description: "An AI triage assistant that turns patient intake into an urgency queue clinicians actually trust. Wedge: setup time and human override.",
    successCriteria: ["MVP deployed to staging", "10 pilot clinic users", "Payment-independent pilot billing flow working"],
    constraints: ["HIPAA-aware scope only", "No cold outbound", "Single-region deployment"],
    budget: "$25,000", deadline: "60 days",
  };
  s.projects.push({
    id: pid, name: "AI Healthcare SaaS", demo: true, goalId: "goal_demo",
    phase: "EXECUTING", createdAt: t0, planVersion: 1, planRejectedOnce: false,
    pipeline: pipelineScript(domain, input, 11, 5).map((st) => ({ ...st, status: "done" as const, shown: st.lines.length })),
    regenCooldown: 0, measureTicks: 0, reprioritized: false, domain,
  });
  s.goals.push({
    id: "goal_demo", projectId: pid, title: input.title, description: input.description,
    successCriteria: input.successCriteria, constraints: input.constraints,
    budget: input.budget, deadline: input.deadline, priority: "P0", status: "ACTIVE", createdAt: t0,
  });
  let tasks = assembleTasks(domain, pid, t0, 1);
  tasks = applyPriorities(tasks, 1);
  s.tasks.push(...tasks);
  s.risks.push(...assembleRisks(domain, pid, t0 + 60_000));
  emit(s, pid, "GOAL_CREATED", `“${input.title}”`, t0);
  emit(s, pid, "PROJECT_CREATED", "AI Healthcare SaaS · demo workspace", t0 + 2_000);
  emit(s, pid, "TASK_CREATED", `${tasks.length} tasks decomposed · DAG validated`, t0 + 5 * 60_000);

  /* council pass 1 */
  const { reviews, agg } = runCouncil(pid, domain, 1, t0 + 20 * 60_000, rng(77));
  s.reviews.push(...reviews);
  s.aggregates.push(agg);
  genRecommendations(s, pid, agg.changes, "COUNCIL", t0 + 22 * 60_000);
  emit(s, pid, "REVIEW_COMPLETED", `Council pass 1: overall ${agg.overall}/10`, t0 + 22 * 60_000);
  s.approvals.push({
    id: "apr_plan_demo", projectId: pid, kind: "PLAN",
    title: "Execution plan v1 — Healthcare SaaS",
    desc: "Approved by founder at seed.",
    riskLevel: "PLAN", status: "APPROVED", createdAt: t0 + 23 * 60_000, decidedAt: t0 + 30 * 60_000,
  });
  emit(s, pid, "APPROVAL_GRANTED", "Execution plan v1 approved by founder", t0 + 30 * 60_000);
  s.reasoning.push(reasoning(pid, t0 + 30 * 60_000, {
    decision: "Proceed with gated execution after founder approval",
    why: "Validation-first ordering accepted; high-risk tools gated",
    evidence: `Council score ${agg.overall}/10 · 0 critical blockers`,
    riskNote: "Regulatory risk carries the founder as owner",
    next: "Execute READY queue in priority order",
    confidence: 0.86,
  }));

  /* completed history: research.market, architecture, backend + research.customer WAITING on email.send */
  const done: [string, number, number][] = [
    ["research.market", 40, 58],
    ["architecture", 70, 92],
    ["backend", 105, 150],
  ];
  refreshReady(s, pid);
  for (const [key, mStart, mEnd] of done) {
    const task = s.tasks.find((x) => x.key === key && x.projectId === pid)!;
    const startedAt = t0 + mStart * 60_000;
    const endedAt = t0 + mEnd * 60_000;
    s.tasks = s.tasks.map((x) => (x.id === task.id ? { ...x, status: "COMPLETED", progress: 100, startedAt, completedAt: endedAt } : x));
    const run = newRun(s, task, startedAt);
    s.runs.push({ ...finishRun(run, task, endedAt, false), startedAt });
    const art = artifactFor(domain, key, input.title);
    s.artifacts.push({ id: uid("art"), projectId: pid, taskId: task.id, agentId: task.agentId, type: art.type, title: art.title, version: 1, ts: endedAt, content: art.content });
    for (const toolId of task.tools) {
      const tool = toolById(toolId);
      s.toolExecs.push({
        id: uid("tex"), projectId: pid, toolId, taskId: task.id, status: "SUCCESS",
        input: `${tool.name} ← ${truncate(task.title, 40)}`, output: "ok",
        ts: endedAt - 60_000, durationMs: 420, actor: "orchestrator",
        permission: tool.permissions[0] ?? "—", decision: `auto · ASSISTED policy`,
      });
      emit(s, pid, "TOOL_EXECUTED", `${tool.name} · auto`, endedAt - 60_000);
    }
    emit(s, pid, "TASK_STARTED", task.title, startedAt);
    emit(s, pid, "TASK_COMPLETED", task.title, endedAt);
    emit(s, pid, "ARTIFACT_CREATED", `${art.title} v1 → ${agentById(task.agentId).name}`, endedAt + 1_000);
    s.metrics.push({ id: uid("met"), projectId: pid, name: "task.cycle_time", value: mEnd - mStart, unit: "min", ts: endedAt, demo: true });
    s.memories.push(memory(pid, endedAt, "EPISODIC", `Task “${task.title}” completed by ${agentById(task.agentId).name}.`, "execution-trace", 0.95, 5));
    refreshReady(s, pid);
  }

  /* research.customer: calendar auto, email.send (MEDIUM) gated → WAITING + pending approval */
  const rc = s.tasks.find((x) => x.key === "research.customer" && x.projectId === pid)!;
  const rcStart = t0 + 45 * 60_000;
  s.tasks = s.tasks.map((x) => (x.id === rc.id ? { ...x, status: "WAITING", progress: 100, startedAt: rcStart } : x));
  s.runs.push({ ...finishRun(newRun(s, rc, rcStart), rc, t0 + 62 * 60_000, false) });
  s.toolExecs.push({
    id: uid("tex"), projectId: pid, toolId: "calendar.create_event", taskId: rc.id, status: "SUCCESS",
    input: "calendar.create_event ← 10 interview slots", output: "ok — 10 holds placed",
    ts: t0 + 60 * 60_000, durationMs: 380, actor: "orchestrator", permission: "calendar.write", decision: "auto · ASSISTED policy",
  });
  emit(s, pid, "TOOL_EXECUTED", "calendar.create_event · auto", t0 + 60 * 60_000);
  emit(s, pid, "TASK_STARTED", rc.title, rcStart);
  s.approvals.push({
    id: "apr_email_demo", projectId: pid, kind: "TOOL",
    title: "email.send — Send external email",
    desc: `Research agent wants to email 10 clinic managers to schedule discovery interviews. MEDIUM risk is outside the ASSISTED boundary.`,
    riskLevel: "MEDIUM", taskId: rc.id, toolId: "email.send",
    status: "PENDING", createdAt: t0 + 62 * 60_000,
  });
  emit(s, pid, "APPROVAL_REQUESTED", "email.send (MEDIUM) for “Customer Discovery Interviews”", t0 + 62 * 60_000);
  s.reasoning.push(reasoning(pid, t0 + 62 * 60_000, {
    decision: "Gate outbound email behind founder approval",
    why: "MEDIUM-risk external communication exceeds the ASSISTED autonomy boundary",
    evidence: "Policy table: ASSISTED auto-executes READ + LOW only",
    riskNote: "Sending external email without approval violates the permission model",
    next: "Founder approves in Approvals — this unblocks UX, frontend and the whole build chain",
    confidence: 0.97,
  }));

  /* ai-triage RUNNING now */
  const at = s.tasks.find((x) => x.key === "ai-triage" && x.projectId === pid)!;
  const atStart = now - 2 * 60_000;
  s.tasks = s.tasks.map((x) => (x.id === at.id ? { ...x, status: "RUNNING", startedAt: atStart, progress: 55 } : x));
  s.runs.push({ ...newRun(s, at, atStart), progress: 55 });
  emit(s, pid, "TASK_STARTED", at.title, atStart);
  emit(s, pid, "AGENT_STARTED", "Coding → “AI Triage Module” (demo-reason-4, v2.0)", atStart + 500);
  s.memories.push(memory(pid, atStart, "WORKING", "Coding agent is executing “AI Triage Module”.", "agent-dispatcher", 0.99, 4));
  s.memories.push(memory(pid, t0 + 30 * 60_000, "PREFERENCE", "Founder constraints on record: HIPAA-aware scope only; No cold outbound; Single-region deployment", "goal-intake", 0.9, 7));
  s.memories.push(memory(pid, t0 + 92 * 60_000, "SEMANTIC", "Market report: setup time and human-override trust are the underserved wedge. [verified signals only]", "research-agent", 0.8, 7));

  s.activeProjectId = pid;
  say(s, "Founder OS online — demo workspace loaded (clearly labeled demo telemetry).\nI'm mid-execution on the Healthcare SaaS goal: AI Triage Module is running, and one approval is waiting on you — the Research agent wants to email 10 clinics. Everything downstream (UX → frontend → testing) is gated on that decision.", t0);
  say(s, "status", now - 3 * 60_000, "founder");
  say(s, handleCommand(s, "status", now - 3 * 60_000 + 400), now - 3 * 60_000 + 400);
  return s;
}

/* ---------------- reducer ---------------- */

export function reducer(state: OSState, action: Action): OSState {
  switch (action.type) {
    case "TICK":
      return advance(state, action.now);
    case "SUBMIT_GOAL": {
      const s = clone(state);
      submitGoal(s, action.input, action.now);
      return s;
    }
    case "DECIDE_APPROVAL": {
      const s = clone(state);
      decideApproval(s, action.id, action.decision, action.now);
      return s;
    }
    case "SET_AUTONOMY": {
      const s = clone(state);
      s.autonomy = action.level;
      const p = s.projects.find((pp) => pp.id === s.activeProjectId);
      if (p) emit(s, p.id, "AUTONOMY_CHANGED", `Autonomy level set to ${action.level}`);
      return s;
    }
    case "TOGGLE_PAUSE": {
      const s = clone(state);
      s.paused = !s.paused;
      const p = s.projects.find((pp) => pp.id === s.activeProjectId);
      if (p) emit(s, p.id, s.paused ? "EXECUTION_PAUSED" : "EXECUTION_RESUMED", s.paused ? "All agent execution paused by founder" : "Execution resumed by founder");
      return s;
    }
    case "SKIP_PLANNING": {
      const s = clone(state);
      const p = s.projects.find((pp) => pp.id === s.activeProjectId);
      if (p && p.phase === "PLANNING") skipPlanning(s, p, action.now);
      return s;
    }
    case "CHAT": {
      const s = clone(state);
      say(s, action.text, action.now, "founder");
      const reply = handleCommand(s, action.text, action.now + 1);
      say(s, reply, action.now + 1);
      return s;
    }
    case "SET_ACTIVE": {
      const s = clone(state);
      s.activeProjectId = action.id;
      return s;
    }
    case "RETRY_TASK": {
      const s = clone(state);
      retryTask(s, action.id, action.now);
      return s;
    }
    case "SET_MODEL_ROLE": {
      const s = clone(state);
      s.providerConfig.roles[action.role] = action.modelId;
      const p = s.projects.find((pp) => pp.id === s.activeProjectId);
      if (p) emit(s, p.id, "MODEL_CHANGED", `${action.role} role → ${action.modelId}`);
      return s;
    }
    case "SET_API_KEY": {
      const s = clone(state);
      const next = { ...s.providerConfig.keys, [action.providerId]: action.key };
      if (!action.key) delete next[action.providerId];
      s.providerConfig = {
        ...s.providerConfig,
        keys: next,
        verified: { ...s.providerConfig.verified, [action.providerId]: false },
      };
      const p = s.projects.find((pp) => pp.id === s.activeProjectId);
      if (p) emit(s, p.id, "PROVIDER_KEY_UPDATED", `${action.providerId} key ${action.key ? "stored locally (masked)" : "removed"}`);
      return s;
    }
    case "MARK_PROVIDER_VERIFIED": {
      const s = clone(state);
      s.providerConfig = {
        ...s.providerConfig,
        verified: { ...s.providerConfig.verified, [action.providerId]: action.ok },
      };
      return s;
    }
    case "QUEUE_RECOMMENDATION": {
      const s = clone(state);
      queueRecommendation(s, action.id, action.now);
      return s;
    }
    case "DISMISS_RECOMMENDATION": {
      const s = clone(state);
      dismissRecommendation(s, action.id);
      return s;
    }
    case "RESET":
      return seedState(action.now);
    default:
      return state;
  }
}

export const createInitialState = (now: number): OSState => seedState(now);
