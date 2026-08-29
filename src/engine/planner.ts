import type { GoalInput, PipelineStage, Task, ArtifactType, Risk } from "../types";

/* ------------------------------------------------------------------ */
/* Deterministic planning content. Demo-mode stand-in for the LLM      */
/* reasoning layer — same contracts, no external calls.                */
/* ------------------------------------------------------------------ */

export interface TaskTpl {
  key: string;
  title: string;
  desc: string;
  agent: string;
  deps: string[];
  tools: string[];
  deliverable: ArtifactType;
  acceptance: string[];
  factors: { value: number; urgency: number; dependency: number; risk: number; effort: number };
  failOnce?: boolean;
}

export interface DomainPack {
  id: string;
  label: string;
  objectives: string[];
  milestones: { title: string; keys: string[] }[];
  tasks: TaskTpl[];
  risks: { category: string; risk: string; probability: number; impact: number; mitigation: string }[];
  failure: { rootCause: string; alternative: string };
  learnings: { lesson: string; context: string; applicability: string }[];
  outcomeMetrics: { name: string; unit: string; value: number }[];
  reviewerNotes: Record<string, { s: string[]; w: string[]; r: string[] }>;
}

export function detectDomain(text: string): string {
  const t = text.toLowerCase();
  if (/(clinic|health|medical|patient|hipaa|triage|pharma)/.test(t)) return "healthcare";
  if (/(market|agency|brand|campaign|content|audience|seo|newsletter)/.test(t)) return "marketing";
  if (/(shop|store|ecommerce|commerce|checkout|inventory)/.test(t)) return "commerce";
  return "venture";
}

export const DOMAIN_LABEL: Record<string, string> = {
  healthcare: "Healthcare SaaS",
  marketing: "AI Marketing Engine",
  commerce: "Commerce Platform",
  venture: "Product Venture",
};

const T = (
  key: string, title: string, agent: string, deps: string[], tools: string[],
  deliverable: ArtifactType, desc: string,
  f: [number, number, number, number, number],
  acceptance: string[], failOnce = false,
): TaskTpl => ({
  key, title, desc, agent, deps, tools, deliverable, acceptance, failOnce,
  factors: { value: f[0], urgency: f[1], dependency: f[2], risk: f[3], effort: f[4] },
});

const PACKS: Record<string, DomainPack> = {
  healthcare: {
    id: "healthcare", label: "Healthcare SaaS",
    objectives: [
      "Validate that small clinics will pay for AI-assisted triage",
      "Ship a compliant MVP: intake → AI triage → clinician review",
      "Convert pilot usage into 10 signed clinic accounts",
    ],
    milestones: [
      { title: "Validation", keys: ["research.market", "research.customer"] },
      { title: "Core Build", keys: ["architecture", "ux", "backend", "frontend"] },
      { title: "Quality Gate", keys: ["ai-triage", "testing", "security"] },
      { title: "Pilot Launch", keys: ["docs", "launch"] },
    ],
    tasks: [
      T("research.market", "Market & Regulatory Research", "research", [], ["web.search"], "REPORT",
        "Size the small-clinic segment, map HIPAA constraints, scan existing triage tools.",
        [8, 9, 7, 4, 3], ["Segment size with sources", "Regulatory checklist", "5 competitors scored"]),
      T("research.customer", "Customer Discovery Interviews", "research", [], ["calendar.create_event", "email.send"], "REPORT",
        "Run structured interviews with clinic managers; separate verified facts from assumptions.",
        [9, 9, 6, 3, 4], ["10 interviews completed", "Pain-frequency table", "Willingness-to-pay signals"]),
      T("architecture", "System Architecture & Data Model", "architect", ["research.market"], ["docs.create"], "DOCUMENT",
        "Define services, PHI data boundaries, audit logging and deployment topology.",
        [8, 7, 9, 7, 4], ["C4 diagrams", "PHI boundary map", "API contract v1"]),
      T("ux", "UX Flows & Wireframes", "ui", ["research.customer"], [], "DESIGN",
        "Intake, triage queue and clinician override flows; low-fi wireframes.",
        [7, 6, 6, 3, 3], ["3 core flows", "Override path explicit", "Accessibility pass"]),
      T("backend", "Backend Services & API", "coding", ["architecture"], ["github.create_branch", "github.create_pr"], "CODE",
        "Auth, clinic tenancy, intake API, triage job queue on a controlled branch.",
        [9, 8, 9, 6, 6], ["API passes contract tests", "Tenancy isolation verified", "PR opened"]),
      T("frontend", "Frontend Application", "coding", ["architecture", "ux"], ["github.create_branch", "github.create_pr"], "CODE",
        "Clinic dashboard: intake form, triage queue, clinician review screen.",
        [8, 7, 7, 4, 6], ["Flows match wireframes", "Queue latency < 300ms", "PR opened"]),
      T("ai-triage", "AI Triage Module", "coding", ["backend"], ["github.create_pr"], "CODE",
        "Structured symptom intake → urgency scoring with human-override hook.",
        [9, 7, 8, 8, 5], ["Scores explainable", "Override always available", "Fallback on low confidence"]),
      T("testing", "Integration & Regression Testing", "testing", ["backend", "frontend"], [], "REPORT",
        "Integration suite across intake→triage→review plus regression baselines.",
        [8, 8, 8, 7, 4], ["Green on staging data", "Edge cases covered", "Regression baseline stored"], true),
      T("security", "Security & Compliance Review", "testing", ["ai-triage"], [], "REPORT",
        "Threat model, PHI handling audit, access-control matrix.",
        [9, 6, 6, 9, 3], ["Threat model doc", "No critical findings open", "Audit trail verified"]),
      T("docs", "Documentation Set", "docs", ["backend"], ["docs.create"], "DOCUMENT",
        "README, API reference, deployment runbook, clinic onboarding guide.",
        [5, 4, 5, 2, 3], ["API reference complete", "Runbook tested", "Onboarding < 1 day"]),
      T("launch", "Staging Deploy & Pilot Launch", "marketing", ["testing", "security"], ["cloud.provision", "deploy.production"], "REPORT",
        "Provision staging, deploy behind approval gate, onboard pilot clinics.",
        [10, 8, 9, 8, 5], ["Staging healthy 48h", "Pilot clinics onboarded", "Feedback channel live"]),
    ],
    risks: [
      { category: "Regulatory", risk: "HIPAA scope creep delays release", probability: 0.55, impact: 0.9, mitigation: "Freeze PHI surface at architecture step; compliance checklist per PR" },
      { category: "Technical", risk: "Triage model underperforms on rare symptoms", probability: 0.5, impact: 0.8, mitigation: "Confidence threshold with mandatory human override" },
      { category: "Timeline", risk: "Integration testing reveals cross-service gaps", probability: 0.6, impact: 0.6, mitigation: "Contract tests at backend milestone; buffer before quality gate" },
      { category: "Market", risk: "Clinic budget cycles push purchasing to next quarter", probability: 0.45, impact: 0.7, mitigation: "Pilot pricing with monthly exit; start procurement talk at interview stage" },
      { category: "Security", risk: "PHI exposure via misconfigured storage", probability: 0.2, impact: 1.0, mitigation: "Encryption by default, bucket policies as code, security review gate" },
    ],
    failure: {
      rootCause: "Integration suite failed: triage job writes to the encounters table before the backend migration adds the audit column — schema drift between services.",
      alternative: "Architect proposes contract-tested migration ordering: run backend migration job first, gate triage writes behind schema version check, then re-run integration suite.",
    },
    learnings: [
      { lesson: "Contract tests between services catch schema drift two milestones earlier than integration testing.", context: "Integration failure during quality gate", applicability: "All multi-service builds" },
      { lesson: "Clinic managers decide in committees — pilot offers need a one-page security summary attached by default.", context: "Customer discovery interviews", applicability: "B2B health sales motions" },
      { lesson: "Human-override hooks raise trust scores more than accuracy improvements in early pilots.", context: "AI triage pilot feedback", applicability: "Any human-in-the-loop AI feature" },
    ],
    outcomeMetrics: [
      { name: "Pilot clinics onboarded", unit: "clinics", value: 4 },
      { name: "Triage override rate", unit: "%", value: 11 },
      { name: "Median intake-to-review", unit: "min", value: 6 },
    ],
    reviewerNotes: {
      product:   { s: ["Tight scope: intake → triage → review only", "Override path designed in from day one"], w: ["No retention loop in v1"], r: ["Add a follow-up queue for borderline cases"] },
      customer:  { s: ["Interviews scheduled before build", "Pain is frequent and measurable"], w: ["Willingness-to-pay still an assumption"], r: ["Get 3 LOIs before the quality gate"] },
      market:    { s: ["Small clinics are underserved by enterprise triage suites"], w: ["Two well-funded competitors adjacent"], r: ["Position on setup time, not accuracy"] },
      investor:  { s: ["Clear wedge and expansion path to billing"], w: ["60-day deadline is aggressive for HIPAA scope"], r: ["Track cost-per-pilot from day one"] },
      technical: { s: ["PHI boundary explicit in architecture step"], w: ["Triage latency budget untested"], r: ["Contract tests before frontend starts"] },
      security:  { s: ["Security review is a hard gate before launch"], w: ["Audit logging coverage undefined"], r: ["Threat-model the override path itself"] },
    },
  },

  marketing: {
    id: "marketing", label: "AI Marketing Engine",
    objectives: [
      "Find a repeatable ICP with verified demand signals",
      "Ship a conversion-ready site plus content engine",
      "Reach 500 qualified visitors and 40 leads in 30 days",
    ],
    milestones: [
      { title: "Discovery", keys: ["research.market", "research.icp"] },
      { title: "Foundation", keys: ["positioning", "brand", "site"] },
      { title: "Distribution", keys: ["content", "seo", "outreach"] },
      { title: "Launch", keys: ["automation", "campaign"] },
    ],
    tasks: [
      T("research.market", "Competitive Landscape Scan", "research", [], ["web.search"], "REPORT",
        "Map AI marketing tools, pricing, messaging gaps and channel presence.",
        [8, 9, 6, 3, 3], ["10 competitors mapped", "3 messaging gaps", "Channel audit"]),
      T("research.icp", "ICP & Demand Research", "research", [], ["web.search"], "REPORT",
        "Identify where the target audience complains publicly; extract language.",
        [9, 9, 6, 3, 3], ["ICP profile", "20 verbatim pain quotes", "Channel ranking"]),
      T("positioning", "Positioning & Offer", "marketing", ["research.market", "research.icp"], ["docs.create"], "CONTENT",
        "One-sentence positioning, offer ladder, objection handling.",
        [9, 8, 8, 4, 3], ["Positioning statement", "3-tier offer", "Objection sheet"]),
      T("brand", "Brand Kit & Design System", "ui", ["positioning"], [], "DESIGN",
        "Logo mark, type pairings, color tokens, social templates.",
        [6, 5, 6, 2, 3], ["Tokens documented", "10 social templates", "Favicon + OG image"]),
      T("site", "Landing Site Build", "coding", ["positioning", "brand"], ["github.create_branch", "github.create_pr"], "CODE",
        "High-converting landing page with waitlist capture and CMS hook.",
        [9, 8, 8, 5, 5], ["Lighthouse > 90", "Waitlist wired", "PR opened"]),
      T("content", "Content Engine: 12 Assets", "marketing", ["positioning"], ["content.publish"], "MARKETING",
        "Launch posts, threads, SEO articles from ICP language.",
        [8, 7, 6, 3, 5], ["12 assets drafted", "Publish calendar", "UTM scheme"]),
      T("seo", "SEO Foundation", "marketing", ["site", "content"], [], "MARKETING",
        "Keyword map, on-page fixes, internal linking plan.",
        [6, 5, 5, 2, 3], ["30 keywords mapped", "Meta set site-wide", "Sitemap live"]),
      T("outreach", "Founder-Led Outreach", "marketing", ["research.icp"], ["email.send", "calendar.create_event"], "REPORT",
        "30 personalized conversations with ICP prospects; log responses.",
        [8, 8, 5, 4, 4], ["30 sends", "Reply rate tracked", "5 calls booked"]),
      T("automation", "Lead Automation Pipeline", "coding", ["site"], ["github.create_pr"], "CODE",
        "Waitlist → CRM sync → nurture sequence triggers.",
        [7, 6, 7, 6, 4], ["Leads sync < 1min", "Sequences fire", "Failure alerts"]),
      T("campaign", "Launch Campaign & Measure", "marketing", ["content", "automation"], ["content.publish"], "REPORT",
        "Coordinated publish, daily metric review, kill/keep decisions.",
        [9, 8, 8, 5, 4], ["All channels live", "Daily metrics log", "Week-1 retro"]),
    ],
    risks: [
      { category: "Market", risk: "Message blends into generic AI-marketing noise", probability: 0.6, impact: 0.7, mitigation: "Position on ICP verbatim language, not features" },
      { category: "Timeline", risk: "Content engine stalls without a publish cadence", probability: 0.5, impact: 0.5, mitigation: "Batch 12 assets before launch week" },
      { category: "Dependency", risk: "CMS/webhook integration breaks the waitlist", probability: 0.4, impact: 0.6, mitigation: "Local fallback store behind the form" },
      { category: "Financial", risk: "Paid experiments burn budget with no signal", probability: 0.35, impact: 0.5, mitigation: "Organic-first; paid only after 2 organic wins" },
    ],
    failure: {
      rootCause: "Landing build failed: CMS webhook schema mismatch drops 1 in 3 waitlist submissions silently.",
      alternative: "Rebuild with a local-first queue: form writes to a local store, background sync retries with schema validation and dead-letter alerts.",
    },
    learnings: [
      { lesson: "ICP verbatim language outperforms feature-led copy on every asset tested.", context: "Launch campaign metrics", applicability: "All early-stage positioning" },
      { lesson: "Silent integration failures are the costliest class — every webhook needs a dead-letter alert.", context: "Landing site incident", applicability: "Any external integration" },
      { lesson: "Founder-led outreach booked 4× more calls than channel posts per hour invested.", context: "Outreach log", applicability: "Pre-product-market-fit distribution" },
    ],
    outcomeMetrics: [
      { name: "Qualified visitors", unit: "visits", value: 612 },
      { name: "Waitlist signups", unit: "leads", value: 47 },
      { name: "Visitor→lead rate", unit: "%", value: 7.7 },
    ],
    reviewerNotes: {
      product:   { s: ["Funnel is one page deep — easy to measure"], w: ["No product demo in v1"], r: ["Ship an interactive sample output on the page"] },
      customer:  { s: ["ICP research before any writing"], w: ["Lead quality criteria undefined"], r: ["Define qualified-lead rules before launch"] },
      market:    { s: ["Crowded but poorly differentiated competitors"], w: ["Fast follower risk"], r: ["Own one narrow workflow completely"] },
      investor:  { s: ["Capital-light test with clear kill criteria"], w: ["40 leads is thin evidence"], r: ["Track lead→call conversion weekly"] },
      technical: { s: ["Static-first build keeps risk low"], w: ["CMS dependency under-tested"], r: ["Add local fallback queue"] },
      security:  { s: ["Minimal data surface"], w: ["Email tool has broad permissions"], r: ["Scope email tool to one verified domain"] },
    },
  },

  commerce: {
    id: "commerce", label: "Commerce Platform",
    objectives: [
      "Validate the niche catalog thesis with real orders",
      "Ship checkout, inventory sync and order emails",
      "Process 100 orders with <1% payment failures",
    ],
    milestones: [
      { title: "Discovery", keys: ["research.market", "research.customer"] },
      { title: "Storefront", keys: ["architecture", "ux", "storefront"] },
      { title: "Commerce Core", keys: ["checkout", "inventory", "testing"] },
      { title: "Open Doors", keys: ["docs", "launch"] },
    ],
    tasks: [
      T("research.market", "Niche & Supplier Research", "research", [], ["web.search"], "REPORT",
        "Size the niche, shortlist suppliers, map margin structure.",
        [8, 9, 6, 4, 3], ["Supplier shortlist", "Margin model", "3 niches ranked"]),
      T("research.customer", "Buyer Interviews", "research", [], ["calendar.create_event", "email.send"], "REPORT",
        "Talk to 10 target buyers about purchase triggers and blockers.",
        [9, 8, 5, 3, 3], ["10 interviews", "Trigger list", "Price anchors"]),
      T("architecture", "Commerce Architecture", "architect", ["research.market"], ["docs.create"], "DOCUMENT",
        "Catalog, cart, orders, payment adapter boundary, webhooks.",
        [8, 7, 9, 6, 4], ["Domain model", "Payment adapter spec", "Webhook map"]),
      T("ux", "Store UX & Flows", "ui", ["research.customer"], [], "DESIGN",
        "Browse → product → cart → checkout flows, mobile first.",
        [7, 6, 6, 3, 3], ["5 screens", "Mobile pass", "Empty states"]),
      T("storefront", "Storefront Build", "coding", ["architecture", "ux"], ["github.create_branch", "github.create_pr"], "CODE",
        "Catalog pages, search, product detail, cart persistence.",
        [9, 8, 8, 5, 6], ["Search < 200ms", "Cart survives reload", "PR opened"]),
      T("checkout", "Checkout & Payments", "coding", ["storefront"], ["github.create_pr"], "CODE",
        "Payment adapter, retries, idempotent order creation.",
        [10, 8, 9, 9, 6], ["Idempotency keys", "Retry path tested", "PR opened"]),
      T("inventory", "Inventory Sync Service", "coding", ["storefront"], ["github.create_pr"], "CODE",
        "Supplier feed ingestion, stock levels, backorder rules.",
        [8, 7, 7, 6, 5], ["Sync < 15min", "Oversell guard", "Alerts wired"]),
      T("testing", "End-to-End Order Testing", "testing", ["checkout", "inventory"], [], "REPORT",
        "Full order lifecycle incl. failed payments and refunds.",
        [9, 8, 8, 8, 4], ["Lifecycle suite green", "Refund path covered", "Load spot-check"], true),
      T("docs", "Ops & Support Docs", "docs", ["checkout"], ["docs.create"], "DOCUMENT",
        "Runbook, refund policy, supplier onboarding.",
        [5, 4, 4, 2, 2], ["Runbook", "Policy page", "Supplier guide"]),
      T("launch", "Soft Launch & Ads Test", "marketing", ["testing", "docs"], ["content.publish", "deploy.production"], "REPORT",
        "Open the store, run a small ads test, daily metrics review.",
        [9, 8, 8, 6, 4], ["Store live", "Ads < budget cap", "Daily metrics log"]),
    ],
    risks: [
      { category: "Financial", risk: "Payment failures above 1% during launch window", probability: 0.3, impact: 0.9, mitigation: "Idempotent retries + 3DS fallback path" },
      { category: "Dependency", risk: "Supplier feed format changes break inventory sync", probability: 0.5, impact: 0.6, mitigation: "Schema-validated ingestion with alerting" },
      { category: "Market", risk: "Niche demand smaller than interviews suggest", probability: 0.4, impact: 0.8, mitigation: "Pre-orders before bulk inventory purchase" },
      { category: "Operational", risk: "Refund workflow undefined until first dispute", probability: 0.45, impact: 0.5, mitigation: "Refund path tested and documented pre-launch" },
    ],
    failure: {
      rootCause: "E2E suite failed: inventory sync deadlocks with checkout under concurrent orders — missing row-level lock on stock decrement.",
      alternative: "Architect proposes atomic stock decrement via conditional update (WHERE stock >= qty) plus a reconciliation job; re-run E2E suite.",
    },
    learnings: [
      { lesson: "Idempotency keys on order creation removed an entire class of duplicate-charge bugs.", context: "Checkout hardening", applicability: "All payment flows" },
      { lesson: "Pre-orders predicted niche demand more accurately than interviews.", context: "Launch metrics", applicability: "Physical goods ventures" },
      { lesson: "Testing refund paths before the first dispute cut support time in half.", context: "Ops docs retro", applicability: "Any commerce system" },
    ],
    outcomeMetrics: [
      { name: "Orders processed", unit: "orders", value: 118 },
      { name: "Payment failure rate", unit: "%", value: 0.8 },
      { name: "Average order value", unit: "$", value: 64 },
    ],
    reviewerNotes: {
      product:   { s: ["Ruthless focus on one niche catalog"], w: ["Search relevance untested"], r: ["Log zero-result queries from day one"] },
      customer:  { s: ["Buyer interviews include price anchors"], w: ["Repeat-purchase assumption untested"], r: ["Add a post-order survey"] },
      market:    { s: ["Supplier economics validated early"], w: ["Low switching costs for buyers"], r: ["Build the curation story as the moat"] },
      investor:  { s: ["Margin model before build"], w: ["Inventory capital risk"], r: ["Pre-order funded inventory only"] },
      technical: { s: ["Payment adapter isolates PSP risk"], w: ["Sync concurrency untested"], r: ["Load test checkout at 10× expected peak"] },
      security:  { s: ["No raw card data touched"], w: ["Webhook secrets rotation undefined"], r: ["Automate secret rotation pre-launch"] },
    },
  },
};

PACKS.venture = {
  id: "venture", label: "Product Venture",
  objectives: [
    "Validate the core problem with 10 target users",
    "Ship a usable MVP of the core workflow end-to-end",
    "Establish one measurable activation metric and a baseline",
  ],
  milestones: [
    { title: "Discovery", keys: ["research.market", "research.customer"] },
    { title: "Design", keys: ["mvp-scope", "architecture", "ux"] },
    { title: "Build", keys: ["build-backend", "build-frontend", "testing"] },
    { title: "Ship", keys: ["docs", "launch"] },
  ],
  tasks: [
    T("research.market", "Market & Prior-Art Scan", "research", [], ["web.search"], "REPORT",
      "Map adjacent solutions, pricing, and the gap this venture takes.",
      [8, 9, 6, 3, 3], ["8 alternatives scored", "Gap statement", "Pricing landscape"]),
    T("research.customer", "Problem Interviews", "research", [], ["calendar.create_event", "email.send"], "REPORT",
      "10 interviews to verify the problem is frequent and painful.",
      [9, 9, 6, 3, 3], ["10 interviews", "Severity ranking", "Segment notes"]),
    T("mvp-scope", "MVP Scope Decision", "architect", ["research.customer"], ["docs.create"], "DOCUMENT",
      "Cut scope to the smallest workflow that delivers the core value.",
      [9, 8, 8, 5, 2], ["One-page scope", "Explicit non-goals", "Success metric chosen"]),
    T("architecture", "Architecture & Data Model", "architect", ["mvp-scope"], ["docs.create"], "DOCUMENT",
      "Services, storage, auth and deployment shape for the MVP.",
      [8, 7, 8, 5, 3], ["Component diagram", "Data model", "Deploy plan"]),
    T("ux", "UX Flows & Wireframes", "ui", ["mvp-scope"], [], "DESIGN",
      "Core workflow screens with empty and error states.",
      [7, 6, 6, 2, 3], ["Core flow wireframes", "Error states", "Mobile pass"]),
    T("build-backend", "Backend & API", "coding", ["architecture"], ["github.create_branch", "github.create_pr"], "CODE",
      "Auth, core domain API, persistence on a controlled branch.",
      [9, 8, 9, 5, 6], ["Contract tests pass", "PR opened", "Staging deploy script"]),
    T("build-frontend", "Frontend App", "coding", ["architecture", "ux"], ["github.create_branch", "github.create_pr"], "CODE",
      "The core workflow UI against the real API.",
      [8, 8, 7, 4, 6], ["Flow works end-to-end", "PR opened", "Basic a11y pass"]),
    T("testing", "Integration Testing", "testing", ["build-backend", "build-frontend"], [], "REPORT",
      "End-to-end tests of the core workflow plus edge cases.",
      [8, 8, 8, 6, 4], ["E2E suite green", "Edge cases logged", "Regression baseline"], true),
    T("docs", "Documentation", "docs", ["build-backend"], ["docs.create"], "DOCUMENT",
      "README, API docs and a short user guide.",
      [5, 4, 4, 2, 2], ["README", "API reference", "User guide"]),
    T("launch", "Deploy & Soft Launch", "marketing", ["testing", "docs"], ["cloud.provision", "deploy.production"], "REPORT",
      "Provision, deploy behind the approval gate, invite 10 users.",
      [10, 8, 8, 6, 4], ["Deploy verified", "10 invites sent", "Feedback channel live"]),
  ],
  risks: [
    { category: "Market", risk: "Problem is real but not painful enough to switch", probability: 0.5, impact: 0.8, mitigation: "Severity threshold defined before build; kill criteria explicit" },
    { category: "Timeline", risk: "Scope creep beyond the one-page MVP", probability: 0.6, impact: 0.6, mitigation: "Non-goals list enforced at review gates" },
    { category: "Technical", risk: "Integration gaps found late in testing", probability: 0.5, impact: 0.6, mitigation: "Contract tests at the backend milestone" },
    { category: "Operational", risk: "No feedback loop after launch", probability: 0.4, impact: 0.7, mitigation: "Feedback channel and weekly review baked into launch task" },
  ],
  failure: {
    rootCause: "Integration tests failed: frontend expects paginated responses but the API returns flat lists — contract drift between agents.",
    alternative: "Architect proposes a shared OpenAPI contract generated from the backend and consumed by frontend tests; re-run the suite against it.",
  },
  learnings: [
    { lesson: "A one-page scope with explicit non-goals survived every replan without drift.", context: "MVP scope decision", applicability: "All early ventures" },
    { lesson: "Shared API contracts remove most cross-agent integration failures.", context: "Integration failure recovery", applicability: "Any multi-agent build" },
    { lesson: "Inviting exactly 10 users produced sharper feedback than an open launch.", context: "Soft launch retro", applicability: "Early user research" },
  ],
  outcomeMetrics: [
    { name: "Activated users", unit: "users", value: 7 },
    { name: "Core-flow completion", unit: "%", value: 68 },
    { name: "NPS (n=7)", unit: "score", value: 41 },
  ],
  reviewerNotes: {
    product:   { s: ["Scope is one workflow deep, not wide"], w: ["Retention mechanism undefined"], r: ["Pick the activation metric before build"] },
    customer:  { s: ["Interviews verify problem before build"], w: ["Sample of 10 is small"], r: ["Track severity per interview, not just count"] },
    market:    { s: ["Clear gap statement"], w: ["Differentiation thin"], r: ["Name the one thing you do 10× better"] },
    investor:  { s: ["Cheap test, honest kill criteria"], w: ["No expansion path articulated"], r: ["Write the sequel vision, don't build it"] },
    technical: { s: ["Boring stack, fast to ship"], w: ["Contract between services implicit"], r: ["Generate OpenAPI from day one"] },
    security:  { s: ["Auth in scope from the start"], w: ["No threat model yet"], r: ["Add a lightweight threat model at architecture"] },
  },
};

export const getPack = (domain: string): DomainPack => PACKS[domain] ?? PACKS.venture;

/* ---------------- pipeline script (visible, structured — not hidden CoT) ---- */

export function pipelineScript(domain: string, goal: GoalInput, taskCount: number, riskCount: number): PipelineStage[] {
  const label = DOMAIN_LABEL[domain] ?? "venture";
  const criteria = goal.successCriteria.length ? goal.successCriteria.length : 0;
  const L = (a: string[]) => a;
  return [
    { id: "analyze", label: "Analyzing goal", status: "running", shown: 0, lines: L([
      `Parsed goal: “${truncate(goal.title, 64)}”`,
      `Detected domain profile: ${label}`,
      criteria ? `Locked ${criteria} founder-defined success criteria — will not invent replacements` : "No explicit success criteria — flagging assumptions for review",
      goal.deadline ? `Constraint registered: deadline ${goal.deadline}` : "No deadline set — planning with open horizon",
    ]) },
    { id: "context", label: "Building context", status: "waiting", shown: 0, lines: L([
      "Retrieving episodic memory from prior executions",
      "Pulling preference memory: founder decision patterns",
      "Selecting relevant knowledge nodes (ranked, not dumped)",
      goal.constraints.length ? `Applied ${goal.constraints.length} stated constraints to context window` : "Context assembled within token budget",
    ]) },
    { id: "strategy", label: "Creating strategy", status: "waiting", shown: 0, lines: L([
      "Comparing wedge options against validation cost",
      "Strategy: validate before building; build behind gates",
      "Objectives derived from success criteria, not assumptions",
    ]) },
    { id: "roadmap", label: "Creating roadmap", status: "waiting", shown: 0, lines: L([
      `Decomposed goal into ${taskCount} tasks with explicit dependencies`,
      "Dependency graph validated as a DAG (no cycles)",
      "Milestones placed at validation, build and ship boundaries",
      "Priority engine scored every task (value × urgency × dependency ÷ effort)",
    ]) },
    { id: "risks", label: "Identifying risks", status: "waiting", shown: 0, lines: L([
      `Risk engine registered ${riskCount} risks across technical, market, timeline, security`,
      "Severity computed as probability × impact — formula inspectable in Settings",
      "Top risk assigned an owner and a mitigation before execution",
    ]) },
    { id: "review", label: "Review council", status: "waiting", shown: 0, lines: L([
      "Dispatching proposal to 6 independent evaluation passes",
      "Product · Customer · Market · Investor · Technical · Security",
      "Aggregating scores into consensus + critical issues",
    ]) },
    { id: "plan", label: "Preparing execution plan", status: "waiting", shown: 0, lines: L([
      "Execution plan versioned (v1) and linked to goal",
      "High-risk tools flagged for founder approval",
      "Awaiting founder decision — nothing executes until approved",
    ]) },
  ];
}

export const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/* ---------------- artifact content ---------------- */

export function artifactFor(domain: string, taskKey: string, goalTitle: string): { title: string; type: ArtifactType; content: string } {
  const d = DOMAIN_LABEL[domain] ?? "Venture";
  const by: Record<string, { title: string; type: ArtifactType; content: string }> = {
    "research.market": { title: "Market & Prior-Art Report", type: "REPORT", content:
      `MARKET REPORT — ${d}\nSource confidence: verified claims cite sources; the rest marked [assumption].\n\n1. Segment: bottom-up size built from public counts; serviceable slice ~12% [verified]\n2. Adjacent solutions: 8 scored on price, setup time, lock-in\n3. Gaps: setup time and human-override trust are underserved\n4. Regulation surface mapped; 3 hard constraints identified\n5. Recommendation: wedge on setup time; avoid feature parity fight` },
    "research.customer": { title: "Customer Discovery Report", type: "REPORT", content:
      `CUSTOMER DISCOVERY — ${d}\n10 interviews · 7 roles · verbatim log attached\n\nTop pains (frequency): 6/10 manual handoffs · 5/10 status opacity · 4/10 cost surprises\nWillingness to pay: anchored to hours saved, not features [assumption until pilot]\nBuying process: champion → ops sign-off → security questionnaire\nDecision: build for the champion's daily workflow first.` },
    "research.icp": { title: "ICP & Demand Report", type: "REPORT", content:
      `ICP RESEARCH — ${d}\n20 verbatim pain quotes extracted from public conversations.\n\nICP: teams of 3–15, already paying for an adjacent tool, complaining about manual follow-ups.\nChannels ranked: niche communities > search > paid.\nLanguage bank created — every asset must use their words, not ours.` },
    "architecture": { title: "Architecture Decision Record", type: "DOCUMENT", content:
      `ARCHITECTURE v1 — ${d}\nStyle: modular monolith; split boundary drawn at the data-permission seam.\nData model: 9 core entities, audit columns on every write.\nAPI: versioned REST contract (OpenAPI generated, shared with frontend tests).\nSecurity: least-privilege service roles; secrets via env, never in DB fields.\nDeploy: single region, staging + prod, infra described as code.\nOpen question carried to review: sync vs async for the heavy job path.` },
    "mvp-scope": { title: "MVP Scope Decision", type: "DOCUMENT", content:
      `MVP SCOPE — one page\nIN: the single core workflow end-to-end, auth, basic error handling.\nOUT: integrations, admin panels, billing automation, mobile apps.\nSuccess metric: one activation event, measured per user.\nRule: any addition requires removing something of equal size.` },
    "ux": { title: "UX Flow Specification", type: "DESIGN", content:
      `UX SPEC — ${d}\nFlows: entry → core action → review → done (4 states each: empty, loading, error, success).\nOverride/escape path visible on every AI-assisted screen.\nType scale: 12/14/18/24 · spacing 4px grid · contrast AA verified.\nHandoff: annotated wireframes with interaction notes for the build agents.` },
    "brand": { title: "Brand Kit", type: "DESIGN", content:
      `BRAND KIT — ${d}\nMark: geometric, single-color safe. Type: display grotesk + humanist body.\nTokens: ink surfaces, one signal color, amber for warnings — no gradient headlines.\n10 social templates sized per channel. OG image + favicon included.` },
    "backend": { title: "Backend Service + PR", type: "CODE", content:
      `BACKEND — branch: feat/core-api\nModules: auth (session), tenancy guard, domain API, job queue.\nTests: contract suite generated from OpenAPI — 42 passing.\nDiff: 31 files, +1,842 / −63. No secrets in code; env-validated at boot.\nPR opened with reviewer checklist; CI green on 2nd pass.` },
    "build-backend": { title: "Backend Service + PR", type: "CODE", content:
      `BACKEND — branch: feat/core-api\nAuth, core domain API, persistence layer, staging deploy script.\nContract tests: 34 passing. Diff: 24 files, +1,210 / −18. PR opened, CI green.` },
    "frontend": { title: "Frontend Application + PR", type: "CODE", content:
      `FRONTEND — branch: feat/dashboard\nScreens: intake, live queue, review panel — wired to real API.\nPerf: queue render < 300ms on throttled profile.\nDiff: 27 files, +1,466 / −40. PR opened against contract tests.` },
    "build-frontend": { title: "Frontend App + PR", type: "CODE", content:
      `FRONTEND — branch: feat/app\nCore workflow UI against the real API; empty/loading/error states covered.\nDiff: 19 files, +980 / −12. PR opened, E2E selectors stable.` },
    "storefront": { title: "Storefront + PR", type: "CODE", content:
      `STOREFRONT — branch: feat/store\nCatalog, search (<200ms), product pages, cart that survives reload.\nDiff: 33 files, +1,720 / −25. PR opened with perf budget check.` },
    "checkout": { title: "Checkout & Payments + PR", type: "CODE", content:
      `CHECKOUT — branch: feat/payments\nIdempotent order creation, retry with exponential backoff, 3DS fallback.\nFailure-path tests: duplicate webhook, timeout, partial capture — all covered.\nDiff: 22 files, +1,130 / −8. PR opened; security reviewer tagged.` },
    "inventory": { title: "Inventory Sync Service + PR", type: "CODE", content:
      `INVENTORY SYNC — branch: feat/inventory\nSchema-validated supplier ingestion, atomic stock decrement, backorder rules.\nReconciliation job nightly; drift alerts wired. Diff: 18 files, +840 / −30.` },
    "ai-triage": { title: "AI Triage Module + PR", type: "CODE", content:
      `AI TRIAGE — branch: feat/triage\nStructured intake → urgency score with explanation field.\nConfidence < 0.7 → mandatory human review (hard-coded, not configurable).\nFallback: rule-based path when model unavailable. Diff: 16 files, +720 / −14.` },
    "testing": { title: "Test & Regression Report", type: "REPORT", content:
      `TEST REPORT — run after recovery\nSuites: integration 48 · edge-case 17 · regression baseline stored.\nRecovered failure re-tested 3× — stable.\nResidual: 2 low-severity flakies quarantined with tickets.` },
    "security": { title: "Security & Compliance Review", type: "REPORT", content:
      `SECURITY REVIEW\nThreat model: 14 nodes, 3 high-priority paths mitigated.\nAccess matrix verified; audit log emits on every privileged write.\nFindings: 0 critical · 1 medium (rotating webhook secret — ticket open).` },
    "docs": { title: "Documentation Set", type: "DOCUMENT", content:
      `DOCS\nREADME (5-minute start) · API reference (generated) · runbook · onboarding guide.\nRunbook tested by a fresh agent run — 0 undocumented steps found.` },
    "launch": { title: "Launch & Pilot Report", type: "REPORT", content:
      `LAUNCH REPORT — ${d}\nGoal: ${truncate(goalTitle, 60)}\nStaging healthy 48h → production deploy executed AFTER founder approval.\nPilot onboarded with feedback channel live; daily metric review scheduled.\nAll deploy steps audit-logged; rollback path verified.` },
    "positioning": { title: "Positioning & Offer Doc", type: "CONTENT", content:
      `POSITIONING\nOne sentence, in ICP language — no AI buzzwords above the fold.\nOffer ladder: free sample output → guided pilot → team plan.\nObjection sheet: 6 objections with proof-backed answers.` },
    "content": { title: "Content Engine: 12 Assets", type: "MARKETING", content:
      `CONTENT BATCH — 12 assets\n3 launch posts · 4 short threads · 3 SEO articles · 2 comparison pages.\nEvery asset sourced from the ICP language bank; UTMs on all links.\nPublish calendar: 2/day across launch week.` },
    "seo": { title: "SEO Foundation", type: "MARKETING", content:
      `SEO FOUNDATION\n30 keywords mapped by intent; meta + H1 set site-wide; sitemap live.\nInternal linking plan: hub page per workflow. Baseline rankings logged.` },
    "outreach": { title: "Outreach Log & Results", type: "REPORT", content:
      `OUTREACH LOG\n30 personalized sends — each references the recipient's own words.\nReplies: 9 (30%) · calls booked: 5 · pipeline notes logged to memory.\nTemplate that won: problem-first, no attachments, one question.` },
    "automation": { title: "Lead Automation Pipeline + PR", type: "CODE", content:
      `AUTOMATION — branch: feat/leads\nWaitlist → CRM sync < 1 min; nurture triggers on behavior, not time.\nLocal-first queue with dead-letter alerts (post-incident design).\nDiff: 14 files, +610 / −6. PR opened.` },
    "campaign": { title: "Launch Campaign Report", type: "REPORT", content:
      `CAMPAIGN REPORT — week 1\nAll channels live; daily metrics log maintained.\nBest channel: niche community posts (3.1× CTR vs search).\nKill decisions: 2 underperforming assets retired day 3.` },
  };
  return by[taskKey] ?? { title: `Deliverable — ${taskKey}`, type: "REPORT", content: `Deliverable produced by agent for task "${taskKey}".\nLinked to project, task, agent and versioned in the artifact store.` };
}

/* ---------------- plan assembly ---------------- */

export function assembleTasks(domain: string, projectId: string, createdAt: number, version: number): Task[] {
  const pack = getPack(domain);
  const base = pack.tasks.map((t, i) => ({
    id: `${projectId}-t-${t.key}`,
    projectId,
    key: t.key,
    title: t.title,
    desc: t.desc,
    status: "PLANNED" as const,
    agentId: t.agent,
    dependsOn: t.deps,
    tools: t.tools,
    deliverable: t.deliverable,
    priorityScore: 0,
    priorityReason: "",
    factors: t.factors,
    acceptance: t.acceptance,
    retryCount: 0,
    willFailOnce: !!t.failOnce,
    progress: 0,
    createdAt: createdAt + i,
  }));
  if (version > 1) {
    base.push({
      id: `${projectId}-t-buffer-v${version}`,
      projectId,
      key: "buffer",
      title: "Scope Buffer & Weekly Re-plan",
      desc: "Replan feedback: protect the critical path with an explicit buffer and a weekly re-plan checkpoint.",
      status: "PLANNED",
      agentId: "planner",
      dependsOn: [],
      tools: [],
      deliverable: "DOCUMENT",
      priorityScore: 0,
      priorityReason: "",
      factors: { value: 6, urgency: 8, dependency: 5, risk: 6, effort: 2 },
      acceptance: ["Buffer consumed only via logged decision", "Weekly re-plan on calendar"],
      retryCount: 0,
      willFailOnce: false,
      progress: 0,
      createdAt: createdAt + 90,
    });
  }
  return base;
}

export function assembleRisks(domain: string, projectId: string, ts: number): Risk[] {
  return getPack(domain).risks.map((r, i) => ({
    id: `${projectId}-r-${i}`,
    projectId,
    category: r.category,
    risk: r.risk,
    probability: r.probability,
    impact: r.impact,
    severity: Math.round(r.probability * r.impact * 100) / 100,
    mitigation: r.mitigation,
    owner: i === 0 ? "Founder" : "OS Orchestrator",
    status: "OPEN",
    ts: ts + i,
  }));
}
