import { useOS, useActions, useOrganization, useActiveWorkspace, useWorkspaceProjects } from "../store";
import { Icon, Panel, cx, StatusBadge } from "./ui";
import type { OrgRole } from "../types";

/* ------------------------------------------------------------------ */
/* Multi-tenant hierarchy:                                             */
/*   Organization → Members · Teams · Billing                          */
/*                → Workspaces → Projects(+Goals/Tasks/Runs/…) ·       */
/*                               Integrations                          */
/* ------------------------------------------------------------------ */

const ROLE_TONE: Record<OrgRole, string> = {
  OWNER: "border-amber/40 text-amber bg-amber/10",
  ADMIN: "border-cy/40 text-cy bg-cy/10",
  MEMBER: "border-mint/40 text-mint bg-mint/10",
  VIEWER: "border-line2 text-sub bg-sub/10",
};

export function TenancyPanel() {
  const s = useOS();
  const a = useActions();
  const org = useOrganization();
  const activeWs = useActiveWorkspace();
  const wsProjects = useWorkspaceProjects();

  if (!org) return null;

  const members = s.members.filter((m) => m.organizationId === org.id);
  const teams = s.teams.filter((t) => t.organizationId === org.id);
  const billing = s.billings[0];

  const wsMeta = s.workspaces.map((w) => {
    const projs = s.projects.filter((p) => p.workspaceId === w.id);
    const taskCount = projs.reduce(
      (acc, p) => acc + s.tasks.filter((t) => t.projectId === p.id).length,
      0,
    );
    const ints = s.integrations.filter((i) => i.workspaceId === w.id);
    return { w, projs, taskCount, ints };
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* Org + Billing */}
      <Panel title="Organization & billing" delay={0}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
              <Icon name="folder" size={20} />
            </div>
            <div>
              <div className="font-display text-[17px] font-bold tracking-wide">{org.name}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mut">
                {members.length} members · {teams.length} teams · {s.workspaces.length} workspaces
              </div>
            </div>
          </div>
          <span className="chip border-mint/40 text-mint">{billing?.plan ?? "—"} plan</span>
        </div>

        {billing && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { k: "Seats", v: `${members.length}/${billing.seatsTotal}` },
              { k: "Token budget", v: `${(billing.monthlyTokenBudget / 1e6).toFixed(0)}M/mo` },
              { k: "Renewal", v: billing.renewal },
            ].map((it) => (
              <div key={it.k} className="rounded-md border border-line bg-ink-900/50 px-3 py-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-mut">{it.k}</div>
                <div className="mt-0.5 font-display text-[14px] font-bold">{it.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Members */}
        <div className="mt-4">
          <div className="panel-title mb-2">Members</div>
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-md border border-line/70 bg-ink-900/40 px-3 py-2 transition-colors hover:border-line2"
              >
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line2 bg-ink-800 font-display text-[11px] font-bold text-sub">
                  {m.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{m.name}</div>
                  <div className="truncate font-mono text-[10px] text-mut">{m.email}</div>
                </div>
                <span className={cx("chip", ROLE_TONE[m.role])}>{m.role}</span>
                {m.status === "INVITED" && <StatusBadge status="WAITING" />}
              </li>
            ))}
          </ul>
        </div>

        {/* Teams */}
        <div className="mt-4">
          <div className="panel-title mb-2">Teams</div>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <div key={t.id} className="rounded-md border border-line bg-ink-900/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon name="grid" size={12} className="text-cy" />
                  <span className="text-[12px] font-medium">{t.name}</span>
                </div>
                <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">
                  {t.memberIds.length} members
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Workspaces tree */}
      <Panel title="Workspaces, projects & integrations" delay={60}>
        <div className="space-y-3">
          {wsMeta.map(({ w, projs, taskCount, ints }) => {
            const isActive = activeWs?.id === w.id;
            const accent =
              w.accent === "mint" ? "border-mint/40" : w.accent === "cy" ? "border-cy/40" : "border-amber/40";
            const accentText =
              w.accent === "mint" ? "text-mint" : w.accent === "cy" ? "text-cy" : "text-amber";
            return (
              <div
                key={w.id}
                className={cx(
                  "rounded-lg border bg-ink-900/40 transition-all",
                  isActive ? accent : "border-line hover:border-line2",
                )}
              >
                <button
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                  onClick={() => a.setWorkspace(w.id)}
                  title="Make this the active workspace"
                >
                  <Icon name="layers" size={15} className={accentText} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[13.5px] font-bold">{w.name}</span>
                      {isActive && <span className={cx("chip", accentText)}>active</span>}
                    </div>
                    <div className="mt-0.5 truncate text-[10.5px] text-mut">{w.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[13px] font-bold">{projs.length}</div>
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-mut">projects</div>
                  </div>
                </button>

                {/* nested projects */}
                {projs.length > 0 && (
                  <div className="border-t border-line/60 px-3 py-2">
                    <ul className="space-y-1">
                      {projs.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 py-0.5">
                          <span className="ml-2 h-1 w-1 shrink-0 rounded-full bg-line2" />
                          <span className="truncate text-[11.5px] text-sub">{p.name}</span>
                          <span className="ml-auto font-mono text-[9.5px] text-mut">
                            {s.tasks.filter((t) => t.projectId === p.id).length} tasks · <StatusBadge status={p.phase} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* nested integrations */}
                <div className="border-t border-line/60 px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {ints.map((i) => (
                      <span
                        key={i.id}
                        className={cx(
                          "chip",
                          i.status === "CONNECTED" ? "border-mint/30 text-mint" : "border-line2 text-mut",
                        )}
                        title={i.scopes.join(", ") || "no scopes"}
                      >
                        <span
                          className={cx(
                            "h-1 w-1 rounded-full",
                            i.status === "CONNECTED" ? "bg-mint" : "bg-mut",
                          )}
                        />
                        {i.provider}
                      </span>
                    ))}
                    {ints.length === 0 && (
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">
                        no integrations
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-mut">
          isolation: projects, goals, tasks, runs, artifacts, risks, approvals & memories are scoped per
          project → workspace → organization. switching workspace re-anchors the active project.
        </p>
      </Panel>
    </div>
  );
}
