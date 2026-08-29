import { useState } from "react";
import { useOS, useActions } from "../store";
import { Icon, Panel, StatusBadge, RiskLevelBadge, cx, useNow, TimeAgo, EmptyState } from "./ui";
import { TOOLS, RISK_LEVEL_ORDER, AUTONOMY_INFO, reviewerById, toolById, policyAllows } from "../data/registry";
import { pendingApprovals, truncate, fmtTime } from "../engine/engines";
import type { Autonomy, RiskLevel } from "../types";
import { ProviderPanel } from "./ProviderPanel";
import { SourcePanel } from "./SourcePanel";
import { ArchitecturePanel } from "./Architecture";

/* ================= APPROVALS ================= */

export function ApprovalsView() {
  const s = useOS();
  const a = useActions();
  const now = useNow(1000);
  const pend = pendingApprovals(s);
  const history = s.approvals.filter((x) => x.status !== "PENDING").sort((x, y) => (y.decidedAt ?? 0) - (x.decidedAt ?? 0));

  return (
    <div className="space-y-4">
      <Panel title={`Pending — human-in-the-loop gates (${pend.length})`} delay={0}>
        {pend.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-mint/20 bg-mint/5 p-4">
            <Icon name="shield" size={18} className="text-mint" />
            <p className="text-[12.5px] text-sub">Queue clear. The OS stops here automatically whenever a tool exceeds the <span className="text-mint">{s.autonomy}</span> autonomy boundary — HIGH and CRITICAL always stop, at any level.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pend.map((ap) => (
              <div key={ap.id} className="rounded-lg border border-amber/30 bg-amber/5 p-4">
                <div className="flex items-center gap-2">
                  {ap.kind === "PLAN" ? <span className="chip border-cy/30 text-cy">PLAN GATE</span> : <RiskLevelBadge level={ap.riskLevel as string} />}
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">{ap.kind === "TOOL" ? `tool · ${ap.toolId}` : "execution plan"}</span>
                  <TimeAgo ts={ap.createdAt} now={now} />
                </div>
                <h3 className="mt-2 font-display text-[14.5px] font-bold leading-snug">{ap.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-sub">{ap.desc}</p>
                {ap.kind === "TOOL" && (
                  <p className="mt-2 rounded bg-ink-900/70 px-2.5 py-1.5 font-mono text-[10.5px] text-mut">
                    tool registry → {toolById(ap.toolId ?? "").name} · risk {ap.riskLevel} · permissions {toolById(ap.toolId ?? "").permissions.join(", ")}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-mint flex-1" onClick={() => a.decideApproval(ap.id, "APPROVED")}>
                    <Icon name="check" size={13} /> Approve & execute
                  </button>
                  <button className="btn btn-coral flex-1" onClick={() => a.decideApproval(ap.id, "REJECTED")}>
                    <Icon name="x" size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Decision history — audited" delay={80}>
        {history.length === 0 ? (
          <EmptyState icon="shield" title="No decisions yet" />
        ) : (
          <ul className="divide-y divide-line/60">
            {history.map((ap) => (
              <li key={ap.id} className="flex items-center gap-3 px-1 py-2.5">
                <StatusBadge status={ap.status} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-sub">{ap.title}</span>
                <span className="font-mono text-[9.5px] uppercase text-mut">{ap.kind}</span>
                {ap.decidedAt && <TimeAgo ts={ap.decidedAt} now={now} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ================= REVIEWS ================= */

export function ReviewsView() {
  const s = useOS();
  const passes = [...s.aggregates].sort((x, y) => y.ts - x.ts);
  const [passId, setPassId] = useState<string | null>(null);
  const agg = passes.find((p) => p.id === passId) ?? passes[0];
  const reviews = agg ? s.reviews.filter((r) => r.projectId === agg.projectId && r.pass === agg.pass) : [];

  return (
    <div className="space-y-4">
      <Panel title="Review council — independent evaluation passes" delay={0} right={
        passes.length > 1 ? (
          <select className="input w-auto py-1 text-[11.5px]" value={agg?.id ?? ""} onChange={(e) => setPassId(e.target.value)}>
            {passes.map((p) => (
              <option key={p.id} value={p.id} className="bg-ink-850">
                pass {p.pass} · {p.overall}/10 · {new Date(p.ts).toLocaleDateString()}
              </option>
            ))}
          </select>
        ) : undefined
      }>
        <p className="mb-3 rounded-md border border-line bg-ink-900/50 px-3 py-2 font-mono text-[10px] text-mut">
          honesty note: these are six independent evaluation passes over the same proposal — labeled as such, never pretended to be independent ground truth.
        </p>
        {!agg ? (
          <EmptyState icon="scales" title="No council passes yet" hint="The council convenes automatically during planning and on demand via the console." />
        ) : (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1.2fr]">
              <div className="rounded-lg border border-cy/25 bg-cy/5 p-4">
                <div className="flex items-end gap-3">
                  <span className="font-display text-[42px] font-bold leading-none text-cy">{agg.overall}</span>
                  <span className="pb-1 font-mono text-[11px] text-mut">/10 overall</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-sub">{agg.consensus}</p>
                <span className={cx("chip mt-3 border", agg.overall >= 8 ? "border-mint/30 text-mint" : "border-amber/30 text-amber")}>{agg.status}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-line bg-ink-900/50 p-3">
                  <p className="panel-title mb-2">critical issues</p>
                  <ul className="space-y-1.5">
                    {agg.critical.map((c, i) => <li key={i} className="flex gap-1.5 text-[12px] text-sub"><span className="text-coral">!</span>{c}</li>)}
                  </ul>
                </div>
                <div className="rounded-md border border-line bg-ink-900/50 p-3">
                  <p className="panel-title mb-2">recommended changes</p>
                  <ul className="space-y-1.5">
                    {agg.changes.map((c, i) => <li key={i} className="flex gap-1.5 text-[12px] text-sub"><span className="text-mint">›</span>{c}</li>)}
                  </ul>
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reviews.map((r) => {
                const rev = reviewerById(r.reviewerId);
                return (
                  <div key={r.id} className="rounded-md border border-line bg-ink-900/50 p-3.5 transition-colors hover:border-line2">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[13px] font-bold">{rev.name}</span>
                      <span className={cx("font-display text-[18px] font-bold", r.score >= 8 ? "text-mint" : r.score >= 7 ? "text-cy" : "text-amber")}>{r.score}</span>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-mut">lens · {rev.lens}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded bg-ink-700">
                      <div className={cx("h-full rounded", r.score >= 8 ? "bg-mint" : r.score >= 7 ? "bg-cy" : "bg-amber")} style={{ width: `${r.score * 10}%` }} />
                    </div>
                    <p className="mt-2.5 text-[11.5px] leading-snug text-sub"><span className="text-mint">+</span> {r.strengths[0]}</p>
                    <p className="mt-1 text-[11.5px] leading-snug text-sub"><span className="text-coral">−</span> {r.weaknesses[0]}</p>
                    <p className="mt-1 text-[11.5px] leading-snug text-sub"><span className="text-cy">→</span> {r.recommendations[0]}</p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
                      <StatusBadge status={r.approval === "APPROVE" ? "APPROVED" : "REVIEW"} />
                      <span className="font-mono text-[9px] uppercase text-mut">conf {(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

/* ================= EVENTS & AUDIT ================= */

export function EventsView() {
  const s = useOS();
  const now = useNow(1000);
  const [tab, setTab] = useState<"events" | "audit">("events");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const types = ["ALL", ...Array.from(new Set(s.events.map((e) => e.type)))].sort();
  const events = [...s.events].reverse().filter((e) => typeFilter === "ALL" || e.type === typeFilter);
  const approvals = [...s.approvals].filter((x) => x.status !== "PENDING").sort((x, y) => (y.decidedAt ?? 0) - (x.decidedAt ?? 0));

  return (
    <div className="space-y-4">
      <Panel delay={0} title={tab === "events" ? "Domain events — immutable log" : "Audit — tools & permissions"} right={
        <div className="flex items-center gap-2">
          <button className={cx("btn py-1.5 text-[11px]", tab === "events" && "btn-mint")} onClick={() => setTab("events")}>events · {s.events.length}</button>
          <button className={cx("btn py-1.5 text-[11px]", tab === "audit" && "btn-mint")} onClick={() => setTab("audit")}>audit · {s.toolExecs.length + approvals.length}</button>
        </div>
      }>
        {tab === "events" ? (
          <>
            <div className="mb-3">
              <select className="input w-auto py-1.5 text-[11.5px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                {types.map((t) => <option key={t} value={t} className="bg-ink-850">{t}</option>)}
              </select>
            </div>
            <ul className="max-h-[620px] divide-y divide-line/50 overflow-y-auto pr-1">
              {events.slice(0, 120).map((e) => (
                <li key={e.id} className="flex items-baseline gap-3 px-1 py-2">
                  <span className="w-[64px] shrink-0 font-mono text-[10px] text-mut">{fmtTime(e.ts)}</span>
                  <span className={cx(
                    "w-[170px] shrink-0 truncate font-mono text-[10px] uppercase tracking-wide",
                    e.type.includes("FAIL") || e.type.includes("RISK") ? "text-coral" :
                    e.type.includes("APPROVAL") ? "text-amber" :
                    e.type.includes("COMPLETED") || e.type.includes("GRANTED") || e.type.includes("LEARNING") ? "text-mint" : "text-cy",
                  )}>{e.type}</span>
                  <span className="min-w-0 flex-1 text-[12px] text-sub">{e.message}</span>
                  <TimeAgo ts={e.ts} now={now} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="panel-title mb-2">tool executions</p>
              {s.toolExecs.length === 0 ? <p className="text-[12px] text-mut">None yet.</p> : (
                <ul className="divide-y divide-line/60">
                  {[...s.toolExecs].reverse().map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2">
                      <span className={cx("h-1.5 w-1.5 rounded-full", t.status === "SUCCESS" ? "bg-mint" : "bg-coral")} />
                      <span className="w-[160px] font-mono text-[11px] text-txt">{toolById(t.toolId).name}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-mut">{t.input}</span>
                      <span className="chip">actor · {t.actor}</span>
                      <span className="chip">{t.permission}</span>
                      <span className={cx("chip", t.decision.startsWith("founder") ? "border-amber/30 text-amber" : "border-mint/25 text-mint/90")}>{t.decision}</span>
                      <span className="font-mono text-[10px] text-mut">{t.durationMs}ms</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="panel-title mb-2">approval decisions</p>
              {approvals.length === 0 ? <p className="text-[12px] text-mut">None yet.</p> : (
                <ul className="divide-y divide-line/60">
                  {approvals.map((ap) => (
                    <li key={ap.id} className="flex items-center gap-3 px-1 py-2">
                      <StatusBadge status={ap.status} />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-sub">{ap.title}</span>
                      <span className="font-mono text-[10px] text-mut">{ap.decidedAt ? fmtTime(ap.decidedAt) : "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ================= SETTINGS ================= */

export function SettingsView() {
  const s = useOS();
  const a = useActions();
  const [confirmReset, setConfirmReset] = useState(false);
  const [openIntegration, setOpenIntegration] = useState<string | null>(null);

  const integrations = [
    { id: "github", name: "GitHub", env: "GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET" },
    { id: "google", name: "Google (Calendar, Mail)", env: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" },
    { id: "slack", name: "Slack", env: "SLACK_CLIENT_ID / SLACK_CLIENT_SECRET" },
    { id: "notion", name: "Notion", env: "NOTION_TOKEN" },
    { id: "linear", name: "Linear", env: "LINEAR_API_KEY" },
  ];

  return (
    <div className="space-y-4">
      <ProviderPanel />
      <Panel title="Runtime architecture — the stack executing right now" delay={40} right={<span className="chip border-cy/30 text-cy">live</span>}>
        <ArchitecturePanel />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Autonomy level — configurable, never bypasses permissions" delay={0}>
        <div className="space-y-2">
          {(Object.keys(AUTONOMY_INFO) as Autonomy[]).map((lvl) => (
            <button
              key={lvl}
              className={cx(
                "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors",
                s.autonomy === lvl ? "border-mint/45 bg-mint/5" : "border-line bg-ink-900/50 hover:border-line2",
              )}
              onClick={() => a.setAutonomy(lvl)}
            >
              <span className={cx("mt-1 h-3 w-3 shrink-0 rounded-full border-2", s.autonomy === lvl ? "border-mint bg-mint" : "border-line2")} />
              <span>
                <span className="flex items-center gap-2 font-display text-[13px] font-bold">
                  {AUTONOMY_INFO[lvl].label}
                  <span className="chip">{lvl}</span>
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-sub">{AUTONOMY_INFO[lvl].desc}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-md border border-line bg-ink-900/50 px-3 py-2 font-mono text-[10px] leading-relaxed text-mut">
          risk severity formula: severity = probability × impact · weights editable in packages/config (inspectable, deterministic)
        </p>
      </Panel>

      <div className="space-y-4">
        <Panel title="Policy matrix — what executes without asking" delay={60}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 pr-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut">tool risk</th>
                  {(["MANUAL", "ASSISTED", "SUPERVISED", "AUTONOMOUS"] as const).map((lvl) => (
                    <th key={lvl} className={cx("pb-2 pr-2 text-center font-mono text-[9.5px] uppercase tracking-[0.1em]", s.autonomy === lvl ? "text-mint" : "text-mut")}>{lvl.toLowerCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {RISK_LEVEL_ORDER.map((rl: RiskLevel) => (
                  <tr key={rl}>
                    <td className="py-2 pr-2"><RiskLevelBadge level={rl} /></td>
                    {(["MANUAL", "ASSISTED", "SUPERVISED", "AUTONOMOUS"] as const).map((lvl) => {
                      const auto = policyAllows(lvl, rl);
                      return (
                        <td key={lvl} className="py-2 pr-2 text-center">
                          <span className={cx("font-mono text-[9.5px] uppercase tracking-wide", auto ? "text-mint" : "text-amber")}>
                            {auto ? "auto" : rl === "HIGH" || rl === "CRITICAL" ? "always gate" : "gate"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Source code & export — take the whole product with you" delay={120}>
          <SourcePanel />
        </Panel>

        <Panel title="Integrations" delay={140}>
          <ul className="space-y-2">
            {integrations.map((it) => (
              <li key={it.id} className="rounded-md border border-line bg-ink-900/50">
                <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left" onClick={() => setOpenIntegration(openIntegration === it.id ? null : it.id)}>
                  <Icon name="branch" size={14} className="text-mut" />
                  <span className="flex-1 text-[12.5px] font-medium">{it.name}</span>
                  <span className="chip border-amber/25 text-amber">not configured</span>
                  <Icon name="arrow" size={12} className={cx("text-mut transition-transform", openIntegration === it.id && "rotate-90")} />
                </button>
                {openIntegration === it.id && (
                  <div className="slide-in border-t border-line px-3 py-2.5">
                    <p className="font-mono text-[10.5px] text-sub">required env: <span className="text-cy">{it.env}</span></p>
                    <p className="mt-1 text-[11px] leading-snug text-mut">
                      Requires credentials on the API side — never in the browser. In demo mode, {it.name} tools execute against the mock executor and are labeled as simulated in the audit log.
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Tool registry" delay={180}>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded border border-line/70 bg-ink-900/40 px-2.5 py-2" title={t.description}>
                <span className="truncate font-mono text-[10.5px] text-sub">{t.name}</span>
                <span className="ml-auto"><RiskLevelBadge level={t.riskLevel} /></span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Danger zone" delay={220}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-sub">Reset the demo workspace — reseeds the Healthcare SaaS project mid-execution.</p>
            {confirmReset ? (
              <div className="flex gap-2">
                <button className="btn btn-coral" onClick={() => { a.reset(); setConfirmReset(false); }}>
                  <Icon name="refresh" size={13} /> confirm reset
                </button>
                <button className="btn" onClick={() => setConfirmReset(false)}>cancel</button>
              </div>
            ) : (
              <button className="btn btn-coral" onClick={() => setConfirmReset(true)}>
                <Icon name="alert" size={13} /> reset demo data
              </button>
            )}
          </div>
        </Panel>
      </div>
      </div>
    </div>
  );
}
