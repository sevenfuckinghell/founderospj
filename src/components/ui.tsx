import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx, fmtAgo } from "../engine/engines";

export { cx };

/* ---------------- icons (hand-drawn stroke set) ---------------- */

const PATHS: Record<string, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  radar: "M12 12l6-6M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5",
  target: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  bot: "M12 8V5M8 5h8M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 13h.01M15 13h.01M2 13v2M22 13v2",
  brain: "M9.5 3a2.5 2.5 0 0 0-2.5 2.5c-1.7.3-3 1.8-3 3.6 0 .8.3 1.6.7 2.2A3.7 3.7 0 0 0 4 14a3.9 3.9 0 0 0 3 3.8A2.9 2.9 0 0 0 9.8 21c.9 0 1.7-.3 2.2-.9V5.5A2.5 2.5 0 0 0 9.5 3zM14.5 3A2.5 2.5 0 0 1 17 5.5c1.7.3 3 1.8 3 3.6 0 .8-.3 1.6-.7 2.2A3.7 3.7 0 0 1 20 14a3.9 3.9 0 0 1-3 3.8 2.9 2.9 0 0 1-2.8 3.2c-.9 0-1.7-.3-2.2-.9V5.5A2.5 2.5 0 0 1 14.5 3z",
  shield: "M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6zM9 12l2 2 4-4",
  scales: "M12 3v18M8 21h8M12 6l-5 2 5-2 5 2M7 8l-3 6a3.5 3.5 0 0 0 6 0zM17 8l-3 6a3.5 3.5 0 0 0 6 0z",
  box: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  chart: "M3 3v18h18M8 17V9M13 17V5M18 17v-7",
  pulse: "M3 12h4l2-7 4 14 2-7h6",
  gear: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1",
  chat: "M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5zM8 11h.01M12 11h.01M16 11h.01",
  play: "M7 4l13 8-13 8z",
  pause: "M7 4v16M17 4v16",
  check: "M4 12l5 5L20 6",
  x: "M5 5l14 14M19 5L5 19",
  alert: "M12 3l10 18H2zM12 10v4M12 17.5h.01",
  zap: "M13 2L4 14h6l-1 8 9-12h-6z",
  branch: "M6 5a2 2 0 1 0 0-.01M6 19a2 2 0 1 0 0-.01M18 7a2 2 0 1 0 0-.01M6 7v8M18 9c0 4-6 3-9 6",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  clock: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 3",
  flame: "M12 3s5 4.5 5 9.5a5 5 0 0 1-10 0c0-2 1-4 2-5.5 0 2 1 3 2 3.5C11 8 12 3 12 3z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6",
  terminal: "M4 17l6-5-6-5M12 19h8",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM20 17v5H6.5a2.5 2.5 0 0 1 0-5",
};

export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden
    >
      <path d={PATHS[name] ?? PATHS.box} />
    </svg>
  );
}

/* ---------------- status system ---------------- */

export const STATUS_META: Record<string, { label: string; fg: string; bg: string; dot: string; pulse?: boolean }> = {
  RUNNING:   { label: "RUNNING",   fg: "text-cy",    bg: "bg-cy/10 border-cy/30",       dot: "bg-cy",    pulse: true },
  COMPLETED: { label: "DONE",      fg: "text-mint",  bg: "bg-mint/10 border-mint/30",   dot: "bg-mint" },
  READY:     { label: "READY",     fg: "text-sub",   bg: "bg-sub/10 border-sub/25",     dot: "bg-sub" },
  PLANNED:   { label: "PLANNED",   fg: "text-mut",   bg: "bg-mut/10 border-line",       dot: "bg-mut" },
  BACKLOG:   { label: "BACKLOG",   fg: "text-mut",   bg: "bg-mut/10 border-line",       dot: "bg-mut" },
  WAITING:   { label: "WAITING",   fg: "text-amber", bg: "bg-amber/10 border-amber/35", dot: "bg-amber", pulse: true },
  REVIEW:    { label: "REVIEW",    fg: "text-amber", bg: "bg-amber/10 border-amber/35", dot: "bg-amber" },
  APPROVED:  { label: "APPROVED",  fg: "text-mint",  bg: "bg-mint/10 border-mint/30",   dot: "bg-mint" },
  FAILED:    { label: "FAILED",    fg: "text-coral", bg: "bg-coral/10 border-coral/35", dot: "bg-coral", pulse: true },
  BLOCKED:   { label: "BLOCKED",   fg: "text-ember", bg: "bg-ember/10 border-ember/35", dot: "bg-ember" },
  CANCELLED: { label: "CANCELLED", fg: "text-mut",   bg: "bg-mut/10 border-line",       dot: "bg-mut" },
  PENDING:   { label: "PENDING",   fg: "text-amber", bg: "bg-amber/10 border-amber/35", dot: "bg-amber", pulse: true },
  REJECTED:  { label: "REJECTED",  fg: "text-coral", bg: "bg-coral/10 border-coral/35", dot: "bg-coral" },
  OPEN:      { label: "OPEN",      fg: "text-coral", bg: "bg-coral/10 border-coral/30", dot: "bg-coral" },
  UPDATED:   { label: "UPDATED",   fg: "text-amber", bg: "bg-amber/10 border-amber/35", dot: "bg-amber" },
  MITIGATED: { label: "MITIGATED", fg: "text-mint",  bg: "bg-mint/10 border-mint/30",   dot: "bg-mint" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.PLANNED;
  return (
    <span className={cx("chip border", m.bg, m.fg)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", m.dot, m.pulse && "pulse-dot")} />
      {m.label}
    </span>
  );
}

export function RiskLevelBadge({ level }: { level: string }) {
  const tone =
    level === "CRITICAL" ? "text-coral bg-coral/10 border-coral/40" :
    level === "HIGH" ? "text-coral bg-coral/10 border-coral/30" :
    level === "MEDIUM" ? "text-amber bg-amber/10 border-amber/35" :
    level === "LOW" ? "text-mint bg-mint/10 border-mint/25" :
    "text-sub bg-sub/10 border-sub/25";
  return <span className={cx("chip border", tone)}>{level}</span>;
}

/* ---------------- layout primitives ---------------- */

export function Panel({ title, right, children, className, delay = 0 }: {
  title?: string; right?: ReactNode; children: ReactNode; className?: string; delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <section className={cx("panel p-4", className)}>
        {(title || right) && (
          <header className="mb-3 flex items-center justify-between gap-3">
            {title && <h3 className="panel-title">{title}</h3>}
            {right}
          </header>
        )}
        {children}
      </section>
    </Reveal>
  );
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.08 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("reveal", inView && "is-in", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "text-txt", icon, delay = 0 }: {
  label: string; value: ReactNode; sub?: string; tone?: string; icon?: string; delay?: number;
}) {
  return (
    <Reveal delay={delay}>
    <div className="panel relative overflow-hidden px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="panel-title">{label}</span>
        {icon && <Icon name={icon} size={14} className="text-mut" />}
      </div>
      <div className={cx("mt-1.5 font-display text-[26px] font-bold leading-none tracking-tight", tone)}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-mut">{sub}</div>}
    </div>
    </Reveal>
  );
}

export function ProgressBar({ value, tone = "bg-mint", className }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-ink-700", className)}>
      <div className={cx("bar-grow h-full rounded-full", tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Sparkline({ points, tone = "#45e0b0", h = 34 }: { points: number[]; tone?: string; h?: number }) {
  const w = 120;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 3 - (p / max) * (h - 8)).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={tone} opacity="0.09" stroke="none" />
      <path d={d} fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" />
      {points.length > 0 && (
        <circle cx={w} cy={h - 3 - (points[points.length - 1] / max) * (h - 8)} r="2.4" fill={tone} />
      )}
    </svg>
  );
}

export function EmptyState({ icon = "box", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="rounded-lg border border-dashed border-line2 p-3 text-mut">
        <Icon name={icon} size={20} />
      </div>
      <p className="text-[13px] font-medium text-sub">{title}</p>
      {hint && <p className="max-w-[300px] text-[11.5px] text-mut">{hint}</p>}
    </div>
  );
}

export function TimeAgo({ ts, now }: { ts: number; now: number }) {
  return <span className="font-mono text-[10.5px] text-mut">{fmtAgo(ts, now)}</span>;
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
