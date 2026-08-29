/* ------------------------------------------------------------------ */
/* AI Provider abstraction — the LLM is a swappable reasoning          */
/* component. Providers declare models, roles, and list pricing so     */
/* routing and cost telemetry stay inspectable.                        */
/* ------------------------------------------------------------------ */

export type ModelRole = "reasoning" | "fast" | "embedding";

export interface ModelDef {
  id: string;
  name: string;
  provider: string;
  roles: ModelRole[];
  /* USD per 1M tokens [input, output]. Embeddings use input rate. */
  price: [number, number];
  contextK: number;
  blurb: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  accent: string;
  /* whether a browser-side connection test is feasible (CORS) */
  cors: boolean;
  keyHint: string;
  keyPrefix: string;
}

export const PROVIDERS: ProviderDef[] = [
  { id: "openai",    name: "OpenAI",    accent: "#7ee2a8", cors: true,  keyHint: "sk-…",            keyPrefix: "sk-" },
  { id: "anthropic", name: "Anthropic", accent: "#f2b95c", cors: true,  keyHint: "sk-ant-…",        keyPrefix: "sk-ant-" },
  { id: "google",    name: "Google",    accent: "#7cc4f2", cors: true,  keyHint: "AIza…",           keyPrefix: "AIza" },
  { id: "meta",      name: "Meta",      accent: "#7aa5f2", cors: false, keyHint: "llama-api-…",     keyPrefix: "" },
  { id: "mistral",   name: "Mistral",   accent: "#f28d6d", cors: false, keyHint: "…",               keyPrefix: "" },
  { id: "demo",      name: "Demo Engine", accent: "#45e0b0", cors: false, keyHint: "no key required", keyPrefix: "" },
];

export const MODELS: ModelDef[] = [
  /* OpenAI */
  { id: "gpt-5",            name: "GPT-5",            provider: "openai", roles: ["reasoning", "fast"], price: [1.25, 10],   contextK: 400, blurb: "Flagship generalist. Strong multi-step planning." },
  { id: "gpt-5-mini",       name: "GPT-5 mini",       provider: "openai", roles: ["fast"],              price: [0.25, 2],    contextK: 400, blurb: "Fast and cheap for high-volume agent work." },
  { id: "o3-pro",           name: "o3-pro",           provider: "openai", roles: ["reasoning"],         price: [20, 80],     contextK: 200, blurb: "Deep deliberative reasoning for hard decisions." },
  { id: "text-embed-3-lg",  name: "text-embedding-3-large", provider: "openai", roles: ["embedding"], price: [0.13, 0],   contextK: 8,   blurb: "High-recall vectors for memory retrieval." },
  /* Anthropic */
  { id: "claude-opus-4-6",  name: "Claude Opus 4.6",  provider: "anthropic", roles: ["reasoning"],     price: [15, 75],     contextK: 200, blurb: "Frontier reasoning with careful, auditable chains." },
  { id: "claude-sonnet-4-6",name: "Claude Sonnet 4.6",provider: "anthropic", roles: ["reasoning", "fast"], price: [3, 15], contextK: 200, blurb: "Balanced quality/speed for everyday agents." },
  { id: "claude-haiku-4-6", name: "Claude Haiku 4.6", provider: "anthropic", roles: ["fast"],          price: [0.8, 4],     contextK: 200, blurb: "Snappy responses for tool-heavy loops." },
  /* Google */
  { id: "gemini-3.7-pro",   name: "Gemini 3.7 Pro",   provider: "google", roles: ["reasoning", "fast"], price: [2.5, 15],  contextK: 2000, blurb: "Very long context; good for whole-repo reads." },
  { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", provider: "google", roles: ["fast"],              price: [0.35, 2.1], contextK: 1000, blurb: "Low-latency workhorse." },
  { id: "gemini-embed-004", name: "gemini-embedding-004", provider: "google", roles: ["embedding"], price: [0.15, 0],   contextK: 8,   blurb: "Matryoshka embeddings for memory." },
  /* Meta */
  { id: "llama-4-maverick", name: "Llama 4 Maverick", provider: "meta", roles: ["reasoning", "fast"],   price: [0.5, 1.7],  contextK: 512, blurb: "Open-weights MoE; self-host friendly." },
  { id: "llama-4-scout",    name: "Llama 4 Scout",    provider: "meta", roles: ["fast"],                price: [0.17, 0.66],contextK: 10000, blurb: "Efficient open model with huge context." },
  /* Mistral */
  { id: "mistral-large-3",  name: "Mistral Large 3",  provider: "mistral", roles: ["reasoning"],        price: [2, 6],      contextK: 256, blurb: "Strong European frontier option." },
  { id: "mistral-small-3-2",name: "Mistral Small 3.2",provider: "mistral", roles: ["fast"],             price: [0.1, 0.3],  contextK: 128, blurb: "Cost-effective fast tier." },
  /* Demo (deterministic) */
  { id: "demo-reason-4",    name: "demo-reason-4",    provider: "demo", roles: ["reasoning"],           price: [0, 0],      contextK: 128, blurb: "Deterministic demo engine — no key, no network." },
  { id: "demo-fast-2",      name: "demo-fast-2",      provider: "demo", roles: ["fast"],                price: [0, 0],      contextK: 128, blurb: "Deterministic demo engine — no key, no network." },
  { id: "demo-embed-1",     name: "demo-embed-1",     provider: "demo", roles: ["embedding"],           price: [0, 0],      contextK: 8,   blurb: "Hash-based demo embeddings." },
];

export const modelById = (id: string): ModelDef => MODELS.find((m) => m.id === id) ?? MODELS[0];
export const providerById = (id: string): ProviderDef => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
export const modelsForRole = (role: ModelRole) => MODELS.filter((m) => m.roles.includes(role));

/* Which reasoning tier an agent should run on. */
export const AGENT_ROLE: Record<string, ModelRole> = {
  planner: "reasoning",
  architect: "reasoning",
  coding: "reasoning",
  research: "fast",
  ui: "fast",
  testing: "fast",
  docs: "fast",
  marketing: "fast",
};

export interface ProviderConfig {
  roles: Record<ModelRole, string>;
  keys: Record<string, string>;
  /* true once a key has been verified via a live test */
  verified: Record<string, boolean>;
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  roles: { reasoning: "demo-reason-4", fast: "demo-fast-2", embedding: "demo-embed-1" },
  keys: {},
  verified: {},
};

/* Resolve the concrete model an agent run reports, from config. */
export function resolveModel(cfg: ProviderConfig, agentId: string): string {
  const role = AGENT_ROLE[agentId] ?? "fast";
  return cfg.roles[role] ?? (role === "reasoning" ? "demo-reason-4" : "demo-fast-2");
}

/* Estimated cost (USD) for a token count at a model's list price. */
export function costFor(modelId: string, tokens: number): number {
  const m = modelById(modelId);
  const rate = m.roles.includes("embedding") ? m.price[0] : (m.price[0] + m.price[1]) / 2;
  return Math.round((tokens / 1_000_000) * rate * 10000) / 10000;
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export function isDemo(cfg: ProviderConfig): boolean {
  return cfg.roles.reasoning.startsWith("demo-") && cfg.roles.fast.startsWith("demo-");
}

/* ---------------- live connection test ----------------
   Makes a REAL minimal request to the provider so the founder can
   verify a key + model actually work. Only CORS-friendly providers
   can be tested from the browser; others report honestly. */

export interface TestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
}

export async function testProvider(providerId: string, modelId: string, key: string): Promise<TestResult> {
  const started = performance.now();
  const done = (ok: boolean, message: string): TestResult => ({
    ok, message, latencyMs: Math.round(performance.now() - started),
  });
  if (!key) return done(false, "No API key provided.");
  try {
    if (providerId === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
      });
      if (r.ok) return done(true, `Reachable — ${modelId} responded.`);
      const j = await r.json().catch(() => null);
      return done(false, j?.error?.message ?? `HTTP ${r.status} from OpenAI.`);
    }
    if (providerId === "google") {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(key)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }) },
      );
      if (r.ok) return done(true, `Reachable — ${modelId} responded.`);
      const j = await r.json().catch(() => null);
      return done(false, j?.error?.message ?? `HTTP ${r.status} from Google.`);
    }
    if (providerId === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: modelId, max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
      });
      if (r.ok) return done(true, `Reachable — ${modelId} responded.`);
      const j = await r.json().catch(() => null);
      return done(false, j?.error?.message ?? `HTTP ${r.status} from Anthropic.`);
    }
    return done(false, "Browser test not supported for this provider — verify on the server side.");
  } catch {
    return done(false, "Network/CORS error reaching the provider.");
  }
}

export interface ProbeResult {
  ok: boolean;
  text: string;
  latencyMs: number;
  message: string;
}

/* One REAL completion against the selected model with the founder's key. */
export async function probeProvider(providerId: string, modelId: string, key: string, prompt: string): Promise<ProbeResult> {
  const started = performance.now();
  const done = (ok: boolean, text: string, message: string): ProbeResult => ({
    ok, text, message, latencyMs: Math.round(performance.now() - started),
  });
  try {
    if (providerId === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: prompt }], max_tokens: 120 }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.choices?.[0]?.message?.content) return done(true, j.choices[0].message.content.trim(), "ok");
      return done(false, "", j?.error?.message ?? `HTTP ${r.status}`);
    }
    if (providerId === "google") {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(key)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
      );
      const j = await r.json().catch(() => null);
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (r.ok && txt) return done(true, txt.trim(), "ok");
      return done(false, "", j?.error?.message ?? `HTTP ${r.status}`);
    }
    if (providerId === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: modelId, max_tokens: 120, messages: [{ role: "user", content: prompt }] }),
      });
      const j = await r.json().catch(() => null);
      const txt = j?.content?.[0]?.text;
      if (r.ok && txt) return done(true, txt.trim(), "ok");
      return done(false, "", j?.error?.message ?? `HTTP ${r.status}`);
    }
    return done(false, "", "Live probe not supported for this provider in the browser build.");
  } catch {
    return done(false, "", "Network/CORS error reaching the provider.");
  }
}
