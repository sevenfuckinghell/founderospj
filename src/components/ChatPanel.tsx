import { useEffect, useRef, useState } from "react";
import { useOS, useActions } from "../store";
import { Icon, cx } from "./ui";
import { fmtClock } from "../engine/engines";

const QUICK = [
  "Show me what the AI is working on",
  "Show me the biggest project risks",
  "Why is Customer Discovery Interviews waiting?",
  "Reprioritize the roadmap",
  "Create a marketing plan",
  "Review the architecture",
  "Pause all executions",
];

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useOS();
  const a = useActions();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.chat.length, open]);

  const send = (t?: string) => {
    const msg = (t ?? text).trim();
    if (!msg) return;
    a.chat(msg);
    setText("");
  };

  return (
    <>
      {/* backdrop */}
      <div
        className={cx("fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-[2px] transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
      />
      <aside
        className={cx(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-line bg-ink-900 shadow-[-30px_0_60px_rgba(0,0,0,0.45)] transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
          <div className="grid h-8 w-8 place-items-center rounded-md border border-mint/30 bg-mint/10 text-mint">
            <Icon name="terminal" size={15} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-[13.5px] font-bold tracking-wide">Founder Console</h2>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mut">commands invoke real system functions</p>
          </div>
          <span className="chip border-amber/30 text-amber">ctrl/⌘ K</span>
          <button className="btn btn-ghost px-2 py-1" onClick={onClose} title="Close">
            <Icon name="x" size={15} />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {s.chat.map((m) => (
            <div key={m.id} className={cx("flex", m.role === "founder" ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[88%] rounded-lg border px-3 py-2.5",
                  m.role === "founder"
                    ? "rounded-br-sm border-line2 bg-ink-750 text-[12.5px]"
                    : "slide-in rounded-bl-sm border-mint/20 bg-ink-850",
                )}
              >
                {m.role === "os" && (
                  <p className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-mint/80">founder/os · {fmtClock(m.ts)}</p>
                )}
                <p className={cx("whitespace-pre-wrap text-[12px] leading-relaxed", m.role === "founder" ? "text-txt" : "text-sub")}>{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line p-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button key={q} className="chip cursor-pointer transition-colors hover:border-mint/40 hover:text-mint" onClick={() => send(q)}>
                {q.length > 34 ? q.slice(0, 33) + "…" : q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono text-[12px]"
              placeholder='e.g. "why is testing blocked?" or "pause all executions"'
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn btn-mint px-3.5" onClick={() => send()} title="Send">
              <Icon name="send" size={14} />
            </button>
          </div>
          <p className="mt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.14em] text-mut">
            no pretending — unknown commands get an honest fallback, try “help”
          </p>
        </div>
      </aside>
    </>
  );
}
