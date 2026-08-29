import { useState } from "react";
import { useOS, useActions } from "../store";
import { Icon, Panel, cx } from "./ui";
import {
  PROVIDERS, MODELS, modelsForRole, modelById, providerById,
  maskKey, testProvider, probeProvider, isDemo,
} from "../providers";
import type { ModelRole } from "../providers";

const ROLE_META: { role: ModelRole; label: string; desc: string }[] = [
  { role: "reasoning", label: "Reasoning model", desc: "Planner · Architect · Coding — planning, tradeoffs, generation" },
  { role: "fast", label: "Fast model", desc: "Research · UI · Testing · Docs · Marketing — high-volume loops" },
  { role: "embedding", label: "Embedding model", desc: "Memory retrieval & context ranking" },
];

export function ProviderPanel() {
  const s = useOS();
  const a = useActions();
  const cfg = s.providerConfig;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testOut, setTestOut] = useState<Record<string, { ok: boolean; msg: string; ms: number }>>({});
  const [probing, setProbing] = useState(false);
  const [probeOut, setProbeOut] = useState<{ ok: boolean; text: string; meta: string } | null>(null);

  const demo = isDemo(cfg);
  const anyVerified = Object.values(cfg.verified).some(Boolean);

  const runTest = async (pid: string) => {
    const key = drafts[pid] ?? cfg.keys[pid] ?? "";
    const model = MODELS.find((m) => m.provider === pid && m.roles.includes("reasoning")) ?? MODELS[0];
    setTesting(pid);
    const r = await testProvider(pid, model.id, key);
    setTestOut((o) => ({ ...o, [pid]: { ok: r.ok, msg: r.message, ms: r.latencyMs } }));
    a.markProviderVerified(pid, r.ok);
    setTesting(null);
  };

  const runProbe = async () => {
    const m = modelById(cfg.roles.reasoning);
    if (m.provider === "demo") {
      setProbeOut({ ok: true, text: "Deterministic engine: validate the riskiest assumption before spending build time.", meta: "demo-reason-4 · 0ms · local" });
      return;
    }
    const key = cfg.keys[m.provider] ?? "";
    if (!key) {
      setProbeOut({ ok: false, text: "", meta: `No ${providerById(m.provider).name} key stored — add one below.` });
      return;
    }
    setProbing(true);
    setProbeOut(null);
    const r = await probeProvider(m.provider, m.id, key, "In one sentence: what should a solo founder validate before building an MVP?");
    setProbeOut({
      ok: r.ok,
      text: r.text,
      meta: r.ok ? `${m.id} · ${r.latencyMs}ms · live` : r.message,
    });
    if (r.ok) a.markProviderVerified(m.provider, true);
    setProbing(false);
  };

  return (
    <div className="space-y-4">
      {/* engine status */}
      <Panel delay={0}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cx("grid h-10 w-10 place-items-center rounded-lg border", demo ? "border-amber/35 bg-amber/10 text-amber" : "border-mint/40 bg-mint/10 text-mint")}>
              <Icon name="brain" size={19} />
            </div>
            <div>
              <div className="font-display text-[15px] font-bold tracking-wide">
                {demo ? "Deterministic demo engine" : anyVerified ? "Live routing · key verified" : "Live routing configured"}
              </div>
              <p className="mt-0.5 max-w-[520px] text-[11.5px] leading-snug text-sub">
                {demo
                  ? "No keys required. Agents run on the built-in deterministic engine; telemetry is simulated and labeled."
                  : "Agents report the selected models and list-price costs. Verified keys enable the live probe below."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(["reasoning", "fast", "embedding"] as ModelRole[]).map((r) => (
              <span key={r} className="chip border-line2" title={modelById(cfg.roles[r]).blurb}>
                <span className={cx("h-1.5 w-1.5 rounded-full", modelById(cfg.roles[r]).provider === "demo" ? "bg-amber" : "bg-mint")} />
                {r[0].toUpperCase()}: {modelById(cfg.roles[r]).name}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      {/* role → model routing */}
      <Panel title="Model routing — per role" delay={40}>
        <div className="space-y-4">
          {ROLE_META.map(({ role, label, desc }) => (
            <div key={role}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="font-display text-[12.5px] font-bold tracking-wide">{label}</span>
                <span className="text-[10.5px] text-mut">{desc}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {modelsForRole(role).map((m) => {
                  const pv = providerById(m.provider);
                  const active = cfg.roles[role] === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => a.setModelRole(role, m.id)}
                      title={`${m.blurb}\n$${m.price[0]} / $${m.price[1]} per 1M tok · ${m.contextK}K ctx`}
                      className={cx(
                        "group flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-all",
                        active
                          ? "border-mint/50 bg-mint/10 shadow-[0_0_16px_rgba(69,224,176,0.12)]"
                          : "border-line bg-ink-900/50 hover:-translate-y-px hover:border-line2 hover:bg-ink-800",
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: pv.accent }} />
                      <span className={cx("text-[12px] font-medium", active ? "text-mint" : "text-sub group-hover:text-txt")}>{m.name}</span>
                      <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-mut">{pv.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9.5px] leading-relaxed text-mut">
          routing is deterministic and inspectable: planner/architect/coding → reasoning · research/ui/testing/docs/marketing → fast · memory retrieval → embedding
        </p>
      </Panel>

      {/* live probe */}
      <Panel title="Live probe — one real completion with your key" delay={80} right={
        <button className="btn btn-mint py-1.5 text-[11.5px]" onClick={runProbe} disabled={probing}>
          <Icon name="zap" size={12} /> {probing ? "calling model…" : "run probe"}
        </button>
      }>
        {probeOut ? (
          <div className={cx("rounded-md border p-3", probeOut.ok ? "border-mint/30 bg-mint/5" : "border-coral/30 bg-coral/5")}>
            {probeOut.text && <p className="text-[13px] leading-snug text-txt">“{probeOut.text}”</p>}
            <p className={cx("mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em]", probeOut.ok ? "text-mint" : "text-coral")}>{probeOut.meta}</p>
          </div>
        ) : (
          <p className="text-[11.5px] text-mut">
            Asks the current reasoning model (<span className="font-mono text-[10.5px] text-sub">{modelById(cfg.roles.reasoning).name}</span>) one
            founder question and prints the real response — proof the key, model and network path work. Demo engine answers locally.
          </p>
        )}
      </Panel>

      {/* api keys */}
      <Panel title="API keys — stored only in this browser" delay={120}>
        <div className="space-y-2.5">
          {PROVIDERS.filter((p) => p.id !== "demo").map((p) => {
            const stored = cfg.keys[p.id] ?? "";
            const draft = drafts[p.id] ?? "";
            const verified = cfg.verified[p.id];
            const out = testOut[p.id];
            return (
              <div key={p.id} className="rounded-md border border-line bg-ink-900/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.accent }} />
                  <span className="font-display text-[12.5px] font-bold">{p.name}</span>
                  {stored && (
                    <span className={cx("chip border", verified ? "border-mint/35 text-mint" : "border-line2 text-sub")}>
                      {verified ? "verified" : "stored"} · {revealed[p.id] ? stored : maskKey(stored)}
                    </span>
                  )}
                  {!p.cors && <span className="chip border-amber/25 text-amber">server-side only</span>}
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-mut">{p.keyHint}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type={revealed[p.id] ? "text" : "password"}
                    className="input flex-1 py-1.5 font-mono text-[11.5px]"
                    placeholder={stored ? maskKey(stored) : `paste ${p.name} API key`}
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button className="btn py-1.5 text-[11px]" onClick={() => setRevealed((r) => ({ ...r, [p.id]: !r[p.id] }))} title="show / hide">
                    <Icon name="eye" size={13} />
                  </button>
                  <button
                    className="btn btn-mint py-1.5 text-[11px]"
                    disabled={!draft.trim()}
                    onClick={() => { a.setApiKey(p.id, draft.trim()); setDrafts((d) => ({ ...d, [p.id]: "" })); }}
                  >
                    save
                  </button>
                  {stored && (
                    <button className="btn btn-coral py-1.5 text-[11px]" onClick={() => a.setApiKey(p.id, "")}>
                      <Icon name="x" size={12} /> clear
                    </button>
                  )}
                  {p.cors && (
                    <button className="btn py-1.5 text-[11px]" disabled={testing === p.id || !stored} onClick={() => runTest(p.id)}>
                      <Icon name="pulse" size={12} /> {testing === p.id ? "testing…" : "test"}
                    </button>
                  )}
                </div>
                {out && (
                  <p className={cx("mt-1.5 font-mono text-[10px]", out.ok ? "text-mint" : "text-coral")}>
                    {out.ok ? "✓" : "✗"} {out.msg} · {out.ms}ms
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 rounded-md border border-amber/25 bg-amber/5 px-3 py-2 text-[10.5px] leading-relaxed text-amber/90">
          <Icon name="alert" size={11} className="mr-1 inline" />
          Keys persist in this browser's localStorage for the demo and are sent only to the provider's own API during test/probe.
          In production, keys belong on the server behind the tool-permission layer — never in a client bundle.
        </p>
      </Panel>
    </div>
  );
}
