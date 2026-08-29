import type { OSState, Task, Risk, Review, ReviewAgg, ReasoningEntry, Memory, Learning, MemoryType } from "../types";
import { getPack, DOMAIN_LABEL, truncate } from "./planner";

export { truncate };
import { REVIEWERS } from "../data/registry";

/* ---------------- deterministic RNG (seeded, stored in state) ---------------- */

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let counter = 0;
export const uid = (p: string) => `${p}_${(Date.now() % 1e7).toString(36)}_${(counter++).toString(36)}`;

/* ---------------- Priority Engine ----------------
   Deterministic and inspectable: normalized factors, fixed weights.
   score = (0.30·value + 0.25·urgency + 0.20·dependency + 0.15·risk) / (0.10·effort + 0.9) · 100  */

export const PRIORITY_WEIGHTS = { value: 0.3, urgency: 0.25, dependency: 0.2, risk: 0.15, effort: 0.1 };

export function computePriority(task: Task, all: Task[], urgencyBoost = 0): { score: number; reason: string } {
  const f = task.factors;
  const urgency = Math.min(10, f.urgency + urgencyBoost);
  const raw =
    PRIORITY_WEIGHTS.value * f.value +
    PRIORITY_WEIGHTS.urgency * urgency +
    PRIORITY_WEIGHTS.dependency * f.dependency +
    PRIORITY_WEIGHTS.risk * f.risk;
  const score = Math.round(((raw / 1) / (PRIORITY_WEIGHTS.effort * f.effort + 0.9)) * 10) / 10;

  const dependents = all.filter((t) => t.dependsOn.includes(task.key)).length;
  const reason =
    `value ${f.value} · urgency ${urgency}${urgencyBoost ? ` (+${urgencyBoost} deadline)` : ""} · unlocks ${dependents} task${dependents === 1 ? "" : "s"} · ` +
    `risk ${f.risk} ÷ effort ${f.effort}`;
  return { score, reason };
}

export function applyPriorities(tasks: Task[], urgencyBoost = 0): Task[] {
  const scoped = tasks;
  return scoped.map((t) => {
    const { score, reason } = computePriority(t, scoped, urgencyBoost);
    return { ...t, priorityScore: score, priorityReason: reason };
  });
}

/* ---------------- Review Council ----------------
   Independent evaluation passes over the same proposal (demo model —
   labeled as passes, never pretended to be independent ground truth). */

export function runCouncil(projectId: string, domain: string, pass: number, ts: number, rand: () => number): { reviews: Review[]; agg: ReviewAgg } {
  const pack = getPack(domain);
  const reviews: Review[] = REVIEWERS.map((rev, i) => {
    const notes = pack.reviewerNotes[rev.id] ?? pack.reviewerNotes.product;
    const score = Math.round((6.6 + rand() * 2.6) * 10) / 10;
    const approval = score >= 8 ? "APPROVE" : score >= 7 ? "CONDITIONAL" : "CONDITIONAL";
    return {
      id: uid("rev"),
      projectId,
      reviewerId: rev.id,
      pass,
      score,
      strengths: notes.s,
      weaknesses: notes.w,
      recommendations: notes.r,
      approval,
      confidence: Math.round((0.62 + rand() * 0.3) * 100) / 100,
      ts: ts + i * 400,
    };
  });
  const overall = Math.round((reviews.reduce((a, r) => a + r.score, 0) / reviews.length) * 10) / 10;
  const agg: ReviewAgg = {
    id: uid("agg"),
    projectId,
    pass,
    overall,
    consensus:
      overall >= 8
        ? "Council supports the plan. Validation-before-build ordering and hard approval gates were the strongest themes."
        : "Council supports the plan conditionally. Scope and risk gates need the changes below before full confidence.",
    critical: reviews.flatMap((r) => r.weaknesses).slice(0, 3),
    changes: reviews.flatMap((r) => r.recommendations).slice(0, 4),
    status: overall >= 8 ? "RECOMMEND PROCEED" : "PROCEED WITH CONDITIONS",
    ts: ts + 3200,
  };
  return { reviews, agg };
}

/* ---------------- Reasoning / memory / learning factories ---------------- */

export function reasoning(projectId: string, ts: number, e: Omit<ReasoningEntry, "id" | "projectId" | "ts">): ReasoningEntry {
  return { id: uid("rea"), projectId, ts, ...e };
}

export function memory(projectId: string, ts: number, type: MemoryType, content: string, source: string, confidence: number, importance: number): Memory {
  return { id: uid("mem"), projectId, type, content, source, confidence, importance, ts };
}

export function makeLearnings(projectId: string, domain: string, ts: number, hadFailure: boolean): Learning[] {
  const pack = getPack(domain);
  const out: Learning[] = pack.learnings.map((l, i) => ({
    id: uid("lrn"),
    projectId,
    lesson: l.lesson,
    source: "Learning Engine — post-execution reflection",
    context: l.context,
    outcome: "stored to procedural + semantic memory",
    confidence: Math.round((0.7 + ((i * 7) % 20) / 100) * 100) / 100,
    applicability: l.applicability,
    ts: ts + i * 300,
  }));
  if (hadFailure) {
    out.unshift({
      id: uid("lrn"),
      projectId,
      lesson: "Failure recovery worked: root cause was identified from test output, an alternative was proposed, and the retry succeeded without repeating the same action.",
      source: "Regeneration Engine — failure trace",
      context: "Mid-execution task failure",
      outcome: "retry succeeded on attempt 2",
      confidence: 0.91,
      applicability: DOMAIN_LABEL[domain] ?? "All projects",
      ts,
    });
  }
  return out;
}

/* ---------------- selectors ---------------- */

export const tasksOf = (s: OSState, projectId: string) => s.tasks.filter((t) => t.projectId === projectId);
export const projectOf = (s: OSState, id: string | null) => s.projects.find((p) => p.id === id) ?? null;

export function projectProgress(s: OSState, projectId: string): number {
  const ts = tasksOf(s, projectId);
  if (!ts.length) return 0;
  const done = ts.filter((t) => t.status === "COMPLETED").length;
  const running = ts.filter((t) => t.status === "RUNNING").reduce((a, t) => a + t.progress, 0);
  return Math.round(((done + running / 100) / ts.length) * 100);
}

export const openRisks = (s: OSState) => s.risks.filter((r) => r.status === "OPEN" || r.status === "UPDATED");
export const pendingApprovals = (s: OSState) => s.approvals.filter((a) => a.status === "PENDING");

export function severityTone(sev: number): "mint" | "amber" | "coral" {
  if (sev >= 0.45) return "coral";
  if (sev >= 0.25) return "amber";
  return "mint";
}

/* ---------------- formatting ---------------- */

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const fmtClock = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function fmtAgo(ts: number, now: number): string {
  const d = Math.max(0, now - ts);
  if (d < 60_000) return `${Math.round(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function bumpRisk(r: Risk, dp: number, di: number, ts: number): Risk {
  const probability = Math.min(1, Math.round((r.probability + dp) * 100) / 100);
  const impact = Math.min(1, Math.round((r.impact + di) * 100) / 100);
  return { ...r, probability, impact, severity: Math.round(probability * impact * 100) / 100, status: "UPDATED", ts };
}

export { DOMAIN_LABEL };
