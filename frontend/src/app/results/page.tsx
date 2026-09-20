"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  RefreshCw, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  ArrowUpDown, 
  Share2, 
  LayoutGrid, 
  List as ListIcon,
  ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { PredictResponse } from "@/types";
import { ScoreBreakdownCard } from "@/components/ScoreBreakdownCard";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { showToast } from "@/components/Toast";

function ResultsContent() {
  const searchParams = useSearchParams();

  // URL Params
  const percentileParam = searchParams.get("percentile");
  const scoreType = searchParams.get("score_type") || "MHT-CET";
  const seatType = searchParams.get("seat_type") || "GOPENS";
  const branchesParam = searchParams.get("branches");
  const districtsParam = searchParams.get("districts");

  const percentile = percentileParam ? parseFloat(percentileParam) : 92.5;

  // Filters & Controls
  const [activeTab, setActiveTab] = useState<"All" | "Safe" | "Moderate" | "Reach">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("recommendation_score");
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // State
  const [data, setData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let ignore = false;
    const branchesList = branchesParam ? branchesParam.split(",").map((b) => b.trim()) : undefined;
    const districtsList = districtsParam ? districtsParam.split(",").map((d) => d.trim()) : undefined;

    api.predict({
      percentile,
      score_type: scoreType,
      seat_type: seatType,
      preferred_branches: branchesList,
      preferred_districts: districtsList,
      classification: activeTab === "All" ? undefined : activeTab,
      sort_by: sortBy,
      page,
      page_size: pageSize
    })
      .then((res) => {
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.error("Prediction error:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch college recommendations.");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [percentile, scoreType, seatType, activeTab, sortBy, page, branchesParam, districtsParam, reloadTrigger]);

  // Client-side search filtering within loaded results
  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    if (!searchQuery.trim()) return data.results;
    const q = searchQuery.toLowerCase().trim();
    return data.results.filter(
      (item) =>
        item.college_name.toLowerCase().includes(q) ||
        item.branch_name.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Results URL copied to clipboard!", "success");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Header & Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                CETCompass Discovery
              </span>
              <span className="text-xs text-slate-500">• 28,377 Historical Cutoffs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Your CETCompass Recommendations
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Matched for <strong className="text-slate-900 dark:text-white">{percentile.toFixed(2)}%ile</strong> • Category: <strong className="text-slate-900 dark:text-white">{seatType}</strong> • Exam: <strong className="text-slate-900 dark:text-white">{scoreType}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share URL
            </button>

            <Link
              href="/predictor"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Edit Preferences
            </Link>
          </div>
        </div>

        {/* Informative Guidance Notice */}
        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-slate-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-slate-300 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold text-slate-900 dark:text-white block sm:inline mr-1">
              Admission Guidance Notice:
            </strong>
            Recommendations are based on historical cutoff data and your entered CET profile. They are not a guarantee of admission.
          </div>
        </div>

        {/* Summary Counter Cards (Safe, Moderate, Reach) */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => { setActiveTab("Safe"); setPage(1); }}
              className={`rounded-xl p-4 sm:p-5 border text-left transition-colors ${
                activeTab === "Safe"
                  ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-500"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Safe Options</span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {data.summary.safe_count}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                Comfortably above cutoff (&ge; +3.0% margin). High allotment probability.
              </p>
            </button>

            <button
              onClick={() => { setActiveTab("Moderate"); setPage(1); }}
              className={`rounded-xl p-4 sm:p-5 border text-left transition-colors ${
                activeTab === "Moderate"
                  ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-1 ring-amber-500"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Moderate / Target</span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {data.summary.moderate_count}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                Close to cutoff margin (0.0 to +3.0%). Solid target choices for CAP.
              </p>
            </button>

            <button
              onClick={() => { setActiveTab("Reach"); setPage(1); }}
              className={`rounded-xl p-4 sm:p-5 border text-left transition-colors ${
                activeTab === "Reach"
                  ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-1 ring-rose-500"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-rose-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Reach / Ambitious</span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {data.summary.reach_count}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                Slightly above your score (within 4.0%tile). Worth subsequent rounds.
              </p>
            </button>
          </div>
        )}

        {/* Toolbar: Tabs, Search, Sort & View Mode */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 mb-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Classification Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(["All", "Safe", "Moderate", "Reach"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white font-bold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab} {tab === "All" && data ? `(${data.summary.total_matches})` : ""}
              </button>
            ))}
          </div>

          {/* Search, Sort, View Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search within results */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by college or branch..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="recommendation_score">Recommendation Score (High to Low)</option>
                <option value="min_cutoff_desc">Cutoff Percentile (High to Low)</option>
                <option value="min_cutoff_asc">Cutoff Percentile (Low to High)</option>
                <option value="college_name">College Name (A - Z)</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-400 hover:text-slate-600"}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-400 hover:text-slate-600"}`}
                title="List View"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/40">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200">Unable to load recommendations</h4>
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Query
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && <CardSkeleton count={6} />}

        {/* Empty State */}
        {!loading && !error && filteredResults.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-3.5">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No matching colleges found
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              No cutoff records match the current combination of percentile ({percentile}%ile), category ({seatType}), and filters. Try adjusting your category or exploring other regions.
            </p>
            <div className="mt-5 flex justify-center gap-2.5">
              <Link
                href="/predictor"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Modify Predictor Filters
              </Link>
              <button
                onClick={() => { setActiveTab("All"); setSearchQuery(""); }}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Results Cards */}
        {!loading && !error && filteredResults.length > 0 && (
          <div
            className={`grid gap-6 mb-8 ${
              viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            }`}
          >
            {filteredResults.map((item, idx) => (
              <ScoreBreakdownCard
                key={`${item.college_id}-${item.branch_id}-${idx}`}
                item={item}
                userPercentile={percentile}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="text-xs text-slate-500">
              Showing page <strong className="text-slate-900 dark:text-white">{data.page}</strong> of{" "}
              <strong className="text-slate-900 dark:text-white">{data.total_pages}</strong> ({data.summary.total_matches} total matches)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer Footer */}
        {data?.disclaimer && (
          <div className="mt-10 rounded-2xl bg-slate-100/80 p-5 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Admission Guidance Notice: </span>
              {data.disclaimer}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center"><CardSkeleton count={6} /></div>}>
      <ResultsContent />
    </Suspense>
  );
}
