import { useEffect, useRef, useState } from "react";
import { useActions } from "../store";
import { Icon, cx } from "./ui";
import { AGENTS, TOOLS, AUTONOMY_INFO } from "../data/registry";
import { modelsForRole } from "../providers";
import type { Autonomy } from "../types";

/* ------------------------------------------------------------------ */
/* Boot sequence — the console opens like a system coming online:      */
/* a live boot log, then workspace setup. No generic hero.             */
/* ------------------------------------------------------------------ */

type LineKind = "sys" | "ok" | "ready";
const BOOT_LINES: [string, LineKind][] = [
  ["FOUNDER/OS v4.2.0 — boot sequence", "sys"],
  [`agent registry .......... ${AGENTS.length} agents · capabilities indexed`, "ok"],
  [`tool registry ........... ${TOOLS.length} tools · 5 risk classes`, "ok"],
  ["memory engine ........... working · episodic · semantic · preference · procedural", "ok"],
  ["priority engine ......... deterministic scoring armed", "ok"],
  ["risk engine ............. severity = probability × impact", "ok"],
  ["review council .......... 6 evaluation passes standing by", "ok"],
  ["approval gate ........... HIGH / CRITICAL will always stop for you", "ok"],
  ["orchestrator ............ action engine waiting on first goal", "ok"],
  ["READY", "ready"],
];

export function BootScreen() {
  const a = useActions();
  const [revealed, setRevealed] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("Founder Workspace");
  const [founder, setFounder] = useState("Founder");
  const [autonomy, setAutonomy] = useState<Autonomy>("ASSISTED");
  const [reasoning, setReasoning] = useState("demo-reason-4");
  const [fast, setFast] = useState("demo-fast-2");
  const [loadDemo, setLoadDemo] = useState(true);
  const done = useRef(false);

  const doneLog = revealed >= BOOT_LINES.length;

  useEffect(() => {
    if (doneLog) {
      const t = window.setTimeout(() => setShowForm(true), 260);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 420 : 165);
    return () => window.clearTimeout(t);
  }, [revealed, doneLog]);

  const skip = () => { setRevealed(BOOT_LINES.length); setShowForm(true); };

  const boot = () => {
    if (done.current) return;
    done.current = true;
    a.completeOnboarding({ name, founder, autonomy, reasoningModel: reasoning, fastModel: fast, loadDemo });
  };

  const reasoningModels = modelsForRole("reasoning");
  const fastModels = modelsForRole("fast");

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden p-4 md:p-8">
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-0" />

      <div className="panel reveal is-in relative z-10 w-full max-w-[900px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        {/* header strip */}
        <div className="flex items-center gap-3 border-b border-line bg-ink-950/60 px-5 py-3.5">
          <div className="relative grid h-8 w-8 place-items-center rounded-md border border-mint/30 bg-mint/10">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#45e0b0" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 19V5h10M6 12h8" />
            </svg>
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber shadow-[0_0_8px_rgba(242,185,92,0.9)]" />
          </div>
          <span className="font-display text-[15px] font-bold tracking-wide">
            FOUNDER<span className="text-mint">/</span>OS
          </span>
          <span className="chip">v4.2.0</span>
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.18em] text-mut">ai operating system</span>
        </div>

        <div className="grid md:grid-cols-[1.05fr_1fr]">
          {/* boot terminal */}
          <div className="relative min-h-[300px] overflow-hidden border-b border-line bg-ink-950/80 p-5 md:border-b-0 md:border-r">
            <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cy/[0.04] to-transparent" />
            <div className="font-mono text-[11px] leading-[1.9]">
              {BOOT_LINES.slice(0, revealed).map(([text, kind], i) => (
                <div key={i} className={cx("slide-in flex items-baseline gap-2", kind === "ready" && "mt-2")}>
                  <span className={kind === "ready" ? "text-mint" : "text-mut"}>›</span>
                  <span className={kind === "sys" ? "text-cy" : kind === "ready" ? "font-semibold tracking-[0.24em] text-mint" : "text-sub"}>
                    {text}
                  </span>
                  {kind === "ok" && <span className="ml-auto text-mint/70">ok</span>}
                </div>
              ))}
              {!doneLog && <span className="caret ml-1 inline-block h-[13px] w-[7px] translate-y-[2px] bg-mint/80" />}
            </div>

            {/* progress */}
            <div className="absolute inset-x-5 bottom-5">
              <div className="mb-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
                <span>boot progress</span>
                <span className="text-cy">{Math.round((revealed / BOOT_LINES.length) * 100)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mint to-cy transition-all duration-300 ease-out"
                  style={{ width: `${(revealed / BOOT_LINES.length) * 100}%` }}
                />
              </div>
              {!doneLog && (
                <button className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut transition-colors hover:text-mint" onClick={skip}>
                  skip boot log »
                </button>
              )}
            </div>
          </div>

          {/* workspace setup */}
          <div className={cx("p-5 transition-opacity duration-300", showForm ? "opacity-100" : "opacity-40")}>
            <h2 className="font-display text-[17px] font-bold tracking-wide">Set up your workspace</h2>
            <p className="mt-1 text-[11.5px] leading-snug text-mut">
              The console arms itself around your preferences. You stay the decision-maker — the OS is the operating layer underneath.
            </p>

            <form
              className="mt-4 space-y-3.5"
              onSubmit={(e) => { e.preventDefault(); boot(); }}
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="panel-title mb-1 block">workspace</label>
                  <input className="input py-2 text-[12px]" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="panel-title mb-1 block">founder</label>
                  <input className="input py-2 text-[12px]" value={founder} onChange={(e) => setFounder(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="panel-title mb-1.5 block">autonomy level</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(AUTONOMY_INFO) as Autonomy[]).map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      className={cx(
                        "rounded-md border px-1 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] transition-all",
                        autonomy === lvl
                          ? "border-mint/50 bg-mint/10 text-mint shadow-[0_0_14px_rgba(69,224,176,0.12)]"
                          : "border-line bg-ink-900/60 text-mut hover:border-line2 hover:text-sub",
                      )}
                      onClick={() => setAutonomy(lvl)}
                      title={AUTONOMY_INFO[lvl].desc}
                    >
                      {lvl.toLowerCase()}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10.5px] leading-snug text-mut">{AUTONOMY_INFO[autonomy].desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="panel-title mb-1 block">reasoning model</label>
                  <select className="input cursor-pointer py-2 font-mono text-[11px]" value={reasoning} onChange={(e) => setReasoning(e.target.value)}>
                    {reasoningModels.map((m) => (
                      <option key={m.id} value={m.id} className="bg-ink-850">{m.name} · {m.provider}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="panel-title mb-1 block">fast model</label>
                  <select className="input cursor-pointer py-2 font-mono text-[11px]" value={fast} onChange={(e) => setFast(e.target.value)}>
                    {fastModels.map((m) => (
                      <option key={m.id} value={m.id} className="bg-ink-850">{m.name} · {m.provider}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="-mt-1.5 text-[10px] text-mut">
                Demo engines need no key. Add provider keys later in Settings → AI Providers & Models.
              </p>

              <button
                type="button"
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-all",
                  loadDemo ? "border-amber/40 bg-amber/8 hover:bg-amber/12" : "border-line bg-ink-900/60 hover:border-line2",
                )}
                onClick={() => setLoadDemo((v) => !v)}
              >
                <span className={cx(
                  "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                  loadDemo ? "border-amber bg-amber/20 text-amber" : "border-line2 text-transparent",
                )}>
                  <Icon name="check" size={10} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium">Load the live demo workspace</span>
                  <span className="block text-[10.5px] leading-snug text-mut">
                    Healthcare SaaS mid-execution — an agent running, one approval waiting. Uncheck for an empty console.
                  </span>
                </span>
              </button>

              <button type="submit" className="btn btn-mint w-full py-2.5 text-[13.5px]" disabled={!showForm && !doneLog}>
                <Icon name="zap" size={14} /> Boot console
                <span className="font-mono text-[9px] opacity-70">⏎</span>
              </button>
            </form>
          </div>
        </div>

        {/* footer strip */}
        <div className="flex items-center justify-between border-t border-line bg-ink-950/60 px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
          <span>you approve · the os executes · everything is audited</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-mint pulse-dot" /> systems nominal
          </span>
        </div>
      </div>
    </div>
  );
}
