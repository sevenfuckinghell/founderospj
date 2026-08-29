import type { AgentDef, ToolDef, RiskLevel } from "../types";

/* Agent registry — agents are selected by capability, not hard-coded branches. */
export const AGENTS: AgentDef[] = [
  { id: "planner",   name: "Planner",        role: "Goal → objectives, milestones, task DAG, success criteria", capabilities: ["planning", "decomposition", "dependency-resolution"], version: "v1.4", model: "demo-reason-4",  riskLevel: "READ" },
  { id: "research",  name: "Research",       role: "Market, competitors, customers, regulation, prior art",      capabilities: ["research", "summarization", "source-tracking"],        version: "v1.2", model: "demo-fast-2",    riskLevel: "READ" },
  { id: "architect", name: "Architect",      role: "System architecture, data models, API design, tech choices", capabilities: ["architecture", "api-design", "tradeoff-analysis"],     version: "v1.3", model: "demo-reason-4",  riskLevel: "READ" },
  { id: "coding",    name: "Coding",         role: "Implements inside a controlled workspace, produces diffs",   capabilities: ["code-generation", "refactoring", "test-driven-edits"], version: "v2.0", model: "demo-reason-4",  riskLevel: "LOW" },
  { id: "ui",        name: "UI",             role: "Wireframes, components, pages, UX flows",                    capabilities: ["ui-design", "ux-flows", "design-specs"],               version: "v1.1", model: "demo-fast-2",    riskLevel: "READ" },
  { id: "testing",   name: "Testing",        role: "Unit, integration, E2E, edge cases, regression suites",      capabilities: ["test-generation", "edge-case-analysis", "regression"], version: "v1.5", model: "demo-fast-2",    riskLevel: "LOW" },
  { id: "docs",      name: "Documentation",  role: "README, API docs, architecture docs, user guides",           capabilities: ["technical-writing", "api-docs", "diagrams"],           version: "v1.0", model: "demo-fast-2",    riskLevel: "READ" },
  { id: "marketing", name: "Marketing",      role: "Positioning, landing copy, campaigns, SEO, experiments",     capabilities: ["copywriting", "seo", "experiment-design"],             version: "v1.2", model: "demo-fast-2",    riskLevel: "MEDIUM" },
];

export const agentById = (id: string): AgentDef => AGENTS.find((a) => a.id === id) ?? AGENTS[0];

/* Tool registry — every tool declares schema, permissions and risk level. */
export const TOOLS: ToolDef[] = [
  { id: "web.search",           name: "web.search",           description: "Search public sources for market and prior art",  riskLevel: "READ",     permissions: ["net.read"] },
  { id: "github.read_repo",     name: "github.read_repo",     description: "Read repository tree and files",                  riskLevel: "READ",     permissions: ["github.read"] },
  { id: "github.create_branch", name: "github.create_branch", description: "Create a working branch",                         riskLevel: "LOW",      permissions: ["github.write"] },
  { id: "github.create_pr",     name: "github.create_pr",     description: "Open a pull request for review",                  riskLevel: "LOW",      permissions: ["github.write"] },
  { id: "docs.create",          name: "docs.create",          description: "Create an internal document",                     riskLevel: "LOW",      permissions: ["docs.write"] },
  { id: "calendar.create_event",name: "calendar.create_event",description: "Schedule a meeting or review",                    riskLevel: "LOW",      permissions: ["calendar.write"] },
  { id: "email.send",           name: "email.send",           description: "Send external email",                             riskLevel: "MEDIUM",   permissions: ["email.send"] },
  { id: "content.publish",      name: "content.publish",      description: "Publish content to owned channels",               riskLevel: "MEDIUM",   permissions: ["content.publish"] },
  { id: "cloud.provision",      name: "cloud.provision",      description: "Provision infrastructure resources",              riskLevel: "HIGH",     permissions: ["infra.write"] },
  { id: "deploy.production",    name: "deploy.production",    description: "Deploy to production",                            riskLevel: "HIGH",     permissions: ["deploy.prod"] },
  { id: "db.delete",            name: "db.delete",            description: "Destructive database operation — never auto-run", riskLevel: "CRITICAL", permissions: ["db.admin"] },
];

export const toolById = (id: string): ToolDef => TOOLS.find((t) => t.id === id) ?? TOOLS[0];

export const RISK_LEVEL_ORDER: RiskLevel[] = ["READ", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

/* Autonomy policy — deterministic, inspectable. HIGH/CRITICAL always need a human. */
export function policyAllows(autonomy: string, level: RiskLevel): boolean {
  if (level === "HIGH" || level === "CRITICAL") return false;
  if (autonomy === "MANUAL") return level === "READ";
  if (autonomy === "ASSISTED") return level === "READ" || level === "LOW";
  return level === "READ" || level === "LOW" || level === "MEDIUM"; // SUPERVISED / AUTONOMOUS
}

export function autoRecovery(autonomy: string): boolean {
  return autonomy === "SUPERVISED" || autonomy === "AUTONOMOUS";
}

export const AUTONOMY_INFO: Record<string, { label: string; desc: string }> = {
  MANUAL:     { label: "Manual",     desc: "OS proposes everything. Every action above READ waits for you." },
  ASSISTED:   { label: "Assisted",   desc: "READ and LOW-risk actions execute automatically. Anything else needs approval." },
  SUPERVISED: { label: "Supervised", desc: "Executes up to MEDIUM-risk actions and auto-recovers failures. HIGH-risk still needs you." },
  AUTONOMOUS: { label: "Autonomous", desc: "Operates within defined boundaries, retries and replans freely. HIGH/CRITICAL can never bypass approval." },
};

/* Review council — independent evaluation passes (labeled, not pretended objectivity). */
export const REVIEWERS = [
  { id: "product",  name: "Product Reviewer",  lens: "scope, UX, roadmap coherence" },
  { id: "customer", name: "Customer Reviewer", lens: "target user, pain, willingness to pay" },
  { id: "market",   name: "Market Reviewer",   lens: "competition, timing, differentiation" },
  { id: "investor", name: "Investor Reviewer", lens: "unit economics, defensibility, risk" },
  { id: "technical",name: "Technical Reviewer",lens: "architecture, feasibility, debt" },
  { id: "security", name: "Security Reviewer", lens: "data exposure, compliance, attack surface" },
];

export const reviewerById = (id: string) => REVIEWERS.find((r) => r.id === id) ?? REVIEWERS[0];
