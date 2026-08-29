import { useEffect, useState } from "react";
import { Icon, cx } from "./ui";

/* Global feedback layer — every meaningful action answers back. */

export type ToastKind = "ok" | "info" | "warn" | "danger";
interface ToastItem { id: number; kind: ToastKind; title: string; desc?: string }

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let counter = 1;

export function toast(kind: ToastKind, title: string, desc?: string) {
  const item: ToastItem = { id: counter++, kind, title, desc };
  listeners.forEach((l) => l(item));
}

const KIND_META: Record<ToastKind, { icon: string; bar: string; text: string }> = {
  ok:     { icon: "check",  bar: "bg-mint",  text: "text-mint" },
  info:   { icon: "zap",    bar: "bg-cy",    text: "text-cy" },
  warn:   { icon: "shield", bar: "bg-amber", text: "text-amber" },
  danger: { icon: "alert",  bar: "bg-coral", text: "text-coral" },
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast: Listener = (t) => {
      setItems((prev) => [...prev.slice(-3), t]);
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4600);
    };
    listeners.add(onToast);
    return () => { listeners.delete(onToast); };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[340px] flex-col gap-2">
      {items.map((t) => {
        const m = KIND_META[t.kind];
        return (
          <div
            key={t.id}
            className="toast-in pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-line2 bg-ink-850/95 p-3 pr-4 shadow-[0_14px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm"
          >
            <span className={cx("absolute inset-y-0 left-0 w-[3px]", m.bar)} />
            <span className={cx("mt-0.5 shrink-0", m.text)}>
              <Icon name={m.icon} size={15} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[12.5px] font-semibold leading-snug tracking-wide">{t.title}</p>
              {t.desc && <p className="mt-0.5 text-[11px] leading-snug text-sub">{t.desc}</p>}
            </div>
            <button
              className="ml-auto shrink-0 text-mut transition-colors hover:text-txt"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="dismiss"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
