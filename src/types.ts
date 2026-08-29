/* ------------------------------------------------------------------ */
/* Founder OS — core domain model                                      */
/* ------------------------------------------------------------------ */

export type TaskStatus =
  | "BACKLOG" | "PLANNED" | "READY" | "RUNNING" | "WAITING" | "REVIEW"
  | "APPROVED" | "COMPLETED" | "FAILED" | "BLOCKED" | "CANCELLED";

export type Phase = "PLANNING" | "PLAN_REVIEW" | "EXECUTING" | "MEASURING" | "COMPLETED";

export type Autonomy = "MANUAL" | "ASSISTED" | "SUPERVISED" | "AUTONOMOUS";

export type RiskLevel = "READ" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type MemoryType = "WORKING" | "EPISODIC" | "SEMANTIC" | "PREFERENCE" | "PROCEDURAL";

export type ArtifactType =
  | "CODE" | "UI" | "DOCUMENT" | "DESIGN" | "CONTENT"
  | "MARKETING" | "REPORT" | "DATA" | "CONFIGURATION";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RiskStatus = "OPEN" | "UPDATED" | "MITIGATED" | "ACCEPTED";

/* ---------------- entities ---------------- */

export interface Goal {
  id: string;
  projectId: string;
  title: string;
  description: string;
  successCriteria: string[];
  constraints: string[];
  budget?: string;
  deadline?: string;
  priority: "P0" | "P1" | "P2";
  status: "ACTIVE" | "COMPLETED";
  createdAt: number;
}

export interface PipelineStage {
  id: string;
  label: string;
  status: "waiting" | "running" | "done";
  lines: string[];
  shown: number;
}

export interface Project {
  id: string;
  name: string;
  demo: boolean;
  goalId: string;
  phase: Phase;
  createdAt: number;
  planVersion: number;
  planRejectedOnce: boolean;
  pipeline: PipelineStage[];
  regenCooldown: number;
  measureTicks: number;
  reprioritized: boolean;
  domain: string;
}

export interface Task {
  id: string;
  projectId: string;
  key: string;
  title: string;
  desc: string;
  status: TaskStatus;
  agentId: string;
  dependsOn: string[]; // task keys
  tools: string[];     // tool ids used on completion
  deliverable: ArtifactType;
  priorityScore: number;
  priorityReason: string;
  factors: { value: number; urgency: number; dependency: number; risk: number; effort: number };
  acceptance: string[];
  retryCount: number;
  willFailOnce: boolean;
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  version: string;
  model: string;
  riskLevel: RiskLevel;
}

export interface AgentRun {
  id: string;
  projectId: string;
  taskId: string;
  agentId: string;
  status: "running" | "completed" | "failed";
  startedAt: number;
  endedAt?: number;
  progress: number;
  tokens: number;
  latencyMs: number;
  model: string;
  promptVersion: string;
  cost: number;
  summary?: string;
}

export interface Artifact {
  id: string;
  projectId: string;
  taskId: string;
  agentId: string;
  type: ArtifactType;
  title: string;
  version: number;
  ts: number;
  content: string;
}

export interface Risk {
  id: string;
  projectId: string;
  category: string;
  risk: string;
  probability: number; // 0..1
  impact: number;      // 0..1
  severity: number;    // probability * impact
  mitigation: string;
  owner: string;
  status: RiskStatus;
  ts: number;
}

export interface Review {
  id: string;
  projectId: string;
  reviewerId: string;
  pass: number;
  score: number; // 0..10
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  approval: "APPROVE" | "CONDITIONAL" | "REJECT";
  confidence: number;
  ts: number;
}

export interface ReviewAgg {
  id: string;
  projectId: string;
  pass: number;
  overall: number;
  consensus: string;
  critical: string[];
  changes: string[];
  status: string;
  ts: number;
}

export interface Approval {
  id: string;
  projectId: string;
  kind: "PLAN" | "TOOL";
  title: string;
  desc: string;
  riskLevel: RiskLevel | "PLAN";
  taskId?: string;
  toolId?: string;
  status: ApprovalStatus;
  createdAt: number;
  decidedAt?: number;
}

export interface ToolDef {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  permissions: string[];
}

export interface ToolExecution {
  id: string;
  projectId: string;
  toolId: string;
  taskId?: string;
  status: "SUCCESS" | "FAILED" | "BLOCKED";
  input: string;
  output: string;
  ts: number;
  durationMs: number;
  actor: string;
  permission: string;
  decision: string;
}

export interface DomainEvent {
  id: string;
  type: string;
  projectId: string;
  ts: number;
  message: string;
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  source: string;
  projectId: string;
  confidence: number;
  importance: number;
  ts: number;
}

export interface Learning {
  id: string;
  projectId: string;
  lesson: string;
  source: string;
  context: string;
  outcome: string;
  confidence: number;
  applicability: string;
  ts: number;
}

export interface Metric {
  id: string;
  projectId: string;
  name: string;
  value: number;
  unit: string;
  ts: number;
  demo: boolean;
}

export interface ReasoningEntry {
  id: string;
  projectId: string;
  ts: number;
  decision: string;
  why: string;
  evidence: string;
  riskNote: string;
  next: string;
  confidence: number;
}

export interface ChatMsg {
  id: string;
  role: "founder" | "os";
  text: string;
  ts: number;
}

export interface OSState {
  v: number;
  seed: number;
  paused: boolean;
  autonomy: Autonomy;
  activeProjectId: string | null;
  startedAt: number;
  projects: Project[];
  goals: Goal[];
  tasks: Task[];
  runs: AgentRun[];
  artifacts: Artifact[];
  risks: Risk[];
  reviews: Review[];
  aggregates: ReviewAgg[];
  approvals: Approval[];
  toolExecs: ToolExecution[];
  events: DomainEvent[];
  memories: Memory[];
  learnings: Learning[];
  metrics: Metric[];
  reasoning: ReasoningEntry[];
  chat: ChatMsg[];
}

export interface GoalInput {
  title: string;
  description: string;
  successCriteria: string[];
  constraints: string[];
  budget?: string;
  deadline?: string;
}
