"use client";

import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = {
    toast,
    success: (m, d) => toast(m, "success", d),
    error: (m, d) => toast(m, "error", d ?? 6000),
    info: (m, d) => toast(m, "info", d),
    warning: (m, d) => toast(m, "warning", d),
  };

  const styles = {
    success: "border-accent bg-accent-light text-accent-dark",
    error: "border-danger bg-red-50 text-danger",
    warning: "border-amber bg-amber/10 text-amber",
    info: "border-info bg-blue-50 text-info",
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[900] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start justify-between gap-3 rounded-xl border-l-4 bg-white px-4 py-3 text-sm font-medium shadow-pop ${styles[t.type]}`}
            role="alert"
          >
            <span className="break-words">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
