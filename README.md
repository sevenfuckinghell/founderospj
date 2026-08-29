# Founder OS — AI Operating Console

A production-grade **Founder AI Operating System**: enter a high-level business goal and the
console plans it, reviews it with an AI council, gates high-risk actions behind your approval,
executes a dependency-ordered agent workflow, measures the outcome, and stores what it learned.

Built as a fully client-side product (React + Vite + TypeScript + Tailwind CSS v4) around a
**deterministic demo engine** (`DEMO_MODE`) that implements the exact same contracts a live
LLM backend would — so the entire orchestration loop is observable, testable, and works with
zero API keys.

## Quick start

```bash
npm install
npm run dev      # local development
npm run build    # production build → dist/
```

The `dist/` folder is a fully static, deployable app (any static host / CDN / object storage).

## What you get

- **Action Engine / Orchestrator** — goal → plan → review → approval → execution → measurement → learning, with explicit state (never conversation history) and a regeneration cycle on failure that never repeats the identical action.
- **Agents** — Planner, Research, Architect, Coding, UI, Testing, Documentation, Marketing; each run records model, prompt version, tokens, latency, and cost estimate.
- **Priority Engine** — deterministic, inspectable scoring (`value × urgency × dependency × risk ÷ effort`) with a reason string on every score.
- **Risk Engine** — `severity = probability × impact`, owners, mitigations, live updates.
- **Review Council** — six evaluation passes over every plan, aggregated with consensus + critical issues (labeled as independent passes, honestly).
- **Tool Registry & Autonomy** — tools declare risk levels (READ→CRITICAL); four autonomy levels (MANUAL / ASSISTED / SUPERVISED / AUTONOMOUS) decide what auto-executes. HIGH/CRITICAL always require a human. Every execution is audit-logged with actor, permission, and decision.
- **Memory & Learning** — working / episodic / semantic / preference / procedural memory stores; lessons feed recommendations that can be queued back into the loop as real tasks.
- **Provider abstraction** — swappable model routing (OpenAI GPT-5, Anthropic Claude Opus, Google Gemini 3.7, Meta Llama, Mistral, or the demo engine) with list-price cost telemetry and a live connection test.
- **Founder Console (⌘K)** — commands invoke real system functions: pause/resume, reprioritize, risk queries, approval status, ad-hoc agent dispatch.
- **Project Result Dossier** — a full-screen window showing everything a project produced: artifacts, metrics, learnings, risks, and the event timeline.

## Architecture

```
src/
├── main.tsx / App.tsx      # entry + view routing
├── store.tsx               # state container, tick loop, localStorage persistence (versioned)
├── types.ts                # full domain model (goals, tasks, runs, artifacts, risks, …)
├── providers.ts            # AI provider/model catalog, role routing, pricing, live test
├── engine/
│   ├── orchestrator.ts     # Action Engine: reducer + planning/execution/measurement loops
│   ├── planner.ts          # domain packs, task DAGs, risks, pipeline scripts, artifact content
│   └── engines.ts          # priority, risk, council, memory, reasoning, recommendations
├── data/registry.ts        # agent registry, tool registry, autonomy policy, reviewers
└── components/             # dashboard, command center, workflow DAG, governance, dossiers…
```

Design principle: **the application owns state, permissions, tasks, memory, and execution.
The LLM is a swappable reasoning component.** Deterministic software handles deterministic
work; AI handles reasoning, planning, and generation.

## Configuration

See `.env.example`. In demo mode no keys are needed. Provider keys entered in
**Settings → AI Providers & Models** are stored in the browser for the demo; in a hosted
deployment they belong server-side (the provider contract — `generate / generate_structured /
stream / embed` — is designed for exactly that swap).

## Security model

- High-risk tools can never bypass approval, at any autonomy level.
- All tool executions pass through the controlled tool layer and are audit-logged.
- Learnings influence future plans via structured memory only — the system never rewrites its own prompts or code.
- Events are immutable; state is versioned and recoverable (Settings → reset).

## License

MIT — use it, fork it, ship it.
