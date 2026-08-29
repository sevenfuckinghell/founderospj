/* ------------------------------------------------------------------ */
/* Founder OS — master implementation backlog                          */
/* 56 system epics · ~650 items · honest status derivation:            */
/*   s = shipped (running in this console now)                         */
/*   p = partial (some capability live)                                */
/*   b = blueprint (production code in server/ + docker-compose)       */
/*   — = planned                                                       */
/* ------------------------------------------------------------------ */

export type ItemStatus = "s" | "p" | "b" | "x";

export interface BacklogItem { label: string; status: ItemStatus }
export interface BacklogSystem {
  num: number;
  id: string;
  name: string;
  icon: string;
  items: BacklogItem[];
}

const it = (label: string, status: ItemStatus = "x"): BacklogItem => ({ label, status });

export const BACKLOG: BacklogSystem[] = [
  { num: 1, id: "core", name: "Core Founder OS", icon: "grid", items: [
    it("Company / workspace creation", "s"), it("Multiple companies / workspaces", "s"),
    it("Company profile", "p"), it("Founder profile", "p"),
    it("Company mission"), it("Vision"), it("Values"),
    it("Business model", "p"), it("ICP", "p"), it("Products", "p"), it("Markets", "p"),
    it("Competitors", "p"), it("Company stage"),
    it("Current objectives", "s"), it("Strategic priorities", "s"),
    it("Company health score", "p"), it("Founder priorities", "p"), it("Operating cadence"),
    it("Company-wide context", "s"), it("Global OS state", "s"),
    it("Founder command center", "s"), it("Founder Inbox", "p"),
    it("Daily Founder Brief"), it("Weekly Founder Review"), it("Monthly Company Review"),
    it("“What changed?” view", "p"), it("“What needs my attention?” view", "s"), it("“Why did the OS do this?” view", "s"),
  ]},
  { num: 2, id: "tenancy", name: "Multi-Tenant Architecture", icon: "layers", items: [
    it("Organizations", "s"), it("Workspaces", "s"), it("Teams", "s"), it("Projects", "s"), it("Users", "s"),
    it("Organization membership", "s"), it("Workspace membership", "p"), it("Invitations"),
    it("Workspace switching", "s"), it("Organization switching", "p"),
    it("Tenant isolation", "s"), it("Workspace isolation", "s"), it("Data ownership", "p"),
    it("Workspace deletion"), it("Organization deletion"),
    it("Export workspace", "p"), it("Import workspace"), it("Workspace backup", "p"),
    it("Role: Owner", "s"), it("Role: Admin", "s"), it("Role: Founder"), it("Role: Operator"),
    it("Role: Member", "s"), it("Role: Viewer", "s"), it("Role: Auditor"),
  ]},
  { num: 3, id: "auth", name: "Authentication & Security", icon: "shield", items: [
    it("Email / password authentication"), it("Google OAuth"), it("GitHub OAuth"), it("Microsoft OAuth"),
    it("Magic links"), it("Email verification"), it("Password reset"),
    it("Session management", "p"), it("Device / session management"), it("Logout all devices"),
    it("MFA"), it("Passkeys"),
    it("RBAC", "s"), it("Permission system", "s"), it("API keys", "s"),
    it("Personal access tokens"), it("Service accounts"), it("SSO"), it("SCIM"), it("IP restrictions"),
    it("Login audit trail", "p"), it("Suspicious login detection"),
  ]},
  { num: 4, id: "aisec", name: "AI Security", icon: "alert", items: [
    it("Prompt-injection detection"), it("Indirect prompt-injection detection"),
    it("Tool argument validation", "p"), it("Tool permission enforcement", "s"),
    it("Secret leakage prevention", "p"), it("PII detection"), it("Sensitive-data classification", "p"),
    it("Data-loss prevention"), it("Output validation", "s"), it("Prompt sanitization"),
    it("Untrusted-content isolation"), it("External-content sandboxing"), it("Model output moderation"),
    it("AI safety policies", "s"), it("Agent permission boundaries", "s"),
    it("Agent network restrictions", "b"), it("Agent filesystem restrictions", "b"), it("AI audit logs", "s"),
  ]},
  { num: 5, id: "agents", name: "Agent System", icon: "bot", items: [
    it("Agent registry", "s"), it("Agent versions", "s"), it("Agent configuration", "p"),
    it("Agent capabilities", "s"), it("Agent permissions", "s"), it("Agent tools", "s"),
    it("Agent memory", "s"), it("Agent model selection", "s"),
    it("Agent cost limits"), it("Agent token limits"), it("Agent runtime limits"),
    it("Agent concurrency limits", "p"), it("Agent escalation rules", "s"), it("Agent failure policies", "s"),
    it("CEO Agent"), it("Strategy Agent"), it("Product Agent"), it("Research Agent", "s"),
    it("Market Intelligence Agent", "p"), it("Customer Agent", "p"), it("Sales Agent"),
    it("Marketing Agent", "s"), it("Growth Agent"), it("Finance Agent"), it("CFO Agent"),
    it("Operations Agent"), it("Engineering Agent", "p"), it("Coding Agent", "s"),
    it("Architect Agent", "s"), it("UI/UX Agent", "s"), it("QA Agent", "s"), it("Security Agent", "p"),
    it("DevOps Agent"), it("Data Agent"), it("Legal Research Agent"),
    it("Documentation Agent", "s"), it("Recruiting Agent"), it("Customer Support Agent"),
  ]},
  { num: 6, id: "orchestration", name: "Multi-Agent Orchestration", icon: "branch", items: [
    it("Goal decomposition", "s"), it("Task decomposition", "s"), it("Dependency graph", "s"),
    it("DAG execution", "s"), it("Parallel execution", "p"), it("Sequential execution", "s"),
    it("Conditional execution", "p"), it("Dynamic task generation", "s"), it("Dynamic replanning", "s"),
    it("Failure recovery", "s"), it("Automatic retry", "s"), it("Retry policies", "s"), it("Backoff", "p"),
    it("Task timeout"), it("Agent timeout"), it("Cancellation", "p"), it("Pause / resume", "s"),
    it("Human escalation", "s"), it("Agent handoff", "p"), it("Agent collaboration", "p"),
    it("Agent debate", "p"), it("Agent voting", "p"), it("Council review", "s"), it("Consensus", "s"),
    it("Dissent tracking", "p"), it("Confidence scoring", "s"), it("Plan regeneration", "s"),
    it("Goal reprioritization", "s"), it("Critical-path detection"),
  ]},
  { num: 7, id: "pm", name: "Project Management", icon: "list", items: [
    it("Projects", "s"), it("Goals", "s"), it("Objectives", "s"), it("OKRs", "p"), it("Milestones", "s"),
    it("Tasks", "s"), it("Subtasks", "p"), it("Dependencies", "s"), it("Deadlines", "s"),
    it("Priorities", "s"), it("Labels"), it("Owners", "p"), it("Assignees", "s"), it("Status", "s"),
    it("Progress", "s"), it("Critical path"), it("Project health", "p"), it("Project timeline", "p"),
    it("Gantt view"), it("Kanban"), it("Calendar view"), it("List view", "s"), it("Graph view", "s"),
    it("Project templates", "p"), it("Recurring tasks"),
  ]},
  { num: 8, id: "strategy", name: "Strategy Engine", icon: "target", items: [
    it("Mission planning"), it("Vision planning"), it("Strategic goals", "s"), it("SWOT"),
    it("Competitive analysis", "p"), it("Market analysis", "p"), it("TAM / SAM / SOM"),
    it("Positioning", "p"), it("Moat analysis"), it("Business-model analysis", "p"),
    it("Strategic alternatives", "p"), it("Scenario planning"), it("Strategic risks", "s"),
    it("Strategic recommendations", "s"), it("Strategy simulations"), it("Goal scoring", "s"),
    it("Strategy-to-execution mapping", "s"),
  ]},
  { num: 9, id: "research", name: "Research Engine", icon: "eye", items: [
    it("Web search", "b"), it("Website extraction"), it("Document ingestion"), it("PDF analysis"),
    it("Research workspace", "p"), it("Source management", "p"), it("Source ranking"),
    it("Source credibility scoring"), it("Source freshness"), it("Citation tracking"),
    it("Claim extraction", "p"), it("Evidence extraction", "p"), it("Contradiction detection"),
    it("Fact verification", "p"), it("Research synthesis", "s"), it("Competitive intelligence", "p"),
    it("Market intelligence", "p"), it("Customer research", "p"), it("Trend detection"),
    it("Research memory", "s"), it("Automated research reports", "s"),
  ]},
  { num: 10, id: "memory", name: "Company Memory", icon: "brain", items: [
    it("Working memory", "s"), it("Episodic memory", "s"), it("Semantic memory", "s"),
    it("Procedural memory", "s"), it("Organizational memory", "p"), it("Founder memory", "p"),
    it("Customer memory"), it("Product memory"), it("Market memory"), it("Engineering memory"),
    it("Financial memory"), it("Decision memory", "p"), it("Knowledge graph", "s"),
    it("Vector search"), it("Hybrid search"),
    it("Memory importance", "s"), it("Memory confidence", "s"), it("Memory freshness"),
    it("Memory expiration"), it("Memory consolidation"), it("Duplicate memory detection", "p"),
    it("Memory correction"), it("Memory provenance", "s"),
  ]},
  { num: 11, id: "decisions", name: "Decision Intelligence", icon: "scales", items: [
    it("Decision creation", "s"), it("Decision history", "s"), it("Decision alternatives", "p"),
    it("Decision rationale", "s"), it("Supporting evidence", "s"), it("Confidence", "s"),
    it("Decision owner", "p"), it("Decision deadline"), it("Reversible / irreversible classification"),
    it("Decision consequences"), it("Decision review", "p"), it("Decision reversal"),
    it("Decision effectiveness"), it("Decision memory", "p"), it("Similar historical decisions"),
    it("AI decision recommendation", "s"),
  ]},
  { num: 12, id: "experiments", name: "Experiment Engine", icon: "zap", items: [
    it("Hypotheses"), it("Experiments", "p"), it("Experiment design"), it("Control groups"),
    it("Variants"), it("Metrics", "p"), it("Experiment status"), it("Statistical analysis"),
    it("Results", "p"), it("Automated conclusions"), it("Experiment memory"),
    it("Experiment recommendations", "p"), it("A/B testing"), it("Growth experiments", "p"),
    it("Product experiments"), it("Pricing experiments"), it("Marketing experiments", "p"),
  ]},
  { num: 13, id: "analytics", name: "Analytics & Metrics", icon: "chart", items: [
    it("Custom KPIs"), it("KPI dashboards", "s"), it("Real-time metrics", "s"), it("Historical metrics", "s"),
    it("Metric definitions", "p"), it("Targets"), it("Benchmarks"), it("Alerts", "p"),
    it("Anomaly detection"), it("Forecasting"), it("Trend detection", "p"), it("Metric correlations"),
    it("Metric attribution"), it("Goal → KPI mapping", "s"),
  ]},
  { num: 14, id: "cfo", name: "CFO / Finance System", icon: "pulse", items: [
    it("Revenue"), it("MRR"), it("ARR"), it("Burn"), it("Runway"), it("Gross margin"), it("Net margin"),
    it("CAC"), it("LTV"), it("ARPU"), it("Churn"), it("Cash balance"), it("Expenses"),
    it("Budget", "p"), it("Forecast"), it("Scenario modeling"), it("Hiring impact"), it("Pricing impact"),
    it("Revenue forecasting"), it("Cash forecasting"), it("Financial alerts"), it("AI CFO recommendations"),
  ]},
  { num: 15, id: "aicost", name: "AI Cost Management", icon: "zap", items: [
    it("Token tracking", "s"), it("Model cost tracking", "s"), it("Provider cost tracking", "p"),
    it("Agent cost", "s"), it("Task cost", "p"), it("Project cost", "s"), it("Workspace cost"),
    it("Monthly budget"), it("Daily budget"), it("Cost forecasts"), it("Cost alerts"), it("Cost limits"),
    it("Cost optimization"), it("Model auto-selection", "p"), it("Model downgrade"),
    it("Provider fallback"), it("Cost-per-outcome", "p"), it("AI ROI", "p"),
  ]},
  { num: 16, id: "gateway", name: "AI Gateway", icon: "branch", items: [
    it("Provider abstraction", "s"), it("OpenAI", "s"), it("Anthropic", "s"), it("Google", "s"),
    it("Open-source models", "p"), it("Local models"), it("Model registry", "s"), it("Model routing", "s"),
    it("Model fallback"), it("Model health", "p"), it("Model latency", "s"), it("Model cost", "s"),
    it("Model quality"), it("Automatic model selection", "p"), it("Context management", "s"),
    it("Token budgeting"), it("Structured outputs", "s"), it("Streaming"), it("Retry"),
    it("Rate limiting"), it("Circuit breakers"),
  ]},
  { num: 17, id: "prompts", name: "Prompt Engineering System", icon: "book", items: [
    it("Prompt registry"), it("Prompt versions", "s"), it("Prompt templates", "p"), it("Prompt variables"),
    it("Prompt testing"), it("Prompt evaluation"), it("Prompt A/B testing"), it("Prompt rollback"),
    it("Prompt changelog"), it("Prompt ownership", "p"), it("Prompt performance analytics", "p"),
  ]},
  { num: 18, id: "tools", name: "Tool System", icon: "gear", items: [
    it("Tool registry", "s"), it("Tool versioning"), it("Tool schemas", "p"), it("Tool permissions", "s"),
    it("Tool risk scoring", "s"), it("Tool execution", "s"), it("Tool dry-run"), it("Tool rollback"),
    it("Tool retries", "p"), it("Tool timeout"), it("Tool rate limits"), it("Tool audit trail", "s"),
    it("Tool sandbox"),
  ]},
  { num: 19, id: "integrations", name: "Integrations", icon: "send", items: [
    it("GitHub", "p"), it("GitLab"), it("Bitbucket"), it("Vercel"), it("AWS"), it("GCP"), it("Azure"),
    it("Notion"), it("Linear"), it("Jira"), it("Trello"), it("Asana"),
    it("Slack"), it("Discord"), it("Teams"),
    it("Gmail", "p"), it("Google Calendar", "p"), it("Google Drive"), it("Google Sheets"), it("Google Docs", "p"),
    it("Outlook"), it("Outlook Calendar"), it("OneDrive"), it("Microsoft Teams"),
    it("HubSpot"), it("Salesforce"), it("Pipedrive"),
    it("PostHog"), it("GA4"), it("Mixpanel"), it("Stripe"), it("QuickBooks"),
  ]},
  { num: 20, id: "credentials", name: "Credential Management", icon: "shield", items: [
    it("OAuth"), it("API keys", "s"), it("Access tokens"), it("Refresh tokens"), it("Token encryption"),
    it("Secret vault", "p"), it("Secret rotation"), it("Secret expiration"), it("Secret revocation", "p"),
    it("OAuth scope management"), it("Credential health checks", "p"), it("Credential access audit", "p"),
  ]},
  { num: 21, id: "coding", name: "Coding Agent", icon: "terminal", items: [
    it("Repository connection", "p"), it("Repository indexing"), it("Codebase understanding"),
    it("Issue creation"), it("Branch creation", "p"), it("Code modification", "p"), it("Commit creation"),
    it("PR creation", "p"), it("PR review"), it("Test generation", "p"), it("Bug fixing"),
    it("Dependency updates"), it("Refactoring"), it("Migration generation"),
    it("Documentation generation", "s"), it("Security scanning"), it("Build validation"),
    it("Deployment", "p"), it("Rollback"),
  ]},
  { num: 22, id: "sandbox", name: "Agent Sandbox", icon: "box", items: [
    it("Ephemeral environments"), it("Filesystem isolation"), it("Network isolation"),
    it("CPU limits"), it("Memory limits"), it("Runtime limits"), it("Package restrictions"),
    it("Secret isolation", "p"), it("Command allowlist", "p"), it("Artifact extraction", "s"),
    it("Environment destruction"), it("Sandbox snapshots"),
  ]},
  { num: 23, id: "devops", name: "DevOps", icon: "refresh", items: [
    it("CI/CD"), it("Preview deployments"), it("Staging", "p"), it("Production", "p"),
    it("Deployment approval", "s"), it("Health checks"), it("Canary releases"), it("Blue/green deployments"),
    it("Rollbacks"), it("Database migrations", "b"), it("Environment management", "b"),
    it("Infrastructure-as-code", "b"), it("Deployment logs", "p"), it("Deployment history", "p"),
  ]},
  { num: 24, id: "artifacts", name: "Artifact System", icon: "box", items: [
    it("Documents", "s"), it("Code", "s"), it("Reports", "s"), it("Designs", "s"), it("Research", "s"),
    it("Marketing assets", "s"), it("Data", "s"), it("Presentations"), it("Spreadsheets"),
    it("Artifact versions", "s"), it("Artifact diff"), it("Artifact provenance", "s"),
    it("Artifact approval", "p"), it("Artifact lineage", "s"), it("Artifact storage", "s"), it("Artifact search"),
  ]},
  { num: 25, id: "approvals", name: "Approval System", icon: "check", items: [
    it("Approval inbox", "s"), it("Approval policies", "s"), it("Risk-based approval", "s"),
    it("Human approval", "s"), it("Multi-person approval"), it("Approval delegation"),
    it("Approval expiration"), it("Approval history", "s"), it("Reject", "s"), it("Approve", "s"),
    it("Request changes", "p"), it("Escalate", "s"), it("Emergency override"),
  ]},
  { num: 26, id: "risk", name: "Risk Engine", icon: "flame", items: [
    it("Risk identification", "s"), it("Risk scoring", "s"), it("Probability", "s"), it("Impact", "s"),
    it("Exposure", "s"), it("Risk owner", "s"), it("Mitigation", "s"), it("Risk monitoring", "p"),
    it("Risk alerts", "s"), it("Risk trends"), it("Automated risk detection", "p"),
    it("Security risks", "s"), it("Financial risks", "p"), it("Product risks", "s"), it("Market risks", "s"),
    it("Technical risks", "s"), it("Operational risks", "p"), it("Regulatory risks", "s"),
  ]},
  { num: 27, id: "incidents", name: "Incident Management", icon: "alert", items: [
    it("Incident detection", "p"), it("Severity levels", "p"), it("Incident creation", "p"),
    it("Incident timeline", "p"), it("Incident commander"), it("Agent assignment"),
    it("Automatic diagnosis", "s"), it("Log collection", "p"), it("Root-cause analysis", "s"),
    it("Rollback"), it("Founder notification", "s"), it("Postmortem", "p"),
    it("Corrective actions", "s"), it("Incident memory", "s"),
  ]},
  { num: 28, id: "observability", name: "Observability", icon: "eye", items: [
    it("Structured logs", "s"), it("Metrics", "s"), it("Distributed tracing"), it("Agent traces", "s"),
    it("Task traces", "s"), it("Tool traces", "s"), it("AI request traces", "p"), it("Database monitoring"),
    it("Queue monitoring"), it("Worker monitoring"), it("Provider monitoring", "p"),
    it("Error tracking", "p"), it("Performance monitoring", "p"), it("Alerts", "p"), it("SLOs"), it("SLIs"),
  ]},
  { num: 29, id: "audit", name: "Audit System", icon: "book", items: [
    it("Login"), it("Logout"), it("Permission changes", "p"), it("Agent execution", "s"),
    it("Tool execution", "s"), it("Data access"), it("Data modification", "p"), it("Approval", "s"),
    it("Rejection", "s"), it("Deployment", "p"), it("Secret access", "p"), it("Model calls", "s"),
    it("Configuration changes", "s"), it("Policy changes", "s"),
  ]},
  { num: 30, id: "events", name: "Event System", icon: "zap", items: [
    it("Domain events", "s"), it("Event bus", "s"), it("Event versioning"), it("Event replay"),
    it("Event history", "s"), it("Event subscriptions"), it("Webhooks"), it("Webhook retries"),
    it("Webhook signatures"), it("Event deduplication", "p"), it("Idempotency"),
  ]},
  { num: 31, id: "workers", name: "Production Worker System", icon: "gear", items: [
    it("Job queue", "b"), it("Worker pool", "b"), it("Job leasing"), it("Job heartbeat"),
    it("Retry", "b"), it("Backoff", "b"), it("Dead-letter queue", "b"), it("Job cancellation"),
    it("Job priority"), it("Concurrency control"), it("Scheduled jobs"), it("Recurring jobs"),
    it("Worker autoscaling"), it("Worker health monitoring"),
  ]},
  { num: 32, id: "database", name: "Database", icon: "layers", items: [
    it("PostgreSQL", "b"), it("Proper relational schema", "b"), it("Database migrations", "b"),
    it("Indexes", "b"), it("Foreign keys", "b"), it("Row-level security"), it("Transactions"),
    it("Optimistic locking"), it("Connection pooling"), it("Backups", "p"),
    it("Point-in-time recovery"), it("Restore testing"), it("Data retention"), it("Data deletion"),
  ]},
  { num: 33, id: "search", name: "Search", icon: "eye", items: [
    it("Global search"), it("Project search", "p"), it("Task search"), it("Artifact search"),
    it("Agent search"), it("Memory search"), it("Decision search"), it("Research search"),
    it("Semantic search"), it("Keyword search"), it("Hybrid search"), it("Filters", "p"), it("Search ranking"),
  ]},
  { num: 34, id: "notifications", name: "Notifications", icon: "chat", items: [
    it("In-app notifications", "s"), it("Email"), it("Slack"), it("Push notifications"),
    it("Browser notifications"), it("Approval notifications", "s"), it("Failure notifications", "s"),
    it("Risk notifications", "p"), it("Budget alerts"), it("Deployment alerts"), it("Incident alerts", "p"),
    it("Daily digest"), it("Weekly digest"), it("Notification preferences"),
  ]},
  { num: 35, id: "interface", name: "Founder ↔ OS Interface", icon: "terminal", items: [
    it("Natural-language command bar", "s"), it("Chat with OS", "s"), it("Voice input"), it("Voice output"),
    it("Context-aware conversations", "p"), it("Conversation memory", "p"), it("Commands", "s"),
    it("Slash commands"), it("Quick actions", "p"), it("Agent mentions"), it("Project mentions"),
    it("Task mentions"), it("Artifact mentions"), it("Decision queries", "p"), it("Company-wide questions", "p"),
  ]},
  { num: 36, id: "mobile", name: "Mobile", icon: "grid", items: [
    it("Responsive UI", "p"), it("Mobile dashboard", "p"), it("Mobile approvals", "p"),
    it("Push notifications"), it("Mobile Founder Inbox"), it("Voice commands"),
    it("Emergency actions"), it("Incident alerts"),
  ]},
  { num: 37, id: "execdash", name: "Executive Dashboard", icon: "pulse", items: [
    it("Company health panel", "p"), it("Revenue"), it("Growth"), it("Cash"), it("Runway"),
    it("Customers"), it("Pipeline"), it("Product", "p"), it("Engineering", "p"), it("Marketing", "p"),
    it("Risk", "s"), it("“Needs you” queue", "s"), it("Approvals surface", "s"), it("Decisions surface", "p"),
    it("Incidents surface", "p"), it("Blocked tasks surface", "s"), it("Agents active", "s"),
    it("Tasks in flight", "s"), it("Projects rollup", "s"), it("AI spend rollup", "s"),
  ]},
  { num: 38, id: "sales", name: "Sales System", icon: "send", items: [
    it("CRM"), it("Leads", "p"), it("Accounts"), it("Contacts"), it("Opportunities"), it("Pipeline", "p"),
    it("Lead scoring"), it("Lead enrichment"), it("Outreach", "p"), it("Follow-ups"),
    it("Meeting preparation"), it("Sales forecasting"), it("Lost-deal analysis"),
    it("Customer intelligence"), it("Automated CRM updates"),
  ]},
  { num: 39, id: "marketing", name: "Marketing System", icon: "send", items: [
    it("ICP", "p"), it("Positioning", "s"), it("Content strategy", "s"), it("Content generation", "s"),
    it("Content calendar"), it("SEO", "p"), it("Social media"), it("Email marketing", "p"),
    it("Campaign management", "p"), it("Ad experiments"), it("Landing pages", "p"),
    it("Conversion optimization"), it("Attribution"), it("Growth analytics", "p"),
    it("Automated campaign analysis", "p"),
  ]},
  { num: 40, id: "customers", name: "Customer Intelligence", icon: "chat", items: [
    it("Customer profiles"), it("Customer history"), it("Customer health"), it("Support tickets"),
    it("Feedback"), it("Feature requests"), it("Sentiment"), it("Churn prediction"),
    it("Expansion opportunities"), it("Customer interviews", "p"), it("Customer segmentation"),
    it("Voice-of-customer memory", "p"),
  ]},
  { num: 41, id: "hiring", name: "Hiring / People", icon: "folder", items: [
    it("Hiring plans"), it("Job descriptions"), it("Candidate tracking"), it("Candidate scoring"),
    it("Interview preparation"), it("Interview notes"), it("Hiring pipeline"), it("Workforce planning"),
    it("Compensation modeling"), it("Onboarding"), it("Team capacity"), it("Skills matrix"),
  ]},
  { num: 42, id: "knowledge", name: "Knowledge / Documentation", icon: "book", items: [
    it("Company wiki"), it("SOPs"), it("Runbooks"), it("Architecture docs", "s"), it("Product docs", "s"),
    it("Decision records", "s"), it("Meeting notes"), it("Research reports", "s"), it("Knowledge graph", "s"),
    it("Automatic documentation", "s"), it("Documentation freshness"), it("Broken-document detection"),
  ]},
  { num: 43, id: "calendar", name: "Calendar / Meetings", icon: "clock", items: [
    it("Calendar integration", "p"), it("Meeting preparation"), it("Agenda generation"), it("Meeting notes"),
    it("Action-item extraction"), it("Task creation"), it("Decision extraction"), it("Follow-up generation"),
    it("Meeting intelligence"), it("Founder schedule optimization"),
  ]},
  { num: 44, id: "eval", name: "AI Evaluation", icon: "scales", items: [
    it("Evaluation datasets"), it("Golden answers"), it("Agent benchmarks"), it("Planner benchmarks"),
    it("Tool-selection benchmarks"), it("Safety benchmarks"), it("Hallucination tests"),
    it("Prompt regression tests"), it("Model comparison", "p"), it("Cost evaluation", "s"),
    it("Latency evaluation", "s"), it("Quality scoring", "p"), it("Human evaluation", "p"),
    it("Automated evaluation", "p"), it("Evaluation history", "p"),
  ]},
  { num: 45, id: "learning", name: "Learning Engine", icon: "refresh", items: [
    it("Outcome tracking", "s"), it("Success / failure classification", "s"), it("Root-cause analysis", "s"),
    it("Learning extraction", "s"), it("Learning confidence", "s"), it("Learning applicability", "s"),
    it("Learning expiration"), it("Learning retrieval", "s"), it("Strategy adaptation", "s"),
    it("Agent adaptation"), it("Recommendation adaptation", "s"),
  ]},
  { num: 46, id: "forecasting", name: "Forecasting", icon: "chart", items: [
    it("Revenue forecasting"), it("Runway forecasting"), it("Project completion forecasting", "p"),
    it("Hiring forecasting"), it("Customer growth forecasting"), it("Churn forecasting"),
    it("Lead forecasting"), it("Infrastructure forecasting"), it("AI cost forecasting", "p"),
    it("Risk forecasting", "p"), it("Scenario simulation"),
  ]},
  { num: 47, id: "simulation", name: "Simulation Mode", icon: "radar", items: [
    it("Dry run"), it("Cost estimate", "s"), it("Time estimate", "p"), it("Risk estimate", "s"),
    it("Dependency analysis", "s"), it("Expected outcome", "p"), it("Failure scenarios", "p"),
    it("Alternative plans", "s"), it("Rollback simulation"), it("“What if?” analysis"),
  ]},
  { num: 48, id: "autonomy", name: "Autonomous Mode", icon: "shield", items: [
    it("MANUAL level", "s"), it("ASSISTED level", "s"), it("SUPERVISED level", "s"), it("AUTONOMOUS level", "s"),
    it("Policy-based autonomy (never a single switch)", "s"), it("Agent autonomy limits", "p"),
    it("Time limits"), it("Cost limits"), it("Action limits", "s"), it("Data limits"), it("Tool limits", "s"),
    it("Automatic escalation", "s"), it("Automatic rollback"), it("Autonomous planning", "s"),
    it("Autonomous execution", "s"), it("Autonomous monitoring", "p"),
  ]},
  { num: 49, id: "twin", name: "Company Digital Twin", icon: "brain", items: [
    it("Strategy representation"), it("Products representation"), it("Customers representation"),
    it("Revenue representation"), it("Team representation"), it("Projects representation"),
    it("Technology representation"), it("Marketing representation"), it("Sales representation"),
    it("Finance representation"), it("Risks representation"), it("Decisions representation"),
    it("Experiments representation"), it("“Simulate hiring five engineers”"),
    it("“What if price +20%?”"), it("“What if conversion −30%?”"), it("“Which project should we stop?”"),
  ]},
  { num: 50, id: "benchmarks", name: "Benchmarking", icon: "chart", items: [
    it("Company benchmarks"), it("Industry benchmarks"), it("Historical benchmarks"),
    it("Team productivity benchmarks"), it("AI efficiency benchmarks"), it("Marketing benchmarks"),
    it("Sales benchmarks"), it("Financial benchmarks"), it("Project benchmarks"),
  ]},
  { num: 51, id: "billing", name: "Billing", icon: "pulse", items: [
    it("Free plan", "p"), it("Pro"), it("Team"), it("Enterprise"), it("Usage billing", "p"),
    it("AI usage billing", "p"), it("Seat billing", "p"), it("Tool usage billing"), it("Credit system"),
    it("Usage limits"), it("Invoice history"), it("Payment methods"), it("Subscription management"),
    it("Cancellation"), it("Upgrade / downgrade"),
  ]},
  { num: 52, id: "enterprise", name: "Enterprise", icon: "shield", items: [
    it("SSO"), it("SAML"), it("SCIM"), it("Enterprise RBAC", "p"), it("Audit exports", "p"),
    it("Data residency"), it("Retention policies"), it("Custom policies", "p"), it("Custom models", "p"),
    it("Private deployment", "b"), it("VPC deployment"), it("Dedicated workers", "b"),
    it("Dedicated database", "b"), it("Enterprise support"),
  ]},
  { num: 53, id: "quality", name: "Production Quality", icon: "check", items: [
    it("Unit tests"), it("Integration tests"), it("API tests"), it("Database tests"),
    it("Agent tests", "p"), it("Tool tests"), it("Policy tests"), it("Security tests"),
    it("E2E tests"), it("Load tests"), it("Stress tests"), it("Chaos testing"),
    it("Regression testing", "p"), it("AI evaluation", "p"), it("Browser testing", "p"),
  ]},
  { num: 54, id: "cicd", name: "CI/CD", icon: "refresh", items: [
    it("PR pipeline"), it("Typecheck", "s"), it("Lint"), it("Unit tests"), it("Integration tests"),
    it("Security scan"), it("AI evaluations"), it("Build", "s"), it("E2E"), it("Preview deployment"),
    it("main → staging → production"), it("Production approval gate", "s"),
  ]},
  { num: 55, id: "devplatform", name: "Developer Platform", icon: "terminal", items: [
    it("REST API", "b"), it("TypeScript SDK"), it("Python SDK"), it("Webhooks"), it("API documentation", "b"),
    it("API versioning", "b"), it("OAuth apps"), it("Developer portal"), it("MCP support"),
    it("Custom agents"), it("Custom tools"), it("Custom workflows"),
  ]},
  { num: 56, id: "marketplace", name: "Founder OS Marketplace", icon: "box", items: [
    it("Agent marketplace"), it("Tool marketplace"), it("Workflow marketplace"),
    it("Industry playbooks"), it("Prompt marketplace"), it("Templates"), it("Community agents"),
    it("Community workflows"), it("Verified agents"), it("Agent ratings"), it("Agent versioning"),
  ]},
];

/* ---------------- priority lanes (§57) ---------------- */

export interface PriorityItem { label: string; status: ItemStatus; note: string }

export const P0_LANE: PriorityItem[] = [
  { label: "PostgreSQL + proper persistence", status: "b", note: "schema.sql + compose" },
  { label: "Authentication + RBAC", status: "p", note: "roles live, auth not yet" },
  { label: "Multi-tenancy", status: "p", note: "org → ws → projects shipped" },
  { label: "Server-side API", status: "b", note: "FastAPI control plane" },
  { label: "Durable job queue + workers", status: "b", note: "Redis worker + DLQ" },
  { label: "Real orchestrator", status: "s", note: "Action Engine in console" },
  { label: "Tool Gateway", status: "s", note: "risk-classed, permission-checked" },
  { label: "Policy / permission engine", status: "s", note: "autonomy matrix" },
  { label: "Secret / OAuth management", status: "p", note: "keys masked; vault pending" },
  { label: "Audit / event system", status: "s", note: "immutable domain events" },
];

export const P1_LANE: PriorityItem[] = [
  { label: "AI Gateway + model routing", status: "s", note: "16 models, role routing" },
  { label: "Structured outputs + validation", status: "p", note: "contracts live, schemas pending" },
  { label: "Agent sandbox", status: "x", note: "ephemeral envs" },
  { label: "AI evaluation system", status: "p", note: "cost + latency tracked" },
  { label: "Observability / tracing", status: "p", note: "agent + tool traces live" },
];

export const P2_PIPELINE: PriorityItem[] = [
  { label: "Founder Inbox", status: "p", note: "" },
  { label: "Decision Memory", status: "p", note: "" },
  { label: "Company Memory", status: "s", note: "" },
  { label: "Daily Brief", status: "x", note: "" },
  { label: "Experiments", status: "p", note: "" },
  { label: "CFO", status: "x", note: "" },
  { label: "Strategy Engine", status: "p", note: "" },
  { label: "Digital Twin", status: "x", note: "" },
  { label: "Autonomous Company", status: "p", note: "" },
];

/* ---------------- derivation helpers ---------------- */

export interface Coverage { total: number; s: number; p: number; b: number; x: number; pct: number }

export function coverageOf(items: { status: ItemStatus }[]): Coverage {
  const total = items.length;
  const s = items.filter((i) => i.status === "s").length;
  const p = items.filter((i) => i.status === "p").length;
  const b = items.filter((i) => i.status === "b").length;
  const x = total - s - p - b;
  /* shipped counts 1, partial 0.5, blueprint 0.35 */
  const pct = total === 0 ? 0 : Math.round(((s + p * 0.5 + b * 0.35) / total) * 100);
  return { total, s, p, b, x, pct };
}

export function overallStats(): Coverage & { systems: number } {
  const all = BACKLOG.flatMap((sys) => sys.items);
  return { ...coverageOf(all), systems: BACKLOG.length };
}

export const STATUS_META: Record<ItemStatus, { label: string; full: string; fg: string; bg: string }> = {
  s: { label: "SHIPPED", full: "running in this console now", fg: "text-mint", bg: "bg-mint/10 border-mint/35" },
  p: { label: "PARTIAL", full: "some capability live", fg: "text-cy", bg: "bg-cy/10 border-cy/30" },
  b: { label: "BLUEPRINT", full: "production code in server/ + compose", fg: "text-amber", bg: "bg-amber/10 border-amber/35" },
  x: { label: "PLANNED", full: "future epic work", fg: "text-mut", bg: "bg-mut/10 border-line" },
};

export function toGitHubMarkdown(): string {
  const o = overallStats();
  const lines: string[] = [];
  lines.push("# Founder OS — Master Implementation Backlog");
  lines.push("");
  lines.push(`> ${o.systems} system epics · ${o.total} items · coverage ${o.pct}% `);
  lines.push(`> shipped ${o.s} · partial ${o.p} · blueprint ${o.b} · planned ${o.x}`);
  lines.push("");
  lines.push("Status key: `[x]` shipped in the live console · `~` partial · `b` production blueprint in `server/` · `[ ]` planned.");
  lines.push("");
  lines.push("## Priority order");
  lines.push("");
  lines.push("**P0 — Infrastructure**");
  P0_LANE.forEach((p, i) => lines.push(`${i + 1}. ${p.label} — _${STATUS_META[p.status].label.toLowerCase()}_ (${p.note})`));
  lines.push("");
  lines.push("**P1 — AI infrastructure**");
  P1_LANE.forEach((p, i) => lines.push(`${i + 1}. ${p.label} — _${STATUS_META[p.status].label.toLowerCase()}_`));
  lines.push("");
  lines.push("**P2 — Founder intelligence pipeline**: " + P2_PIPELINE.map((p) => p.label).join(" → "));
  lines.push("");
  lines.push("---");
  lines.push("");
  for (const sys of BACKLOG) {
    const c = coverageOf(sys.items);
    lines.push(`## [EPIC-${String(sys.num).padStart(2, "0")}] ${sys.name} · ${c.pct}%`);
    lines.push("");
    for (const item of sys.items) {
      const mark = item.status === "s" ? "[x]" : item.status === "p" ? "[ ]" : "[ ]";
      const tag = item.status === "p" ? " `partial`" : item.status === "b" ? " `blueprint`" : "";
      lines.push(`- ${mark} ${item.label}${tag}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("_Exported from the Founder OS console — statuses are derived from the running build, not aspirational._");
  return lines.join("\n");
}
