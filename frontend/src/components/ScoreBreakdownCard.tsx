"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  MapPin, 
  Bookmark, 
  BookmarkCheck, 
  TrendingUp, 
  ArrowUpRight, 
  Users, 
  Layers, 
  Scale,
  HelpCircle
} from "lucide-react";
import { PredictionItem } from "@/types";
import { ClassificationBadge } from "./ClassificationBadge";
import { api, toggleCompareCollege, getStoredCompareColleges } from "@/lib/api";
import { showToast } from "./Toast";

interface ScoreBreakdownCardProps {
  item: PredictionItem;
  userPercentile?: number;
  onBookmarkToggled?: (collegeId: number, isSaved: boolean) => void;
  isSavedInitial?: boolean;
}

export function ScoreBreakdownCard({
  item,
  onBookmarkToggled,
  isSavedInitial = false
}: ScoreBreakdownCardProps) {
  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [saving, setSaving] = useState(false);
  const [isCompared, setIsCompared] = useState<boolean>(() => getStoredCompareColleges().includes(item.college_id));

  useEffect(() => {
    const handleCompareChange = () => {
      const updated = getStoredCompareColleges();
      setIsCompared(updated.includes(item.college_id));
    };

    window.addEventListener("compare-change", handleCompareChange);
    return () => window.removeEventListener("compare-change", handleCompareChange);
  }, [item.college_id]);

  const handleToggleSave = async () => {
    try {
      setSaving(true);
      if (isSaved) {
        await api.deleteSavedCollege(item.college_id);
        setIsSaved(false);
        onBookmarkToggled?.(item.college_id, false);
        showToast(`Removed ${item.college_name} from saved list`, "info");
      } else {
        await api.saveCollege(item.college_id, item.branch_id, `Recommended as ${item.classification}`);
        setIsSaved(true);
        onBookmarkToggled?.(item.college_id, true);
        showToast(`Saved ${item.college_name} to shortlist`, "success");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update saved college";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompare = () => {
    const res = toggleCompareCollege(item.college_id);
    if (res.maxReached) {
      showToast("Maximum 5 colleges can be compared simultaneously.", "info");
    } else if (res.added) {
      showToast(`Added ${item.college_name} to comparison`, "success");
    } else {
      showToast(`Removed from comparison`, "info");
    }
  };

  const deltaPositive = item.delta >= 0;

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
      {/* Top row: College, Location, Save & Compare */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <ClassificationBadge classification={item.classification} size="sm" />
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <MapPin className="h-3 w-3 text-slate-400" />
              {item.city}, {item.district}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {item.region}
            </span>
          </div>

          <Link
            href={`/colleges/${item.college_slug || item.college_id}`}
            className="text-base font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 transition-colors line-clamp-2"
          >
            {item.college_name}
          </Link>
        </div>

        {/* Action Buttons: Bookmark & Compare */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleToggleCompare}
            title={isCompared ? "Remove from comparison" : "Add to comparison"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              isCompared
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Scale className="h-4 w-4" />
          </button>

          <button
            onClick={handleToggleSave}
            disabled={saving}
            title={isSaved ? "Saved in Shortlist" : "Save to Shortlist"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              isSaved
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Branch & Category */}
      <div className="mb-3.5 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
            <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{item.branch_name}</span>
          </span>
          <span className="rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ml-2">
            {item.seat_type_code}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          Category: {item.branch_category} • {item.seat_type_description}
        </div>
      </div>

      {/* Numerical Data Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5 text-center">
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cutoff (Min)</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
            {item.min_cutoff.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400">Historical Min</div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cohort Mean</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
            {item.mean_cutoff.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400">Average Admitted</div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Score Margin</div>
          <div
            className={`text-sm font-bold tabular-nums ${
              deltaPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {deltaPositive ? `+${item.delta.toFixed(2)}` : item.delta.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400">vs Your Score</div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Seats Sampled</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 tabular-nums">
            <Users className="h-3 w-3 text-slate-400" />
            {item.count}
          </div>
          <div className="text-[10px] text-slate-400">Historical Cohort</div>
        </div>
      </div>

      {/* Explainable Rationale Callout */}
      {item.explanation && (
        <div className="mb-3.5 rounded-lg bg-indigo-50/60 p-2.5 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/40 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
          <HelpCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
            <span>{item.explanation}</span>
          </div>
        </div>
      )}

      {/* Recommendation Score Bar */}
      <div className="mb-3.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Recommendation Score:
            <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-0.5 tabular-nums">
              {item.recommendation_score.toFixed(0)}/100
            </span>
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {item.admission_chance_label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              item.classification === "Safe"
                ? "bg-emerald-500"
                : item.classification === "Moderate"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(10, item.recommendation_score))}%` }}
          />
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          Max Admitted: {item.max_cutoff.toFixed(2)}%
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleCompare}
            className={`font-semibold transition-colors flex items-center gap-1 ${
              isCompared ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            {isCompared ? "Comparing" : "Compare"}
          </button>
          <Link
            href={`/colleges/${item.college_slug || item.college_id}`}
            className="inline-flex items-center gap-0.5 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
          >
            Details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
