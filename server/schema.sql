-- --------------------------------------------------------------------
-- Founder OS — PostgreSQL schema (production blueprint)
-- UUID primary keys, organization isolation, indexed hot paths.
-- The browser demo persists the same domain model to localStorage.
-- --------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  pass_hash   TEXT NOT NULL,               -- bcrypt; never store raw secrets
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE org_members (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER','VIEWER')),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name            TEXT NOT NULL,
  phase           TEXT NOT NULL DEFAULT 'PLANNING',
  plan_version    INT  NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_org ON projects (organization_id, created_at DESC);

CREATE TABLE goals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  success_criteria JSONB NOT NULL DEFAULT '[]',   -- founder-defined; never invented
  constraints      JSONB NOT NULL DEFAULT '[]',
  budget           TEXT,
  deadline         TEXT,
  status           TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_project ON goals (project_id, status);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'PLANNED',
  agent_id        TEXT NOT NULL,
  priority_score  INT  NOT NULL DEFAULT 0,   -- deterministic, inspectable
  priority_reason TEXT NOT NULL DEFAULT '',
  retry_count     INT  NOT NULL DEFAULT 0,
  progress        INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  UNIQUE (project_id, key)
);
CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);

CREATE TABLE task_dependencies (
  task_id       UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id)
);

CREATE TABLE agent_runs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID REFERENCES projects(id),
  task_id        UUID REFERENCES tasks(id),
  agent_id       TEXT NOT NULL,
  status         TEXT NOT NULL,
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  tokens         INT  NOT NULL DEFAULT 0,
  latency_ms     INT  NOT NULL DEFAULT 0,
  cost_usd       NUMERIC(10,6) NOT NULL DEFAULT 0,
  result         JSONB,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ
);
CREATE INDEX idx_runs_project ON agent_runs (project_id, started_at DESC);

CREATE TABLE artifacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  task_id    UUID REFERENCES tasks(id),
  agent_id   TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  version    INT  NOT NULL DEFAULT 1,        -- versioning is mandatory
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_artifacts_project ON artifacts (project_id, created_at DESC);

CREATE TABLE memories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  type       TEXT NOT NULL CHECK (type IN ('WORKING','EPISODIC','SEMANTIC','PREFERENCE','PROCEDURAL')),
  content    TEXT NOT NULL,
  source     TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.8,
  importance INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memories_project_type ON memories (project_id, type);

CREATE TABLE risks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES projects(id),
  category    TEXT NOT NULL,
  risk        TEXT NOT NULL,
  probability NUMERIC(3,2) NOT NULL,
  impact      NUMERIC(3,2) NOT NULL,
  severity    NUMERIC(3,2) GENERATED ALWAYS AS (probability * impact) STORED,
  mitigation  TEXT NOT NULL DEFAULT '',
  owner       TEXT NOT NULL DEFAULT 'founder',
  status      TEXT NOT NULL DEFAULT 'OPEN',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_risks_project ON risks (project_id, severity DESC);

CREATE TABLE approvals (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  kind       TEXT NOT NULL CHECK (kind IN ('PLAN','TOOL')),
  title      TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  task_id    UUID REFERENCES tasks(id),
  tool_id    TEXT,
  status     TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX idx_approvals_pending ON approvals (status, created_at);

CREATE TABLE tool_executions (          -- audit log: immutable
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  tool_id    TEXT NOT NULL,
  task_id    UUID REFERENCES tasks(id),
  status     TEXT NOT NULL,
  input      TEXT NOT NULL DEFAULT '',
  output     TEXT NOT NULL DEFAULT '',
  actor      TEXT NOT NULL,
  permission TEXT NOT NULL,
  decision   TEXT NOT NULL,             -- auto policy vs founder-approved
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tool_exec_project ON tool_executions (project_id, created_at DESC);

CREATE TABLE events (                   -- domain events: immutable
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_project ON events (project_id, created_at DESC);

CREATE TABLE recommendations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  text       TEXT NOT NULL,
  source     TEXT NOT NULL,
  agent_id   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'SUGGESTED',
  task_id    UUID REFERENCES tasks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
