"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Scale, ArrowRight, X } from "lucide-react";
import { getStoredCompareColleges, clearStoredCompareColleges } from "@/lib/api";

export function CompareTray() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [compareIds, setCompareIds] = useState<number[]>(() => getStoredCompareColleges());

  useEffect(() => {
    const handleUpdate = () => {
      setCompareIds(getStoredCompareColleges());
    };

    window.addEventListener("compare-change", handleUpdate);
    return () => window.removeEventListener("compare-change", handleUpdate);
  }, []);

  if (!mounted || compareIds.length === 0) return null;

  const compareUrl = `/compare?colleges=${compareIds.join(",")}`;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-900/95 text-white px-5 py-3.5 shadow-2xl border border-slate-700/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight tabular-nums">
              {compareIds.length}/3 Colleges Selected
            </div>
            <div className="text-xs text-slate-400">
              {compareIds.length < 2 ? "Select at least 2 colleges to compare" : "Ready for side-by-side analysis"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {compareIds.length >= 2 ? (
            <Link
              href={compareUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              <span>Compare</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href={compareUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <span>View (1)</span>
            </Link>
          )}

          <button
            type="button"
            onClick={clearStoredCompareColleges}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Clear all selected colleges"
            aria-label="Clear all selected colleges"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
