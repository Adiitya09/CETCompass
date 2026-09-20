"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  Search, 
  MapPin, 
  Layers, 
  ArrowRight, 
  Scale, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  BookmarkCheck
} from "lucide-react";
import { api, toggleCompareCollege, getStoredCompareColleges } from "@/lib/api";
import { CollegeListItem } from "@/types";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { showToast } from "@/components/Toast";

function CollegesContent() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get("district") || "");
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedBranch, setSelectedBranch] = useState(searchParams.get("branch") || "");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [colleges, setColleges] = useState<CollegeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Compare & Save State
  const [comparedIds, setComparedIds] = useState<number[]>(() => getStoredCompareColleges());
  const [savedIds, setSavedIds] = useState<number[]>([]);

  // Metadata for filter dropdowns
  const [districts, setDistricts] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [seatTypes, setSeatTypes] = useState<string[]>([]);

  useEffect(() => {
    const handleCompareUpdate = () => {
      setComparedIds(getStoredCompareColleges());
    };
    window.addEventListener("compare-change", handleCompareUpdate);

    api.getLocations().then((res) => {
      setDistricts(res.districts.map((d) => d.district));
      setRegions(Object.keys(res.regions || {}));
    }).catch(console.error);

    api.getBranches().then((res) => {
      setBranches(res.all_branches.map((b) => b.name));
    }).catch(console.error);

    api.getSeatTypes().then((res) => {
      setSeatTypes(res.all_seat_types.map((st) => st.code));
    }).catch(console.error);

    api.getSavedColleges().then((saved) => {
      setSavedIds(saved.map((s) => s.college_id));
    }).catch(() => {});

    return () => window.removeEventListener("compare-change", handleCompareUpdate);
  }, []);

  const [selectedSeatType, setSelectedSeatType] = useState<string>("");

  const fetchColleges = async (p: number = 1) => {
    try {
      setLoading(true);
      const res = await api.listColleges({
        q: query || undefined,
        district: selectedDistrict || undefined,
        region: selectedRegion || undefined,
        branch: selectedBranch || undefined,
        seat_type: selectedSeatType || undefined,
        status: selectedStatus || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: p,
        page_size: pageSize
      });
      setColleges(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(p);
    } catch (err) {
      console.error("Failed to load colleges:", err);
      showToast("Error loading colleges list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    api.listColleges({
      q: query || undefined,
      district: selectedDistrict || undefined,
      region: selectedRegion || undefined,
      branch: selectedBranch || undefined,
      seat_type: selectedSeatType || undefined,
      status: selectedStatus || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: 1,
      page_size: pageSize
    })
      .then((res) => {
        if (!ignore) {
          setColleges(res.data);
          setTotal(res.total);
          setTotalPages(res.total_pages);
          setPage(1);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to load colleges:", err);
          showToast("Error loading colleges list", "error");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [query, selectedDistrict, selectedRegion, selectedBranch, selectedSeatType, selectedStatus, sortBy, sortOrder, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchColleges(1);
  };

  const handleToggleCompare = (collegeId: number, collegeName: string) => {
    const res = toggleCompareCollege(collegeId);
    if (res.maxReached) {
      showToast("Maximum 3 colleges can be compared simultaneously.", "info");
    } else if (res.added) {
      showToast(`Added ${collegeName} to comparison`, "success");
    } else {
      showToast(`Removed from comparison`, "info");
    }
  };

  const handleToggleSave = async (collegeId: number, collegeName: string) => {
    if (savedIds.includes(collegeId)) {
      try {
        await api.deleteSavedCollege(collegeId);
        setSavedIds((prev) => prev.filter((id) => id !== collegeId));
        showToast(`Removed ${collegeName} from bookmarks`, "info");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Failed to remove bookmark", "error");
      }
    } else {
      try {
        await api.saveCollege(collegeId);
        setSavedIds((prev) => [...prev, collegeId]);
        showToast(`Saved ${collegeName} to shortlist!`, "success");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Failed to save college", "error");
      }
    }
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedDistrict("");
    setSelectedRegion("");
    setSelectedBranch("");
    setSelectedStatus("");
    setSortBy("name");
    setSortOrder("asc");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <Building2 className="h-3.5 w-3.5" />
              State Directory
            </span>
            <span className="text-xs text-slate-500">• 326 Colleges Indexed</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Explore Engineering Colleges
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Discover and compare accredited Maharashtra engineering institutions using historical cutoff insights.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            
            {/* Top Row: Search Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by college name, city, district, or institute code..."
                  aria-label="Search colleges"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                Search
              </button>
            </div>

            {/* Bottom Row: Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <div>
                <label htmlFor="district-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  District
                </label>
                <select
                  id="district-select"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Maharashtra Districts</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="region-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Region
                </label>
                <select
                  id="region-select"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Regions</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="branch-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Branch Offered
                </label>
                <select
                  id="branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="seat-type-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Seat Quota
                </label>
                <select
                  id="seat-type-select"
                  value={selectedSeatType}
                  onChange={(e) => setSelectedSeatType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Seat Types</option>
                  {seatTypes.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sort-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Sort By
                </label>
                <select
                  id="sort-select"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [f, o] = e.target.value.split("-");
                    setSortBy(f);
                    setSortOrder(o);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="name-asc">Name (A - Z)</option>
                  <option value="name-desc">Name (Z - A)</option>
                  <option value="city-asc">City (A - Z)</option>
                  <option value="district-asc">District (A - Z)</option>
                  <option value="code-asc">Institute Code</option>
                </select>
              </div>
            </div>

            {/* Active filter count & reset */}
            {(query || selectedDistrict || selectedRegion || selectedBranch || selectedStatus) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500">
                  Filters applied. Found <strong className="tabular-nums">{total}</strong> colleges.
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Reset all filters
                </button>
              </div>
            )}

          </form>
        </div>

        {/* Loading Skeletons */}
        {loading && <CardSkeleton count={6} />}

        {/* Empty State */}
        {!loading && colleges.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Building2 className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No colleges match your criteria
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              Try clearing some filters or searching with a different keyword.
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Colleges Grid */}
        {!loading && colleges.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {colleges.map((col) => {
              const isCompared = comparedIds.includes(col.id);
              const isSaved = savedIds.includes(col.id);
              return (
                <div
                  key={col.id}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Code & Location */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {col.city}, {col.district}
                      </span>
                      {col.code && (
                        <span className="font-mono text-[11px] font-semibold text-slate-400">
                          Code: {col.code}
                        </span>
                      )}
                    </div>

                    {/* College Name */}
                    <Link
                      href={`/colleges/${col.id}`}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 transition-colors line-clamp-2 mb-3"
                    >
                      {col.name}
                    </Link>

                    {/* Status & Branches count */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-semibold">
                        {col.status}
                      </span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                        <Layers className="h-3.5 w-3.5 text-indigo-500" />
                        {col.branches_count} {col.branches_count === 1 ? "Branch" : "Branches"}
                      </span>
                    </div>

                    {/* Cutoff Range stats */}
                    {(col.min_overall_cutoff !== null || col.max_overall_cutoff !== null) && (
                      <div className="grid grid-cols-2 gap-2 text-center mb-4 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Lowest Cutoff</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                            {col.min_overall_cutoff !== null ? `${col.min_overall_cutoff}%` : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Highest Cutoff</div>
                          <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {col.max_overall_cutoff !== null ? `${col.max_overall_cutoff}%` : "—"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions: Save, Compare, Details */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCompare(col.id, col.name)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                          isCompared
                            ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                        }`}
                        title="Add to comparison"
                      >
                        <Scale className="h-3.5 w-3.5" />
                        {isCompared ? "Compared" : "Compare"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleSave(col.id, col.name)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                          isSaved
                            ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                        }`}
                        title="Bookmark college"
                      >
                        {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5 text-slate-400" />}
                        {isSaved ? "Saved" : "Save"}
                      </button>
                    </div>

                    <Link
                      href={`/colleges/${col.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 group-hover:translate-x-0.5 transition-all"
                    >
                      View Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="text-xs text-slate-500">
              Showing page <strong className="text-slate-900 dark:text-white tabular-nums">{page}</strong> of{" "}
              <strong className="text-slate-900 dark:text-white tabular-nums">{totalPages}</strong> (<span className="tabular-nums">{total}</span> total colleges)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchColleges(page - 1)}
                aria-label="Previous page"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => fetchColleges(page + 1)}
                aria-label="Next page"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function CollegesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center"><CardSkeleton count={6} /></div>}>
      <CollegesContent />
    </Suspense>
  );
}
