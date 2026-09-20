"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  text: string;
}

let toastListeners: Array<(msg: ToastMessage) => void> = [];

export function showToast(text: string, type: "success" | "error" | "info" | "warning" = "success") {
  const msg: ToastMessage = {
    id: Math.random().toString(36).substring(2, 9),
    type,
    text
  };
  toastListeners.forEach((l) => l(msg));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 4000);
    };

    toastListeners.push(handleToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== handleToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 ${
            t.type === "success"
              ? "bg-emerald-950/90 text-emerald-100 border-emerald-700/60"
              : t.type === "error"
              ? "bg-rose-950/90 text-rose-100 border-rose-700/60"
              : t.type === "warning"
              ? "bg-amber-950/90 text-amber-100 border-amber-700/60"
              : "bg-slate-900/90 text-slate-100 border-slate-700/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />}
            {t.type === "info" && <Info className="h-5 w-5 text-sky-400 shrink-0" />}
            <span className="text-sm font-medium leading-snug">{t.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
