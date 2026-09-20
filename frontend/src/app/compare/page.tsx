"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Scale, 
  MapPin, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  TrendingUp, 
  X, 
  BarChart3, 
  ShieldCheck, 
  Smartphone 
} from "lucide-react";
import { 
  api, 
  getStoredCompareColleges, 
  setStoredCompareColleges, 
  clearStoredCompareColleges 
} from "@/lib/api";
import { ComparisonCollegeItem } from "@/types";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { showToast } from "@/components/Toast";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected College IDs (Maximum 3)
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    const raw = searchParams.get("colleges");
    const urlColleges = raw
      ? raw.split(",").map(Number).filter((id) => !isNaN(id) && id > 0).slice(0, 3)
      : null;
    if (urlColleges && urlColleges.length > 0) return urlColleges;
    const stored = getStoredCompareColleges().slice(0, 3);
    if (stored.length >= 1) return stored;
    return [1, 2];
  });
  const [seatType, setSeatType] = useState<string>("GOPENS");
  const [scoreType, setScoreType] = useState<string>("MHT-CET");
  const [allColleges, setAllColleges] = useState<{ id: number; name: string; city: string; district: string }[]>([]);
  const [comparisonColleges, setComparisonColleges] = useState<ComparisonCollegeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(() => {
    const raw = searchParams.get("colleges");
    const count = raw ? raw.split(",").length : 2;
    return count >= 2;
  });
  const [addCollegeId, setAddCollegeId] = useState<string>("");

  // Mobile View Tab: "all" or specific college index
  const [mobileActiveTab, setMobileActiveTab] = useState<number | "all">("all");

  // Common seat types from colleges in comparison
  const [availableSeatTypes, setAvailableSeatTypes] = useState<string[]>([
    "GOPENS", "GOPENH", "GOPENO", "TFWS", "EWS", "AI", "GOBCH", "GSCH", "GSTH", "LOPENS"
  ]);

  // Fetch directory and listen for external compare-tray updates
  useEffect(() => {
    api.listColleges({ page_size: 100 }).then((res) => {
      setAllColleges(res.data.map((c) => ({ id: c.id, name: c.name, city: c.city, district: c.district })));
    }).catch(console.error);

    const handleCompareUpdate = () => {
      const current = getStoredCompareColleges().slice(0, 3);
      setSelectedIds(current);
    };
    window.addEventListener("compare-change", handleCompareUpdate);
    return () => window.removeEventListener("compare-change", handleCompareUpdate);
  }, []);

  // Sync state to URL
  const syncUrl = (ids: number[]) => {
    const params = new URLSearchParams(window.location.search);
    if (ids.length > 0) {
      params.set("colleges", ids.join(","));
    } else {
      params.delete("colleges");
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  };

  useEffect(() => {
    let ignore = false;
    if (selectedIds.length < 2) {
      return;
    }

    api.compareColleges(selectedIds.slice(0, 3), seatType, scoreType)
      .then((res) => {
        if (!ignore) {
          setComparisonColleges(res.colleges as ComparisonCollegeItem[]);
          const distinctSeats = new Set<string>();
          res.colleges.forEach((c) => {
            if (c.available_seat_types) {
              c.available_seat_types.forEach((st: string) => distinctSeats.add(st));
            }
          });
          if (distinctSeats.size > 0) {
            setAvailableSeatTypes(Array.from(distinctSeats).sort());
          }
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!ignore) {
          console.error(e);
          showToast(e instanceof Error ? e.message : "Failed to load comparison data", "error");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedIds, seatType, scoreType]);

  // Add College (Max 3)
  const handleAddCollege = () => {
    const id = parseInt(addCollegeId);
    if (!id) return;
    if (selectedIds.includes(id)) {
      showToast("College is already added to comparison.", "info");
      return;
    }
    if (selectedIds.length >= 3) {
      showToast("You can compare up to 3 colleges simultaneously.", "info");
      return;
    }
    const updated = [...selectedIds, id].slice(0, 3);
    setSelectedIds(updated);
    setStoredCompareColleges(updated);
    syncUrl(updated);
    setAddCollegeId("");
    showToast("College added to comparison matrix.", "success");
  };

  // Remove Single College
  const handleRemoveCollege = (id: number) => {
    const updated = selectedIds.filter((cid) => cid !== id);
    setSelectedIds(updated);
    if (updated.length < 2) {
      setComparisonColleges([]);
    }
    setStoredCompareColleges(updated);
    syncUrl(updated);
    showToast("College removed from comparison.", "info");
  };

  // Clear All
  const handleClearAll = () => {
    setSelectedIds([]);
    setComparisonColleges([]);
    clearStoredCompareColleges();
    syncUrl([]);
    showToast("All colleges cleared from comparison.", "info");
  };

  // Collect distinct branches across compared colleges
  const commonBranches = useMemo(() => {
    const set = new Set<string>();
    comparisonColleges.forEach((c) => {
      c.branches.forEach((b) => set.add(b.branch_name));
    });
    return Array.from(set).sort();
  }, [comparisonColleges]);

  // Find top branches offered in 2 or more colleges for chart comparison
  const chartBranches = useMemo(() => {
    if (comparisonColleges.length < 2) return [];
    return commonBranches.filter((bName) => {
      const offeredCount = comparisonColleges.filter((c) => c.branches.some((b) => b.branch_name === bName)).length;
      return offeredCount >= 2;
    }).slice(0, 6);
  }, [commonBranches, comparisonColleges]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/colleges"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Colleges
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-950/60 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                <Scale className="h-3.5 w-3.5" />
                Compare Up to 3 Colleges
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Compare Engineering Colleges
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Compare colleges, branches, seat types, and historical cutoff information side by side.
            </p>
          </div>

          {/* Exam & Seat Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Exam Channel
              </label>
              <select
                value={scoreType}
                onChange={(e) => setScoreType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="MHT-CET">MHT-CET (State Merit)</option>
                <option value="JEE Main">JEE Main (All India)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Quota Category
              </label>
              <select
                value={seatType}
                onChange={(e) => setSeatType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {availableSeatTypes.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add College Selector & Slot Bar (1 to 3 Colleges) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Dropdown to add college */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 w-full">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Add to Compare:
              </span>
              <div className="flex items-center gap-2 flex-1 w-full max-w-md">
                <select
                  value={addCollegeId}
                  onChange={(e) => setAddCollegeId(e.target.value)}
                  disabled={selectedIds.length >= 3}
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                >
                  <option value="">Select an institution to add...</option>
                  {allColleges.map((c) => (
                    <option key={c.id} value={c.id} disabled={selectedIds.includes(c.id)}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddCollege}
                  disabled={!addCollegeId || selectedIds.length >= 3}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Clear All & Count Indicator */}
            <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {selectedIds.length}/3 Colleges Selected
              </span>

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 p-1 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>

          </div>

          {/* 3-Slot Visual Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {[0, 1, 2].map((slotIdx) => {
              const collegeId = selectedIds[slotIdx];
              const collegeData = comparisonColleges.find((c) => c.id === collegeId);
              const fallbackCol = allColleges.find((c) => c.id === collegeId);

              if (collegeId) {
                return (
                  <div
                    key={slotIdx}
                    className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 dark:border-indigo-900/60 dark:bg-indigo-950/30"
                  >
                    <div className="truncate mr-2">
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        Slot {slotIdx + 1}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {collegeData?.name || fallbackCol?.name || `College #${collegeId}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCollege(collegeId)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                      title="Remove college"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              } else {
                return (
                  <div
                    key={slotIdx}
                    className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-2.5 text-xs text-slate-400 text-center"
                  >
                    Slot {slotIdx + 1} (Empty)
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* State: Less than 2 colleges */}
        {selectedIds.length < 2 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <Scale className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Select at least 2 colleges to compare (Up to 3)
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Choose an engineering institution from the dropdown above or browse the college catalog to add options to your comparison tray.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/colleges"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md"
              >
                Browse Colleges Catalog
              </Link>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && selectedIds.length >= 2 && <TableSkeleton rows={8} cols={selectedIds.length + 1} />}

        {/* Active Comparison Presentation */}
        {!loading && comparisonColleges.length >= 2 && (
          <div className="space-y-8">
            
            {/* Mobile Column View Switcher (Visible only on small viewports) */}
            <div className="block md:hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
                <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                <span>Mobile View Mode:</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setMobileActiveTab("all")}
                  className={`py-1.5 px-2 rounded-lg font-semibold text-center truncate ${
                    mobileActiveTab === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  All (Table)
                </button>
                {comparisonColleges.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setMobileActiveTab(idx)}
                    className={`py-1.5 px-2 rounded-lg font-semibold text-center truncate ${
                      mobileActiveTab === idx
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                    title={c.name}
                  >
                    College {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 1: INSTITUTIONAL & OVERALL STATISTICS CARDS */}
            <div className={`grid gap-4 ${
              comparisonColleges.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"
            }`}>
              {comparisonColleges.map((c, idx) => {
                if (mobileActiveTab !== "all" && mobileActiveTab !== idx) return null;

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Bar: Status, Code, and Remove Action */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                            {c.status}
                          </span>
                          {c.code && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Code: {c.code}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCollege(c.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove college from comparison"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* College Name */}
                      <Link
                        href={`/colleges/${c.id}`}
                        className="text-base font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 line-clamp-2 mb-1.5"
                      >
                        {c.name}
                      </Link>

                      {/* Location: City, District, Region */}
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{c.city}, {c.district} ({c.region})</span>
                      </div>

                      {/* Disciplines & Quotas Count */}
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 py-2 border-y border-slate-100 dark:border-slate-800 font-medium">
                        <span>Total Disciplines: <strong>{c.total_offered_branches ?? c.total_branches}</strong></span>
                        <span>Quotas: <strong>{c.available_seat_types?.length ?? "—"}</strong></span>
                      </div>
                    </div>

                    {/* Overall Cutoff Statistics for this College */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2 border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Overall Cutoff Metrics ({seatType})
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400">Lowest Cutoff</div>
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {c.min_cutoff_overall !== null && c.min_cutoff_overall !== undefined ? `${c.min_cutoff_overall}%` : "—"}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400">Highest Cutoff</div>
                          <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                            {c.max_cutoff_overall !== null && c.max_cutoff_overall !== undefined ? `${c.max_cutoff_overall}%` : "—"}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400">Cohort Mean</div>
                          <div className="text-sm font-black text-slate-700 dark:text-slate-300">
                            {c.mean_cutoff_overall !== null && c.mean_cutoff_overall !== undefined ? `${c.mean_cutoff_overall}%` : "—"}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400">Cutoff Range</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {c.range_cutoff_overall !== null && c.range_cutoff_overall !== undefined ? `${c.range_cutoff_overall}%` : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* View Details Link */}
                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/colleges/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        View Full College Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: SIDE-BY-SIDE VISUAL COMPARISON CHART */}
            {chartBranches.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      Cutoff Comparison across Common Branches ({seatType})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Visualizing minimum cutoff barrier comparisons side-by-side for overlapping disciplines.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {comparisonColleges.map((c, idx) => {
                      const colors = ["bg-indigo-600", "bg-emerald-500", "bg-amber-500"];
                      return (
                        <div key={c.id} className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${colors[idx % colors.length]}`} />
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px]" title={c.name}>
                            {c.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grouped Bar Visualizer */}
                <div className="space-y-4 pt-2">
                  {chartBranches.map((bName) => (
                    <div key={bName} className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {bName}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {comparisonColleges.map((c, idx) => {
                          const branchStat = c.branches.find((b) => b.branch_name === bName);
                          const barColors = [
                            "bg-indigo-600 dark:bg-indigo-500",
                            "bg-emerald-600 dark:bg-emerald-500",
                            "bg-amber-600 dark:bg-amber-500"
                          ];
                          const minVal = branchStat ? branchStat.min_cutoff : 0;

                          return (
                            <div key={c.id} className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2 border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between items-center text-[11px] mb-1">
                                <span className="text-slate-500 truncate max-w-[120px]">{c.name}</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {branchStat ? `${branchStat.min_cutoff.toFixed(2)}%` : "Not Offered"}
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                {branchStat && (
                                  <div
                                    className={`h-full rounded-full ${barColors[idx % barColors.length]}`}
                                    style={{ width: `${Math.max(2, minVal)}%` }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: DETAILED BRANCH-BY-BRANCH COMPARISON TABLE */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Complete Discipline Cutoff Comparison Table ({seatType})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Detailed side-by-side cutoff statistics: Min, Mean, Max, Range, and Sampled Seat Counts.
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  {commonBranches.length} Total Unique Disciplines Found
                </div>
              </div>

              {/* Responsive Table with Sticky First Column */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-3.5 px-4 font-bold min-w-[220px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                        Branch Discipline
                      </th>
                      {comparisonColleges.map((c) => (
                        <th key={c.id} className="py-3.5 px-4 font-bold text-center min-w-[180px]">
                          <div className="truncate max-w-[200px] mx-auto" title={c.name}>
                            {c.name}
                          </div>
                          <div className="text-[10px] font-normal text-slate-400">
                            {c.city}, {c.district}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {commonBranches.length === 0 ? (
                      <tr>
                        <td colSpan={comparisonColleges.length + 1} className="py-8 text-center text-slate-400">
                          No cutoffs recorded for quota category {seatType} across these colleges.
                        </td>
                      </tr>
                    ) : (
                      commonBranches.map((bName) => (
                        <tr key={bName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                            {bName}
                          </td>
                          {comparisonColleges.map((c) => {
                            const branchStat = c.branches.find((b) => b.branch_name === bName);

                            return (
                              <td key={c.id} className="py-3 px-4 text-center">
                                {branchStat ? (
                                  <div className="space-y-1">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                      {branchStat.min_cutoff.toFixed(2)}%
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <div>Mean: <strong>{branchStat.mean_cutoff.toFixed(2)}%</strong></div>
                                      <div>Max: <strong>{branchStat.max_cutoff.toFixed(2)}%</strong></div>
                                      <div>Range: <strong>{branchStat.range_cutoff.toFixed(2)}%</strong></div>
                                      <div>Seats: <strong>{branchStat.count}</strong></div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-medium text-xs">
                                    — Not Offered —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data Source Notice */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Historical cutoff comparison is based strictly on Maharashtra State CET Cell CAP round records. Minimum represents entry barrier, mean represents cohort center, and range indicates applicant score dispersion.
              </span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center"><TableSkeleton rows={8} cols={3} /></div>}>
      <CompareContent />
    </Suspense>
  );
}
