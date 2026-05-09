"use client";

import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
  visible: boolean;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneClass(tone: ToastTone): string {
  if (tone === "success") {
    return "dash-toast dash-toast--success";
  }
  if (tone === "error") {
    return "dash-toast dash-toast--error";
  }
  if (tone === "warning") {
    return "dash-toast dash-toast--warning";
  }
  return "dash-toast dash-toast--info";
}

function toneIcon(tone: ToastTone) {
  if (tone === "success") return <CheckCircle2 size={18} className="shrink-0 text-emerald-600" strokeWidth={2} />;
  if (tone === "error") return <TriangleAlert size={18} className="shrink-0 text-rose-600" strokeWidth={2} />;
  if (tone === "warning") return <AlertTriangle size={18} className="shrink-0 text-amber-600" strokeWidth={2} />;
  return <Info size={18} className="shrink-0 text-sky-700" strokeWidth={2} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 300);
  }, []);

  const pushToast = useCallback(
    ({ title, description, tone = "info", durationMs = 3600 }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: ToastItem = { id, title, description, tone, durationMs, visible: false };
      setToasts((prev) => [...prev, item]);
      window.setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: true } : t)));
      }, 10);
      window.setTimeout(() => removeToast(id), durationMs);
    },
    [removeToast],
  );

  const value = useMemo<ToastContextValue>(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-4 right-4 top-4 z-[220] flex max-w-none flex-col gap-3 pt-[env(safe-area-inset-top)] sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm sm:pt-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto overflow-hidden rounded-2xl p-4 font-dash backdrop-blur-md transition-all duration-300 motion-reduce:transition-none ${toneClass(toast.tone)} ${
              toast.visible
                ? "translate-x-0 translate-y-0 opacity-100"
                : "-translate-y-2 translate-x-3 opacity-0 sm:translate-x-4"
            }`}
          >
            <div className="flex gap-3">
              <span className="mt-0.5">{toneIcon(toast.tone)}</span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold leading-snug tracking-tight">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs font-medium leading-relaxed opacity-90">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-current/50 transition hover:bg-black/[0.06] hover:text-current"
                aria-label="Dismiss notification"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}
