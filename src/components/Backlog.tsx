import { useEffect, useMemo, useRef, useState } from "react";
import {
  BACKLOG, P0_LANE, P1_LANE, P2_PIPELINE, STATUS_META, coverageOf, overallStats, toGitHubMarkdown,
} from "../data/backlog";
import type { ItemStatus } from "../data/backlog";
import { Icon, Panel, Reveal, cx, ProgressBar } from "./ui";
import { toast } from "./Toasts";

/* ------------------------------------------------------------------ */
/* Production Backlog — the 56-system master plan, rendered live with  */
/* honest status derivation. Exports straight to GitHub epics/issues.  */
/* ------------------------------------------------------------------ */

type Filter = "all" | ItemStatus;

const RAIL_GROUPS: { label: string; nums: number[] }[] = [
  { label: "Core OS", nums: [1, 37] },
  { label: "Platform & Tenancy", nums: [2, 3, 32, 31, 30] },
  { label: "Security & AI Safety", nums: [4, 20] },
  { label: "Agents & Orchestration", nums: [5, 6, 44, 22, 21] },
  { label: "Execution & Delivery", nums: [7, 18, 23, 24, 25, 27] },
  { label: "Intelligence", nums: [8, 9, 10, 11, 12, 45, 46, 47, 49, 50] },
  { label: "Analytics & Finance", nums: [13, 14, 15] },
  { label: "AI Infrastructure", nums: [16, 17, 28, 29] },
  { label: "Interfaces & Comms", nums: [19, 33, 34, 35, 36, 43] },
  { label: "Go-to-Market", nums: [38, 39, 40, 41, 42] },
  { label: "Enterprise & Business", nums: [48, 51, 52, 53, 54, 55, 56] },
];

function useCountUp(target: number, ms = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setVal(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

function CoverageRing({ pct, size = 92 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setDrawn(pct), 120);
    return () => window.clearTimeout(t);
  }, [pct]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2836" strokeWidth="7" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#blGrad)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(drawn / 100) * circ} ${circ}`}
        style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <defs>
        <linearGradient id="blGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#45e0b0" />
          <stop offset="100%" stopColor="#56c8f0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StatusChip({ status }: { status: ItemStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cx("chip border", m.bg, m.fg)} title={m.full}>{m.label}</span>
  );
}

function CheckGlyph({ status }: { status: ItemStatus }) {
  if (status === "s") return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border border-mint/60 bg-mint/15 text-mint">
      <Icon name="check" size={10} />
    </span>
  );
  if (status === "p") return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border border-cy/50 bg-cy/10">
      <span className="h-1.5 w-1.5 rounded-full bg-cy" />
    </span>
  );
  if (status === "b") return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border border-amber/50 bg-amber/10 font-mono text-[9px] font-bold text-amber">B</span>
  );
  return <span className="h-4 w-4 shrink-0 rounded-[4px] border border-line2 bg-ink-900/70" />;
}

export function BacklogView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeSys, setActiveSys] = useState<number>(1);
  const listRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => overallStats(), []);
  const shipped = useCountUp(stats.s);
  const total = useCountUp(stats.total);
  const systems = useCountUp(stats.systems);

  const sysCov = useMemo(() => new Map(BACKLOG.map((s) => [s.num, coverageOf(s.items)])), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BACKLOG.map((sys) => {
      const items = sys.items.filter((i) => {
        const okStatus = filter === "all" || i.status === filter;
        const okQ = !q || i.label.toLowerCase().includes(q) || sys.name.toLowerCase().includes(q);
        return okStatus && okQ;
      });
      return { ...sys, items };
    }).filter((sys) => sys.items.length > 0);
  }, [query, filter]);

  /* scroll spy */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-sys]"));
    const ob = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveSys(Number((e.target as HTMLElement).dataset.sys));
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    cards.forEach((c) => ob.observe(c));
    return () => ob.disconnect();
  }, [filtered]);

  const jump = (num: number) => {
    const el = listRef.current?.querySelector(`[data-sys="${num}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportMd = () => {
    const md = toGitHubMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "founder-os-backlog.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast("ok", "Backlog exported", `${BACKLOG.length} epics · ${stats.total} items → founder-os-backlog.md, ready for GitHub issues.`);
  };

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(toGitHubMarkdown());
      toast("ok", "Copied to clipboard", "Paste it into a GitHub issue, epic tracker, or doc.");
    } catch {
      toast("warn", "Clipboard blocked", "Use Export instead — the browser refused clipboard access.");
    }
  };

  const p0cov = coverageOf(P0_LANE);
  const p1cov = coverageOf(P1_LANE);
  const p2cov = coverageOf(P2_PIPELINE);

  return (
    <div className="space-y-5">
      {/* header — mission control, not a hero */}
      <Reveal>
        <header className="panel relative overflow-hidden p-5">
          <div className="grid-overlay pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div className="relative grid place-items-center">
              <CoverageRing pct={stats.pct} />
              <span className="absolute font-display text-[20px] font-bold text-mint">{stats.pct}%</span>
            </div>
            <div className="min-w-[240px] flex-1">
              <p className="panel-title flex items-center gap-2">
                <Icon name="layers" size={12} /> master implementation backlog · derived from the running build
              </p>
              <h2 className="mt-1 font-display text-[26px] font-bold leading-tight tracking-wide md:text-[32px]">
                {systems} system epics. <span className="text-mint">{shipped}</span> of <span className="text-cy">{total}</span> items live.
              </h2>
              <p className="mt-1 max-w-[640px] text-[12.5px] leading-snug text-sub">
                The exact plan for turning this console into the production platform — grouped into GitHub-ready epics.
                Statuses are honest: <span className="text-mint">shipped</span> runs here now, <span className="text-cy">partial</span> has live capability,
                <span className="text-amber"> blueprint</span> ships as production code in <span className="font-mono text-[11px]">server/</span>, the rest is planned.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button className="btn btn-mint" onClick={exportMd}>
                <Icon name="box" size={13} /> export GitHub epics (.md)
              </button>
              <button className="btn" onClick={copyMd}>
                <Icon name="book" size={13} /> copy markdown
              </button>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
            {(["s", "p", "b", "x"] as ItemStatus[]).map((st) => {
              const c = stats[st];
              return (
                <button key={st} className="group flex items-center gap-2" onClick={() => setFilter(filter === st ? "all" : st)}>
                  <CheckGlyph status={st} />
                  <span className={cx("font-mono text-[10px] uppercase tracking-[0.12em]", STATUS_META[st].fg)}>{STATUS_META[st].label}</span>
                  <span className="font-display text-[15px] font-bold text-txt transition-transform group-hover:scale-110">{c}</span>
                </button>
              );
            })}
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.14em] text-mut">click a status to filter</span>
          </div>
        </header>
      </Reveal>

      {/* priority lanes */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="P0 — infrastructure" delay={40} right={<span className="chip border-mint/30 text-mint">{p0cov.pct}%</span>}>
          <ProgressBar value={p0cov.pct} className="mb-3" />
          <ul className="space-y-1.5">
            {P0_LANE.map((p, i) => (
              <li key={p.label} className="group flex items-center gap-2.5 rounded-md border border-line/70 bg-ink-900/40 px-2.5 py-1.5 transition-all hover:translate-x-0.5 hover:border-line2">
                <span className="font-mono text-[10px] text-mut">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">{p.label}</span>
                  <span className="block font-mono text-[9px] text-mut">{p.note}</span>
                </span>
                <StatusChip status={p.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="P1 — AI infrastructure" delay={90} right={<span className="chip border-cy/30 text-cy">{p1cov.pct}%</span>}>
          <ProgressBar value={p1cov.pct} tone="bg-cy" className="mb-3" />
          <ul className="space-y-1.5">
            {P1_LANE.map((p, i) => (
              <li key={p.label} className="group flex items-center gap-2.5 rounded-md border border-line/70 bg-ink-900/40 px-2.5 py-1.5 transition-all hover:translate-x-0.5 hover:border-line2">
                <span className="font-mono text-[10px] text-mut">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">{p.label}</span>
                  <span className="block font-mono text-[9px] text-mut">{p.note}</span>
                </span>
                <StatusChip status={p.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="P2 — founder intelligence pipeline" delay={140} right={<span className="chip border-amber/30 text-amber">{p2cov.pct}%</span>}>
          <ProgressBar value={p2cov.pct} tone="bg-amber" className="mb-3" />
          <div className="flex flex-wrap items-center gap-y-2">
            {P2_PIPELINE.map((p, i) => (
              <span key={p.label} className="flex items-center">
                <span
                  className={cx(
                    "chip cursor-default border transition-transform hover:scale-105",
                    p.status === "s" ? "border-mint/40 text-mint" : p.status === "p" ? "border-cy/35 text-cy" : "",
                  )}
                  title={`${STATUS_META[p.status].full}`}
                >
                  {p.label}
                </span>
                {i < P2_PIPELINE.length - 1 && <Icon name="arrow" size={11} className="mx-1 text-mut" />}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-mut">
            The sequence that turns a strong simulated OS into a real autonomous company platform — build in this order, not in parallel.
          </p>
        </Panel>
      </div>

      {/* controls */}
      <Reveal delay={80}>
        <div className="panel flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="eye" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
            <input
              className="input pl-8"
              placeholder="Search 650+ items — try “runway”, “OAuth”, “kanban”, “RLS”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "s", "p", "b", "x"] as Filter[]).map((f) => (
              <button
                key={f}
                className={cx(
                  "chip cursor-pointer border transition-all",
                  filter === f ? "border-mint/50 bg-mint/10 text-mint" : "hover:border-line2 hover:text-txt",
                )}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "ALL" : STATUS_META[f].label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mut">
            {filtered.reduce((a, s) => a + s.items.length, 0)} items shown
          </span>
        </div>
      </Reveal>

      {/* rail + epics */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Reveal delay={60}>
          <nav className="panel sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto p-3">
            <p className="panel-title mb-2 px-1">epic rail</p>
            {RAIL_GROUPS.map((g) => {
              const visible = g.nums.filter((n) => filtered.some((s) => s.num === n));
              if (visible.length === 0) return null;
              return (
                <div key={g.label} className="mb-3">
                  <p className="px-1 pb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-mut/80">{g.label}</p>
                  {visible.map((n) => {
                    const sys = BACKLOG.find((s) => s.num === n)!;
                    const c = sysCov.get(n)!;
                    return (
                      <button
                        key={n}
                        className={cx(
                          "group mb-0.5 flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-all hover:bg-ink-800/70",
                          activeSys === n && "bg-ink-750 ring-1 ring-mint/25",
                        )}
                        onClick={() => jump(n)}
                      >
                        <span className="font-mono text-[9px] text-mut">{String(n).padStart(2, "0")}</span>
                        <span className={cx("min-w-0 flex-1 truncate text-[11.5px]", activeSys === n ? "text-txt" : "text-sub")}>{sys.name}</span>
                        <span className={cx("font-mono text-[9px]", c.pct >= 60 ? "text-mint" : c.pct >= 25 ? "text-cy" : "text-mut")}>{c.pct}%</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </Reveal>

        <div ref={listRef} className="min-w-0 space-y-4">
          {filtered.map((sys, idx) => {
            const c = coverageOf(sys.items);
            return (
              <Reveal key={sys.num} delay={Math.min(idx * 30, 180)}>
                <section data-sys={sys.num} className="panel scroll-mt-4 overflow-hidden transition-colors hover:border-line2">
                  <header className="flex flex-wrap items-center gap-3 border-b border-line bg-ink-950/40 px-4 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md border border-line2 bg-ink-800 text-cy">
                      <Icon name={sys.icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[15.5px] font-bold tracking-wide">
                        <span className="mr-2 font-mono text-[10px] font-normal text-mut">EPIC-{String(sys.num).padStart(2, "0")}</span>
                        {sys.name}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-2">
                        <ProgressBar value={c.pct} className="max-w-[220px]" tone={c.pct >= 60 ? "bg-mint" : c.pct >= 25 ? "bg-cy" : "bg-amber"} />
                        <span className="font-mono text-[9.5px] text-mut">
                          {c.s} shipped · {c.p} partial · {c.b} blueprint · {c.x} planned
                        </span>
                      </div>
                    </div>
                    <span className="font-display text-[22px] font-bold text-txt">{c.pct}<span className="text-[12px] text-mut">%</span></span>
                  </header>
                  <ul className="grid gap-x-4 px-4 py-3 md:grid-cols-2">
                    {sys.items.map((item) => (
                      <li
                        key={item.label}
                        className="group flex items-center gap-2.5 rounded-md px-1.5 py-[5px] transition-all hover:translate-x-0.5 hover:bg-ink-800/60"
                      >
                        <CheckGlyph status={item.status} />
                        <span className={cx(
                          "min-w-0 flex-1 truncate text-[12px] transition-colors",
                          item.status === "s" ? "text-sub group-hover:text-txt" : item.status === "x" ? "text-mut group-hover:text-sub" : "text-sub group-hover:text-txt",
                          item.status === "s" && "line-through decoration-mint/30 decoration-1",
                        )}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            );
          })}
          {filtered.length === 0 && (
            <div className="panel p-10 text-center">
              <p className="font-display text-[15px] font-bold">Nothing matches “{query}”.</p>
              <p className="mt-1 text-[12px] text-mut">Try “webhook”, “SSO”, “kanban”, or clear the status filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
