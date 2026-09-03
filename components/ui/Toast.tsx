'use client';

// Korte terugkoppeling op een handeling. Geen meldingencentrum: wat hier komt
// is vluchtig, en alles wat de merchant moet onthouden hoort in de pagina zelf.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type ToastTone = 'ok' | 'warn' | 'danger';
type Toast = { id: number; tone: ToastTone; message: string };

const ToastContext = createContext<(tone: ToastTone, message: string) => void>(() => {});

const ICONS = { ok: CheckCircle2, warn: Info, danger: AlertTriangle };
const STYLES: Record<ToastTone, string> = {
  ok: 'border-ok/40 bg-ok-soft text-ok',
  warn: 'border-warn/40 bg-warn-soft text-warn',
  danger: 'border-danger/40 bg-danger-soft text-danger',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live zodat een schermlezer de melding meekrijgt zonder focus te stelen. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm shadow-overlay ${STYLES[toast.tone]}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="text-ink">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
