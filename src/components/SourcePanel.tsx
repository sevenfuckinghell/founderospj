import { useState } from "react";
import JSZip from "jszip";
import { Icon, cx } from "./ui";
import { toast } from "./Toasts";
import { SOURCE_FILES, groupByFolder, totalBytes, fmtBytes } from "../source-manifest";

/* ------------------------------------------------------------------ */
/* Source & Export — hands the founder the complete, runnable          */
/* codebase (or the deployable static build) as a download.            */
/* ------------------------------------------------------------------ */

export function SourcePanel() {
  const [srcBusy, setSrcBusy] = useState(false);
  const [distBusy, setDistBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = groupByFolder(SOURCE_FILES);
  const total = totalBytes();

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const downloadSource = async () => {
    setSrcBusy(true);
    try {
      const zip = new JSZip();
      const root = zip.folder("founder-os")!;
      for (const f of SOURCE_FILES) root.file(f.path, f.content);
      root.file(
        "SETUP.txt",
        `FOUNDER OS — SOURCE EXPORT\n==========================\n\n${SOURCE_FILES.length} files · ${fmtBytes(total)} uncompressed\n\nRun the console:\n  npm install\n  npm run dev\n\nBuild it:\n  npm run build   → deployable static app in dist/\n\nRun the full production topology (see README):\n  docker compose up   → web + api + worker + postgres + redis\n\nNo API keys needed for the console — the deterministic demo engine runs\neverything. server/ holds the FastAPI control plane, queue worker,\nPostgres schema and compose file for real deployment.\n`,
      );
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 7 } });
      downloadBlob(blob, "founder-os-source.zip");
      toast("ok", "Source packaged", `${SOURCE_FILES.length} files · ${fmtBytes(blob.size)} zipped — unzip, npm install, npm run dev.`);
    } catch (e) {
      toast("danger", "Packaging failed", e instanceof Error ? e.message : "Unknown error while zipping.");
    } finally {
      setSrcBusy(false);
    }
  };

  const downloadDist = async () => {
    setDistBusy(true);
    try {
      const html = await (await fetch(window.location.href, { cache: "no-store" })).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const assetUrls: string[] = [];
      doc.querySelectorAll("script[src]").forEach((el) => el.getAttribute("src") && assetUrls.push(el.getAttribute("src")!));
      doc.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => el.getAttribute("href") && assetUrls.push(el.getAttribute("href")!));
      const rels = doc.querySelectorAll('link[rel~="icon"][href]');
      rels.forEach((el) => {
        const href = el.getAttribute("href") ?? "";
        if (href && !href.startsWith("data:")) assetUrls.push(href);
      });

      const zip = new JSZip();
      const root = zip.folder("founder-os-dist")!;
      root.file("index.html", html);
      for (const u of [...new Set(assetUrls)]) {
        const res = await fetch(new URL(u, window.location.origin));
        if (!res.ok) throw new Error(`Asset ${u} returned ${res.status}`);
        root.file(u.replace(/^\//, ""), await res.blob());
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBlob(blob, "founder-os-dist.zip");
      toast("ok", "Static build packaged", `${assetUrls.length + 1} files — serves from any static host or CDN.`);
    } catch (e) {
      toast("danger", "Could not package the build", e instanceof Error ? e.message : "Asset fetch failed.");
    } finally {
      setDistBusy(false);
    }
  };

  return (
    <div>
      {/* actions */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button className="btn btn-mint justify-start px-4 py-3" onClick={downloadSource} disabled={srcBusy}>
          <Icon name="box" size={16} />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[13px]">{srcBusy ? "Packaging…" : "Download complete source"}</span>
            <span className="font-body text-[10px] font-normal normal-case tracking-normal text-mint/70">
              founder-os-source.zip · {SOURCE_FILES.length} files · {fmtBytes(total)}
            </span>
          </span>
        </button>
        <button className="btn justify-start px-4 py-3" onClick={downloadDist} disabled={distBusy}>
          <Icon name="zap" size={16} className="text-cy" />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[13px]">{distBusy ? "Fetching assets…" : "Download built app"}</span>
            <span className="font-body text-[10px] font-normal normal-case tracking-normal text-mut">
              founder-os-dist.zip · deployable static build
            </span>
          </span>
        </button>
      </div>

      {/* file tree */}
      <div className="mt-3 max-h-[300px] overflow-y-auto rounded-md border border-line bg-ink-950/70 font-mono text-[11px]">
        {groups.map((g) => {
          const folderBytes = g.files.reduce((a, f) => a + f.bytes, 0);
          const open = expanded === g.folder || expanded === null;
          return (
            <div key={g.folder}>
              <button
                className="group flex w-full items-center gap-2 border-b border-line/60 px-3 py-2 text-left transition-colors hover:bg-ink-800/70"
                onClick={() => setExpanded(open && expanded !== null ? null : g.folder)}
              >
                <Icon name="arrow" size={10} className={cx("text-mut transition-transform", open && "rotate-90")} />
                <Icon name="folder" size={12} className="text-amber/80" />
                <span className="text-sub">{g.folder === "." ? "founder-os/" : g.folder + "/"}</span>
                <span className="ml-auto text-[9.5px] text-mut">
                  {g.files.length} files · {fmtBytes(folderBytes)}
                </span>
              </button>
              {open && (
                <ul>
                  {g.files.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center gap-2 border-b border-line/30 py-1.5 pl-9 pr-3 text-mut transition-all hover:translate-x-0.5 hover:bg-ink-800/40 hover:text-sub"
                    >
                      <span className="h-1 w-1 rounded-full bg-line2" />
                      <span className="truncate">{f.name}</span>
                      <span className="ml-auto shrink-0 text-[9.5px]">{fmtBytes(f.bytes)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* push to github */}
      <div className="mt-3 rounded-md border border-line bg-ink-950/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="panel-title">push everything to github</span>
          <button
            className="btn py-1 text-[10.5px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  "git init -b main\ngit add -A\ngit commit -m \"Founder OS v4.2 — AI operating console\"\ngit remote add origin https://github.com/YOU/founder-os.git\ngit push -u origin main",
                );
                toast("ok", "Commands copied", "Paste them in the unzipped project folder (or run scripts/push-github.bat).");
              } catch {
                toast("warn", "Clipboard blocked", "Select and copy the commands manually.");
              }
            }}
          >
            <Icon name="send" size={11} /> copy commands
          </button>
        </div>
        <pre className="mt-2 overflow-x-auto rounded border border-line/60 bg-ink-900 p-2.5 font-mono text-[10.5px] leading-[1.8] text-sub">
{`git init -b main
git add -A
git commit -m "Founder OS v4.2 — AI operating console"
git remote add origin https://github.com/YOU/founder-os.git
git push -u origin main`}
        </pre>
        <p className="mt-2 text-[10.5px] leading-relaxed text-mut">
          Or one-click on Windows: unzip the source, then double-click{" "}
          <span className="font-mono text-sub">scripts\push-github.bat</span> — it initializes the repo, commits,
          asks for your repo URL and pushes. <span className="font-mono text-sub">.gitignore</span> already excludes{" "}
          <span className="font-mono text-amber/90">.env</span>, keys, <span className="font-mono">node_modules</span> and build output.
          Auth happens via GitHub's browser sign-in or a Personal Access Token.
        </p>
      </div>

      <p className="mt-2.5 text-[10.5px] leading-relaxed text-mut">
        The export is the real thing — every file above is embedded verbatim in this build and zipped in your browser.
        Unzip, <span className="font-mono text-sub">npm install</span>, <span className="font-mono text-sub">npm run dev</span> and you have the full
        console running locally. MIT licensed.
      </p>
    </div>
  );
}
