/* ------------------------------------------------------------------ */
/* Complete source manifest — every file in this project, embedded     */
/* as text at build time (?raw), so the running app can hand the       */
/* founder a full, runnable copy of its own codebase.                  */
/* ------------------------------------------------------------------ */

import pkgJson from "../package.json?raw";
import indexHtml from "../index.html?raw";
import viteConfig from "../vite.config.js?raw";
import tsconfig from "../tsconfig.json?raw";
import gitignore from "../.gitignore?raw";
import envExample from "../.env.example?raw";
import readme from "../README.md?raw";

import mainTsx from "./main.tsx?raw";
import appTsx from "./App.tsx?raw";
import storeTsx from "./store.tsx?raw";
import typesTs from "./types.ts?raw";
import providersTs from "./providers.ts?raw";
import manifestTs from "./source-manifest.ts?raw";
import viteEnv from "./vite-env.d.ts?raw";
import indexCss from "./index.css?raw";

import orchestratorTs from "./engine/orchestrator.ts?raw";
import enginesTs from "./engine/engines.ts?raw";
import plannerTs from "./engine/planner.ts?raw";

import registryTs from "./data/registry.ts?raw";

import uiTsx from "./components/ui.tsx?raw";
import shellTsx from "./components/Shell.tsx?raw";
import workflowGraphTsx from "./components/WorkflowGraph.tsx?raw";
import dashboardTsx from "./components/Dashboard.tsx?raw";
import commandCenterTsx from "./components/CommandCenter.tsx?raw";
import goalIntakeTsx from "./components/GoalIntake.tsx?raw";
import viewsTsx from "./components/Views.tsx?raw";
import governanceTsx from "./components/Governance.tsx?raw";
import aiBrainTsx from "./components/AIBrain.tsx?raw";
import insightsTsx from "./components/Insights.tsx?raw";
import chatPanelTsx from "./components/ChatPanel.tsx?raw";
import projectResultTsx from "./components/ProjectResult.tsx?raw";
import providerPanelTsx from "./components/ProviderPanel.tsx?raw";
import toastsTsx from "./components/Toasts.tsx?raw";
import bootTsx from "./components/Boot.tsx?raw";
import architectureTsx from "./components/Architecture.tsx?raw";
import sourcePanelTsx from "./components/SourcePanel.tsx?raw";
import topologyTsx from "./components/Topology.tsx?raw";
import tenancyTsx from "./components/Tenancy.tsx?raw";

import serverMain from "../server/main.py?raw";
import serverWorker from "../server/worker.py?raw";
import serverSchema from "../server/schema.sql?raw";
import dockerCompose from "../docker-compose.yml?raw";

export interface SourceFile {
  path: string;
  content: string;
}

export const SOURCE_FILES: SourceFile[] = [
  { path: "package.json", content: pkgJson },
  { path: "index.html", content: indexHtml },
  { path: "vite.config.js", content: viteConfig },
  { path: "tsconfig.json", content: tsconfig },
  { path: ".gitignore", content: gitignore },
  { path: ".env.example", content: envExample },
  { path: "README.md", content: readme },

  { path: "src/main.tsx", content: mainTsx },
  { path: "src/App.tsx", content: appTsx },
  { path: "src/store.tsx", content: storeTsx },
  { path: "src/types.ts", content: typesTs },
  { path: "src/providers.ts", content: providersTs },
  { path: "src/source-manifest.ts", content: manifestTs },
  { path: "src/vite-env.d.ts", content: viteEnv },
  { path: "src/index.css", content: indexCss },

  { path: "src/engine/orchestrator.ts", content: orchestratorTs },
  { path: "src/engine/engines.ts", content: enginesTs },
  { path: "src/engine/planner.ts", content: plannerTs },

  { path: "src/data/registry.ts", content: registryTs },

  { path: "src/components/ui.tsx", content: uiTsx },
  { path: "src/components/Shell.tsx", content: shellTsx },
  { path: "src/components/WorkflowGraph.tsx", content: workflowGraphTsx },
  { path: "src/components/Dashboard.tsx", content: dashboardTsx },
  { path: "src/components/CommandCenter.tsx", content: commandCenterTsx },
  { path: "src/components/GoalIntake.tsx", content: goalIntakeTsx },
  { path: "src/components/Views.tsx", content: viewsTsx },
  { path: "src/components/Governance.tsx", content: governanceTsx },
  { path: "src/components/AIBrain.tsx", content: aiBrainTsx },
  { path: "src/components/Insights.tsx", content: insightsTsx },
  { path: "src/components/ChatPanel.tsx", content: chatPanelTsx },
  { path: "src/components/ProjectResult.tsx", content: projectResultTsx },
  { path: "src/components/ProviderPanel.tsx", content: providerPanelTsx },
  { path: "src/components/Toasts.tsx", content: toastsTsx },
  { path: "src/components/Boot.tsx", content: bootTsx },
  { path: "src/components/Architecture.tsx", content: architectureTsx },
  { path: "src/components/SourcePanel.tsx", content: sourcePanelTsx },
  { path: "src/components/Topology.tsx", content: topologyTsx },
  { path: "src/components/Tenancy.tsx", content: tenancyTsx },
  { path: "server/main.py", content: serverMain },
  { path: "server/worker.py", content: serverWorker },
  { path: "server/schema.sql", content: serverSchema },
  { path: "docker-compose.yml", content: dockerCompose },
];

export const byteSize = (s: string): number => new TextEncoder().encode(s).length;

export const totalBytes = (): number => SOURCE_FILES.reduce((a, f) => a + byteSize(f.content), 0);

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function groupByFolder(files: SourceFile[]): { folder: string; files: { name: string; bytes: number }[] }[] {
  const map = new Map<string, { name: string; bytes: number }[]>();
  for (const f of files) {
    const idx = f.path.lastIndexOf("/");
    const folder = idx === -1 ? "." : f.path.slice(0, idx);
    const name = idx === -1 ? f.path : f.path.slice(idx + 1);
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder)!.push({ name, bytes: byteSize(f.content) });
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === "." ? -1 : b === "." ? 1 : a.localeCompare(b)))
    .map(([folder, fs]) => ({ folder, files: fs.sort((x, y) => x.name.localeCompare(y.name)) }));
}
