"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { 
  Building2, 
  MapPin, 
  Bookmark, 
  BookmarkCheck, 
  Scale, 
  Search, 
  Layers, 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Info
} from "lucide-react";
import { api, toggleCompareCollege, getStoredCompareColleges } from "@/lib/api";
import { CollegeDetail, CutoffSummary } from "@/types";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { showToast } from "@/components/Toast";

// Independent recommendation scoring formulation strictly matching backend/app/services/recommendation_service.py
function evaluateRecommendation(percentile: number, cutoff: CutoffSummary) {
  const gap = percentile - cutoff.min_cutoff;
  const meanGap = percentile - cutoff.mean_cutoff;

  // 1. Classification
  let classification: "Safe" | "Moderate" | "Reach" | "Unlikely" = "Unlikely";
  if (gap >= 3.0 || percentile >= cutoff.mean_cutoff) {
    classification = "Safe";
  } else if (gap >= 0.0) {
    classification = "Moderate";
  } else if (gap >= -4.0) {
    classification = "Reach";
  } else {
    classification = "Unlikely";
  }

  // 2. Score (5.0 to 99.0)
  // Margin (0 to 50)
  let marginScore = 15.0;
  if (gap >= 10.0) {
    marginScore = 50.0;
  } else if (gap >= 0.0) {
    marginScore = 35.0 + (gap / 10.0) * 15.0;
  } else if (gap >= -4.0) {
    marginScore = 15.0 + ((gap + 4.0) / 4.0) * 20.0;
  } else {
    marginScore = Math.max(5.0, 15.0 + gap * 2.0);
  }

  // Mean proximity (0 to 25)
  let meanScore = 15.0;
  if (meanGap >= 0.0) {
    meanScore = 20.0 + Math.min(5.0, meanGap * 0.5);
  } else {
    meanScore = Math.max(5.0, 20.0 + meanGap * 1.5);
  }

  // Stability confidence (0 to 15)
  let confidenceScore = 10.0;
  if (cutoff.count >= 15) confidenceScore = 15.0;
  else if (cutoff.count >= 5) confidenceScore = 12.0;
  else if (cutoff.count >= 2) confidenceScore = 10.0;
  else confidenceScore = 7.0;

  // Range cushion (0 to 10)
  const rangeSpread = cutoff.range_cutoff ?? (cutoff.max_cutoff - cutoff.min_cutoff);
  const cushionScore = Math.min(10.0, 5.0 + rangeSpread * 0.2);

  const rawScore = marginScore + meanScore + confidenceScore + cushionScore;
  const score = Math.max(5.0, Math.min(99.0, Number(rawScore.toFixed(1))));

  // Factual explanation
  let explanation = "";
  if (classification === "Safe") {
    if (percentile >= cutoff.mean_cutoff) {
      explanation = `Your percentile of ${percentile.toFixed(2)} is ${gap >= 0 ? "+" : ""}${gap.toFixed(2)} points above the historical minimum cutoff (${cutoff.min_cutoff.toFixed(2)}) and exceeds the admitted cohort average (${cutoff.mean_cutoff.toFixed(2)}).`;
    } else {
      explanation = `Your percentile of ${percentile.toFixed(2)} is +${gap.toFixed(2)} points above the historical minimum cutoff (${cutoff.min_cutoff.toFixed(2)}), providing a favorable safety margin.`;
    }
  } else if (classification === "Moderate") {
    explanation = `Your percentile of ${percentile.toFixed(2)} is close to the historical minimum cutoff (${cutoff.min_cutoff.toFixed(2)}) with a ${gap >= 0 ? "+" : ""}${gap.toFixed(2)} point margin, making this a realistic, competitive target.`;
  } else if (classification === "Reach") {
    explanation = `Your percentile of ${percentile.toFixed(2)} is ${Math.abs(gap).toFixed(2)} points below the historical minimum cutoff (${cutoff.min_cutoff.toFixed(2)}). This represents an ambitious choice that may become viable in subsequent CAP rounds.`;
  } else {
    explanation = `Your percentile of ${percentile.toFixed(2)} is ${Math.abs(gap).toFixed(2)} points below the historical minimum cutoff (${cutoff.min_cutoff.toFixed(2)}), indicating high admission deficit based on available statistics.`;
  }

  return { classification, score, gap, meanGap, explanation, rangeSpread };
}

export default function CollegeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const collegeIdOrSlug = resolvedParams.id;

  const [college, setCollege] = useState<CollegeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"cutoffs" | "recommendations" | "charts" | "branches">("cutoffs");

  // Filters within the college profile
  const [selectedSeatType, setSelectedSeatType] = useState<string>("GOPENS");
  const [selectedScoreType, setSelectedScoreType] = useState<string>("MHT-CET");
  const [branchSearch, setBranchSearch] = useState<string>("");
  const [recommendationFilter, setRecommendationFilter] = useState<string>("all");

  // Interactive Student Percentile Evaluator
  const [studentPercentile, setStudentPercentile] = useState<string>("92.50");

  // Chart state: selected branch for quota variation chart
  const [chartBranchName, setChartBranchName] = useState<string>("");

  // Bookmark & Compare state
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isCompared, setIsCompared] = useState<boolean>(false);
  const [compareCount, setCompareCount] = useState<number>(0);

  useEffect(() => {
    api.getCollegeDetail(collegeIdOrSlug)
      .then((data) => {
        setCollege(data);
        if (data.available_seat_types.length > 0 && !data.available_seat_types.includes("GOPENS")) {
          setSelectedSeatType(data.available_seat_types[0]);
        }
        if (data.available_branches.length > 0) {
          setChartBranchName(data.available_branches[0]);
        }
        // Check if saved
        api.getSavedColleges().then((saved) => {
          setIsSaved(saved.some((s) => s.college_id === data.id));
        }).catch(() => {});
        // Check compare state
        const compList = getStoredCompareColleges();
        setIsCompared(compList.includes(data.id));
        setCompareCount(compList.length);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "College not found");
      })
      .finally(() => setLoading(false));

    const handleCompareUpdate = () => {
      const compList = getStoredCompareColleges();
      setCompareCount(compList.length);
      setCollege((currentCollege) => {
        if (currentCollege) {
          setIsCompared(compList.includes(currentCollege.id));
        }
        return currentCollege;
      });
    };
    window.addEventListener("compare-change", handleCompareUpdate);
    return () => window.removeEventListener("compare-change", handleCompareUpdate);
  }, [collegeIdOrSlug]);

  const handleToggleSave = async () => {
    if (!college) return;
    try {
      if (!isSaved) {
        await api.saveCollege(college.id, undefined, "Bookmarked from college details");
        setIsSaved(true);
        showToast(`Saved ${college.name} to shortlist!`, "success");
      } else {
        await api.deleteSavedCollege(college.id);
        setIsSaved(false);
        showToast(`Removed from saved shortlist`, "info");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update bookmark", "error");
    }
  };

  const handleToggleCompare = () => {
    if (!college) return;
    const res = toggleCompareCollege(college.id);
    if (res.maxReached) {
      showToast("Maximum 3 colleges can be compared simultaneously.", "info");
    } else if (res.added) {
      showToast(`Added ${college.name} to comparison tray (up to 3)`, "success");
      setIsCompared(true);
    } else {
      showToast(`Removed from comparison`, "info");
      setIsCompared(false);
    }
    setCompareCount(getStoredCompareColleges().length);
  };

  const parsedPercentile = parseFloat(studentPercentile) || 0;

  // Filter cutoffs by selected seat type, score type, and branch search
  const filteredCutoffs = useMemo(() => {
    if (!college) return [];
    return college.cutoffs.filter((c) => {
      const matchScore = selectedScoreType ? c.score_type === selectedScoreType : true;
      const matchSeat = selectedSeatType ? c.seat_type_code === selectedSeatType : true;
      const matchBranch = branchSearch ? c.branch_name.toLowerCase().includes(branchSearch.toLowerCase()) : true;
      return matchScore && matchSeat && matchBranch;
    });
  }, [college, selectedScoreType, selectedSeatType, branchSearch]);

  // Evaluated cutoffs for recommendation context
  const evaluatedCutoffs = useMemo(() => {
    if (!college) return [];
    return college.cutoffs
      .filter((c) => (selectedSeatType ? c.seat_type_code === selectedSeatType : true) && (selectedScoreType ? c.score_type === selectedScoreType : true))
      .map((c) => ({
        ...c,
        evaluation: evaluateRecommendation(parsedPercentile, c)
      }))
      .filter((item) => {
        if (recommendationFilter === "all") return true;
        return item.evaluation.classification.toLowerCase() === recommendationFilter.toLowerCase();
      })
      .sort((a, b) => b.evaluation.score - a.evaluation.score);
  }, [college, selectedSeatType, selectedScoreType, parsedPercentile, recommendationFilter]);

  // Group branches by category for academic catalog
  const branchesByCategory = useMemo(() => {
    if (!college) return {};
    const map: Record<string, Set<string>> = {};
    college.cutoffs.forEach((c) => {
      const cat = c.branch_category || "General Engineering";
      if (!map[cat]) map[cat] = new Set();
      map[cat].add(c.branch_name);
    });
    const result: Record<string, string[]> = {};
    Object.keys(map).sort().forEach((k) => {
      result[k] = Array.from(map[k]).sort();
    });
    return result;
  }, [college]);

  // Quota breakdown for selected branch in the chart
  const branchQuotaCutoffs = useMemo(() => {
    if (!college || !chartBranchName) return [];
    return college.cutoffs.filter((c) => c.branch_name === chartBranchName && c.score_type === selectedScoreType);
  }, [college, chartBranchName, selectedScoreType]);

  // Summary counts for recommendation classifications
  const recommendationCounts = useMemo(() => {
    if (!college) return { safe: 0, moderate: 0, reach: 0, unlikely: 0, total: 0 };
    const relevant = college.cutoffs.filter(
      (c) => (selectedSeatType ? c.seat_type_code === selectedSeatType : true) && (selectedScoreType ? c.score_type === selectedScoreType : true)
    );
    let safe = 0, moderate = 0, reach = 0, unlikely = 0;
    relevant.forEach((c) => {
      const evalRes = evaluateRecommendation(parsedPercentile, c);
      if (evalRes.classification === "Safe") safe++;
      else if (evalRes.classification === "Moderate") moderate++;
      else if (evalRes.classification === "Reach") reach++;
      else unlikely++;
    });
    return { safe, moderate, reach, unlikely, total: relevant.length };
  }, [college, selectedSeatType, selectedScoreType, parsedPercentile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="h-44 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <TableSkeleton rows={8} cols={5} />
        </div>
      </div>
    );
  }

  if (error || !college) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">College Not Found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error || "The college identifier does not match any record in the verified database."}
          </p>
          <Link
            href="/colleges"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Colleges Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/colleges"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Colleges Directory
          </Link>

          {compareCount > 0 && (
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Comparison Tray ({compareCount}/3)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Hero College Header Card (Strictly DB Fields: Name, Code, City, District, Region, Status) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  {college.status}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {college.city}, {college.district} ({college.region})
                </span>
                {college.code && (
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    DTE Code: {college.code}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {college.name}
              </h1>

              {/* Verified Institutional Dimensions from Database */}
              <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-medium">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  <span>{college.available_branches.length} Engineering Disciplines</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span>{college.available_seat_types.length} Centralized Seat Quotas</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  <span>{college.cutoffs.length} Historical Cutoff Records</span>
                </div>
              </div>
            </div>

            {/* Header Actions: Save & Add to Compare (Up to 3) */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleCompare}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isCompared
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                {isCompared ? "In Comparison" : "Add to Compare"}
              </button>

              <button
                type="button"
                onClick={handleToggleSave}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isSaved
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-indigo-600" /> : <Bookmark className="h-3.5 w-3.5 text-slate-400" />}
                {isSaved ? "Saved" : "Save College"}
              </button>
            </div>

          </div>

          {/* Database Integrity Notice */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              All statistics are drawn strictly from official Maharashtra State CET Cell CAP round admissions data. No artificial rankings, fictitious placement claims, or unverified fees are displayed.
            </span>
          </div>
        </div>

        {/* Global Filter & Percentile Input Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            
            {/* Student Percentile Input */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Test Your Percentile
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={studentPercentile}
                  onChange={(e) => setStudentPercentile(e.target.value)}
                  placeholder="e.g. 92.50"
                  className="w-full bg-transparent font-bold text-slate-900 dark:text-white text-sm focus:outline-none tabular-nums"
                />
              </div>
              <span className="text-xs font-semibold text-slate-400 pr-1">%</span>
            </div>

            {/* Score Type Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Examination Channel
              </label>
              <select
                value={selectedScoreType}
                onChange={(e) => setSelectedScoreType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="MHT-CET">MHT-CET (State Merit Percentile)</option>
                <option value="JEE Main">JEE Main (All India Percentile)</option>
              </select>
            </div>

            {/* Seat Category Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Seat Quota Category
              </label>
              <select
                value={selectedSeatType}
                onChange={(e) => setSelectedSeatType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {college.available_seat_types.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("cutoffs")}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "cutoffs"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Historical Cutoff Statistics ({filteredCutoffs.length})
          </button>

          <button
            onClick={() => setActiveTab("recommendations")}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "recommendations"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Recommendation Context
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              {recommendationCounts.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("charts")}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "charts"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Visual Cutoff Charts
          </button>

          <button
            onClick={() => setActiveTab("branches")}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "branches"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            Offered Disciplines & Quotas ({college.available_branches.length})
          </button>
        </div>

        {/* TAB 1: HISTORICAL CUTOFF STATISTICS TABLE */}
        {activeTab === "cutoffs" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  Cutoff Thresholds by Discipline
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing historical minimum, mean, maximum cutoffs, range spread, and sampled cohort size for {selectedSeatType} ({selectedScoreType}).
                </p>
              </div>

              {/* Branch Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="Filter branch (e.g. Computer, IT)..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Cutoffs Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4 font-bold min-w-[200px]">Branch Discipline</th>
                    <th className="py-3 px-3 font-bold">Quota</th>
                    <th className="py-3 px-3 font-bold text-center">Min Cutoff</th>
                    <th className="py-3 px-3 font-bold text-center">Cohort Mean</th>
                    <th className="py-3 px-3 font-bold text-center">Max Cutoff</th>
                    <th className="py-3 px-3 font-bold text-center">Cutoff Range (Spread)</th>
                    <th className="py-3 px-3 font-bold text-center">Sampled Seats</th>
                    <th className="py-3 px-4 font-bold text-center">Match ({studentPercentile}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCutoffs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <Search className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No cutoffs found</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">No historical cutoffs match your filter. Try clearing the search or changing quota.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCutoffs.map((row) => {
                      const spread = row.range_cutoff ?? (row.max_cutoff - row.min_cutoff);
                      const evalResult = evaluateRecommendation(parsedPercentile, row);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            <div>{row.branch_name}</div>
                            <div className="text-[10px] text-slate-400">{row.branch_category}</div>
                          </td>
                          <td className="py-3 px-3 font-medium">
                            <span 
                              className="rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 font-bold cursor-help"
                              title={row.seat_type_description || row.seat_type_code}
                            >
                              {row.seat_type_code}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                            {row.min_cutoff.toFixed(2)}%
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                            {row.mean_cutoff.toFixed(2)}%
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 tabular-nums">
                            {row.max_cutoff.toFixed(2)}%
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400 font-medium tabular-nums">
                            {spread.toFixed(2)}%
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 font-medium tabular-nums">
                            {row.count}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <ClassificationBadge classification={evalResult.classification} size="sm" />
                            <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                              {evalResult.gap >= 0 ? `+${evalResult.gap.toFixed(2)}% margin` : `${evalResult.gap.toFixed(2)}% deficit`}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RECOMMENDATION CONTEXT (Deterministic Algorithmic Evaluation) */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            
            {/* Context Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-4">
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Safe Matches
                </div>
                <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1 tabular-nums">
                  {recommendationCounts.safe}
                </div>
                <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                  Margin ≥ +3.00% or exceeds mean
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/30 p-4">
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Moderate Targets
                </div>
                <div className="text-2xl font-black text-indigo-800 dark:text-indigo-200 mt-1 tabular-nums">
                  {recommendationCounts.moderate}
                </div>
                <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/70 mt-0.5">
                  Cleared historical cutoff (0 to 3%)
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30 p-4">
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Reach Options
                </div>
                <div className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-1 tabular-nums">
                  {recommendationCounts.reach}
                </div>
                <div className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                  Within -4.00% deficit (Round 2/3)
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Evaluated Disciplines
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {recommendationCounts.total}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  For {selectedSeatType} quota
                </div>
              </div>
            </div>

            {/* Classification Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Filter Match:</span>
              {[
                { id: "all", label: "All Evaluated" },
                { id: "safe", label: `Safe (${recommendationCounts.safe})` },
                { id: "moderate", label: `Moderate (${recommendationCounts.moderate})` },
                { id: "reach", label: `Reach (${recommendationCounts.reach})` },
                { id: "unlikely", label: `Unlikely (${recommendationCounts.unlikely})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRecommendationFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    recommendationFilter === tab.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List of Evaluated Branches */}
            <div className="space-y-4">
              {evaluatedCutoffs.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  No branches found matching the selected recommendation classification.
                </div>
              ) : (
                evaluatedCutoffs.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 transition-all dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.branch_name}
                          </span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            {item.branch_category}
                          </span>
                          <span className="rounded bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                            Quota: {item.seat_type_code}
                          </span>
                        </div>

                        {/* Factual Explanation from Algorithm */}
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {item.evaluation.explanation}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          <span>Historical Min: <strong className="tabular-nums">{item.min_cutoff.toFixed(2)}%</strong></span>
                          <span>Cohort Mean: <strong className="tabular-nums">{item.mean_cutoff.toFixed(2)}%</strong></span>
                          <span>Cutoff Range: <strong className="tabular-nums">{item.evaluation.rangeSpread.toFixed(2)}%</strong></span>
                          <span>Sample Size: <strong className="tabular-nums">{item.count} seats</strong> ({item.count >= 15 ? "High Confidence" : item.count >= 5 ? "Moderate Sample" : "Low Volatility Risk"})</span>
                        </div>
                      </div>

                      {/* Right: Badge & Score */}
                      <div className="flex items-center gap-4 self-start md:self-center shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Match Score</div>
                          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                            {item.evaluation.score} <span className="text-[10px] font-medium text-slate-400">/ 99</span>
                          </div>
                        </div>

                        <div>
                          <ClassificationBadge classification={item.evaluation.classification} size="md" />
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Non-Guarantee Education Disclaimer */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong>Admissions Guidance Disclaimer:</strong> Recommendations are calculated mathematically using verified historical CAP round cutoff records. Cutoffs shift annually based on student applicant volume, examination difficulty, and seat capacity revisions. These statistics do not guarantee admission.
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: VISUAL CUTOFF CHARTS */}
        {activeTab === "charts" && (
          <div className="space-y-6">
            
            {/* Chart 1: Branch Cutoffs Distribution & Spread */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                    Branch Cutoff Distribution & Spread ({selectedSeatType})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comparing Minimum Entry Cutoff, Admitted Cohort Mean, and Maximum Cutoff across offered disciplines.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    <span className="text-slate-600 dark:text-slate-300">Min Cutoff</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-300">Cohort Mean</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">Max Cutoff</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Bar Chart */}
              {filteredCutoffs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No data available for the chosen seat quota and score type.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {filteredCutoffs.slice(0, 10).map((row) => {
                    const minPct = Math.max(0, Math.min(100, row.min_cutoff));
                    const meanPct = Math.max(0, Math.min(100, row.mean_cutoff));
                    const maxPct = Math.max(0, Math.min(100, row.max_cutoff));
                    const spread = row.range_cutoff ?? (row.max_cutoff - row.min_cutoff);

                    return (
                      <div key={row.id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-800 dark:text-slate-200 truncate max-w-sm">
                            {row.branch_name}
                          </span>
                          <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px] tabular-nums">
                            Min: <strong>{row.min_cutoff.toFixed(2)}%</strong> | Mean: {row.mean_cutoff.toFixed(2)}% | Spread: {spread.toFixed(2)}%
                          </span>
                        </div>

                        {/* Stacked visualization bar */}
                        <div className="relative h-6 w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          {/* Range from min to max */}
                          <div
                            className="absolute top-0 bottom-0 bg-indigo-100 dark:bg-indigo-950/70 border-r border-l border-indigo-300 dark:border-indigo-800"
                            style={{
                              left: `${minPct}%`,
                              width: `${Math.max(1, maxPct - minPct)}%`
                            }}
                          />
                          {/* Min Cutoff Marker */}
                          <div
                            className="absolute top-0 bottom-0 w-1.5 bg-indigo-600 rounded-sm z-10"
                            style={{ left: `calc(${minPct}% - 3px)` }}
                            title={`Minimum: ${row.min_cutoff.toFixed(2)}%`}
                          />
                          {/* Mean Marker */}
                          <div
                            className="absolute top-1 bottom-1 w-1 bg-emerald-500 rounded-sm z-20"
                            style={{ left: `calc(${meanPct}% - 2px)` }}
                            title={`Mean: ${row.mean_cutoff.toFixed(2)}%`}
                          />
                          {/* Max Marker */}
                          <div
                            className="absolute top-1.5 bottom-1.5 w-1 bg-slate-400 rounded-sm z-10"
                            style={{ left: `calc(${maxPct}% - 2px)` }}
                            title={`Max: ${row.max_cutoff.toFixed(2)}%`}
                          />
                          {/* Student benchmark line */}
                          {parsedPercentile > 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 border-r border-dashed border-rose-500 z-30"
                              style={{ left: `${Math.min(100, parsedPercentile)}%` }}
                              title={`Your Percentile: ${parsedPercentile}%`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {parsedPercentile > 0 && (
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-rose-500 pt-1 font-semibold tabular-nums">
                      <span className="w-3 border-b border-dashed border-rose-500" />
                      <span>Red dashed line = Your Percentile ({parsedPercentile.toFixed(2)}%)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chart 2: Seat Quota Variations for a Selected Branch */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Quota Cutoff Variation by Branch
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    See how cutoff thresholds shift across reservation categories for the same course.
                  </p>
                </div>

                {/* Branch selector dropdown */}
                <div className="w-full sm:w-80">
                  <select
                    value={chartBranchName}
                    onChange={(e) => setChartBranchName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {college.available_branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {branchQuotaCutoffs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No quota cutoffs recorded for {chartBranchName}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {branchQuotaCutoffs.map((item) => {
                    const evalRes = evaluateRecommendation(parsedPercentile, item);
                    const spread = item.range_cutoff ?? (item.max_cutoff - item.min_cutoff);

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-indigo-100 dark:bg-indigo-950 font-bold text-xs text-indigo-700 dark:text-indigo-300 px-2 py-0.5">
                            {item.seat_type_code}
                          </span>
                          <ClassificationBadge classification={evalRes.classification} size="sm" />
                        </div>

                        <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                          {item.min_cutoff.toFixed(2)}%
                          <span className="text-[10px] font-normal text-slate-500 ml-1">Min Cutoff</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 tabular-nums">
                          <div>Mean: <strong>{item.mean_cutoff.toFixed(2)}%</strong></div>
                          <div>Max: <strong>{item.max_cutoff.toFixed(2)}%</strong></div>
                          <div>Spread: <strong>{spread.toFixed(2)}%</strong></div>
                          <div>Seats: <strong>{item.count}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: OFFERED DISCIPLINES & SEAT MATRIX DIRECTORY */}
        {activeTab === "branches" && (
          <div className="space-y-6">
            
            {/* Disciplines Grouped by Faculty Category */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  Engineering Disciplines Offered ({college.available_branches.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Disciplines offered at {college.name} as recorded in CAP admission records.
                </p>
              </div>

              <div className="space-y-6">
                {Object.entries(branchesByCategory).map(([category, branchList]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {category} ({branchList.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {branchList.map((bName) => (
                        <div
                          key={bName}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                        >
                          <span className="truncate">{bName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBranchSearch(bName);
                              setActiveTab("cutoffs");
                            }}
                            className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2"
                          >
                            Cutoffs
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seat Types Quota Directory */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Centralized Admission Seat Quotas ({college.available_seat_types.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Government CAP quota categories active for this institution.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {college.available_seat_types.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedSeatType(st);
                      setActiveTab("cutoffs");
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                    title={`View cutoffs for ${st}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
