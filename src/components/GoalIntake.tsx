import { useState } from "react";
import { useOS, useActions } from "../store";
import { Icon, Panel, StatusBadge, cx, useNow, TimeAgo } from "./ui";
import type { ViewId } from "./Shell";
import type { GoalInput } from "../types";

const SAMPLES: { label: string; input: GoalInput }[] = [
  {
    label: "AI marketing agency",
    input: {
      title: "Build an AI marketing agency for e-commerce brands",
      description: "Productized service: AI-generated campaigns, weekly experiments, transparent reporting. Start with 3 retainer clients.",
      successCriteria: ["3 retainer clients signed", "Campaign production cost < $400", "Weekly reporting automated"],
      constraints: ["No paid ads spend from own budget", "All client sends approved manually"],
      budget: "$12,000", deadline: "45 days",
    },
  },
  {
    label: "Healthcare SaaS (60d)",
    input: {
      title: "Build and launch an AI-powered healthcare SaaS product for small clinics within 60 days",
      description: "AI triage assistant: structured intake → urgency queue → clinician override. Wedge on setup time and trust.",
      successCriteria: ["MVP deployed", "10 pilot users", "Payment system working"],
      constraints: ["HIPAA-aware scope", "Human override always available"],
      budget: "$25,000", deadline: "60 days",
    },
  },
  {
    label: "Niche commerce store",
    input: {
      title: "Launch a specialty coffee subscription store with AI-curated boxes",
      description: "Small catalog, subscription checkout, supplier sync. Validate with pre-orders before stocking inventory.",
      successCriteria: ["100 pre-orders", "<1% payment failures", "Supplier sync < 15 min"],
      constraints: ["Pre-order funded inventory only"],
      budget: "$8,000", deadline: "40 days",
    },
  },
];

export function GoalIntake({ goto }: { goto: (v: ViewId) => void }) {
  const s = useOS();
  const a = useActions();
  const now = useNow(1000);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [constraints, setConstraints] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (title.trim().length < 8) {
      setErr("Give the goal a real sentence — at least 8 characters.");
      return;
    }
    setErr("");
    a.submitGoal({
      title: title.trim(),
      description: description.trim() || title.trim(),
      successCriteria: criteria.split("\n").map((x) => x.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
      constraints: constraints.split("\n").map((x) => x.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
      budget: budget.trim() || undefined,
      deadline: deadline || undefined,
    });
    goto("command");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Panel delay={0} title="New goal — the OS plans, you approve">
        <div className="space-y-4">
          <div>
            <label className="panel-title mb-1.5 block">What do you want to achieve?</label>
            <textarea
              className="input min-h-[86px] resize-y font-display text-[15px] font-semibold tracking-wide"
              placeholder={"e.g. Build and launch an AI-powered healthcare SaaS product for small clinics within 60 days."}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="panel-title mb-1.5 block">Context (optional)</label>
            <textarea
              className="input min-h-[60px] resize-y"
              placeholder="What's the wedge? Who is it for? What have you tried?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="panel-title mb-1.5 block">Success criteria — one per line</label>
              <textarea
                className="input min-h-[74px] resize-y font-mono text-[12px]"
                placeholder={"MVP deployed\n10 pilot users\nPayment system working"}
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
              />
              <p className="mt-1 text-[10.5px] text-mut">If you define these, the OS will never invent replacements.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="panel-title mb-1.5 block">Deadline</label>
                <input className="input" placeholder="e.g. 60 days or 2026-05-01" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div>
                <label className="panel-title mb-1.5 block">Budget (optional)</label>
                <input className="input" placeholder="e.g. $25,000" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <label className="panel-title mb-1.5 block">Constraints (optional) — one per line</label>
            <textarea
              className="input min-h-[52px] resize-y font-mono text-[12px]"
              placeholder={"HIPAA-aware scope only\nNo cold outbound"}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
            />
          </div>
          {err && (
            <p className="flex items-center gap-2 rounded-md border border-coral/30 bg-coral/8 px-3 py-2 text-[12px] text-coral">
              <Icon name="alert" size={13} /> {err}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button className="btn btn-mint px-5 py-2.5 text-[13.5px]" onClick={submit}>
              <Icon name="zap" size={14} /> Start AI Planning
            </button>
            <span className="font-mono text-[10.5px] text-mut">
              analyze → context → strategy → roadmap → risks → review council → your approval
            </span>
          </div>
          <div className="border-t border-line pt-3">
            <span className="panel-title">Try a sample goal</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLES.map((sm) => (
                <button
                  key={sm.label}
                  className="chip cursor-pointer border-line2 transition-colors hover:border-mint/40 hover:text-mint"
                  onClick={() => {
                    setTitle(sm.input.title); setDescription(sm.input.description);
                    setCriteria(sm.input.successCriteria.join("\n")); setConstraints(sm.input.constraints.join("\n"));
                    setBudget(sm.input.budget ?? ""); setDeadline(sm.input.deadline ?? "");
                  }}
                >
                  {sm.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel title="Goal register" delay={80}>
          {s.goals.length === 0 && <p className="text-[12px] text-mut">No goals yet.</p>}
          <ul className="space-y-2">
            {[...s.goals].reverse().map((g) => {
              const proj = s.projects.find((p) => p.id === g.projectId);
              return (
                <li key={g.id} className="cursor-pointer rounded-md border border-line bg-ink-900/50 p-3 transition-colors hover:border-line2"
                    onClick={() => { a.setActive(g.projectId); goto("projects"); }}>
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={g.status === "COMPLETED" ? "COMPLETED" : proj?.phase === "EXECUTING" ? "RUNNING" : "PLANNED"} />
                    <TimeAgo ts={g.createdAt} now={now} />
                  </div>
                  <p className="mt-1.5 text-[12.5px] font-medium leading-snug">{g.title}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-mut">
                    {proj?.name} · {g.priority} {g.deadline && `· ${g.deadline}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="What happens after submit" delay={140}>
          <ol className="space-y-2">
            {[
              ["Analyzing goal", "parses your sentence, locks your success criteria, detects the domain profile"],
              ["Building context", "pulls relevant memories — never the whole database"],
              ["Creating roadmap", "task DAG with dependencies, scored by the priority engine"],
              ["Identifying risks", "severity = probability × impact, each with owner + mitigation"],
              ["Review council", "6 evaluation passes over the same proposal"],
              ["Your approval", "nothing executes until you decide — reject to force a replan"],
            ].map(([t2, d], i) => (
              <li key={t2} className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-ink-700 font-mono text-[10px] text-mint">{i + 1}</span>
                <p className="text-[12px] leading-snug text-sub"><span className={cx("font-semibold text-txt")}>{t2}</span> — {d}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
