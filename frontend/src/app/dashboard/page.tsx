"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  BookmarkCheck, 
  History, 
  Building2, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  MapPin, 
  Layers, 
  Calendar, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  Scale, 
  LogOut, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { 
  api, 
  getStoredCompareColleges, 
  setStoredCompareColleges 
} from "@/lib/api";
import { 
  getCurrentSession, 
  signOut, 
  onAuthChange 
} from "@/lib/supabase";
import { SavedCollege, PredictionHistoryItem } from "@/types";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { showToast } from "@/components/Toast";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    email: string;
    fullName: string;
    createdAt?: string;
  } | null>(null);

  const [savedColleges, setSavedColleges] = useState<SavedCollege[]>([]);
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [activeCompareCount, setActiveCompareCount] = useState<number>(0);

  // Expanded history item ID to preview generated recommendations
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  // Fetch User-Isolated Data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [saved, hist] = await Promise.all([
        api.getSavedColleges(),
        api.getPredictionHistory()
      ]);
      setSavedColleges(saved);
      setHistory(hist);
    } catch (e: unknown) {
      console.error("Dashboard error:", e);
      showToast(e instanceof Error ? e.message : "Failed to load dashboard records", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Check Authentication
  useEffect(() => {
    let isMounted = true;

    async function verifyAuthAndLoad() {
      try {
        setAuthChecking(true);
        const session = await getCurrentSession();

        if (!session?.user) {
          showToast("Please sign in to access your dashboard.", "info");
          router.replace("/login?redirect=/dashboard");
          return;
        }

        if (isMounted) {
          const user = session.user;
          const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student Candidate";
          setUserProfile({
            id: user.id,
            email: user.email || "",
            fullName,
            createdAt: user.created_at
          });

          setActiveCompareCount(getStoredCompareColleges().length);
          loadDashboardData();
        }
      } catch (err) {
        console.error("Auth verification failed:", err);
        router.replace("/login?redirect=/dashboard");
      } finally {
        if (isMounted) setAuthChecking(false);
      }
    }

    verifyAuthAndLoad();

    const { data: authSub } = onAuthChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        router.replace("/login?redirect=/dashboard");
      }
    });

    const handleCompareUpdate = () => {
      setActiveCompareCount(getStoredCompareColleges().length);
    };
    window.addEventListener("compare-change", handleCompareUpdate);

    return () => {
      isMounted = false;
      authSub?.subscription?.unsubscribe();
      window.removeEventListener("compare-change", handleCompareUpdate);
    };
  }, [router, loadDashboardData]);

  // Remove Saved College
  const handleDeleteSaved = async (collegeId: number, collegeName: string) => {
    try {
      await api.deleteSavedCollege(collegeId);
      setSavedColleges((prev) => prev.filter((c) => c.college_id !== collegeId));
      showToast(`Removed ${collegeName} from bookmarks`, "info");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to remove college", "error");
    }
  };

  // Shortcut: Compare Bookmarked Colleges
  const handleCompareBookmarked = () => {
    if (savedColleges.length === 0) {
      showToast("No colleges saved to compare yet.", "info");
      return;
    }
    const targetIds = savedColleges.slice(0, 3).map((c) => c.college_id);
    setStoredCompareColleges(targetIds);
    showToast(`Loaded ${targetIds.length} bookmarked colleges into comparison matrix.`, "success");
    router.push(`/compare?colleges=${targetIds.join(",")}`);
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut();
      showToast("Signed out successfully.", "info");
      router.push("/login");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error during sign out", "error");
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Verifying Supabase credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* PROFILE / HEADER BANNER */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-lg shadow-sm shrink-0">
              {userProfile?.fullName ? userProfile.fullName.charAt(0).toUpperCase() : "S"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {userProfile?.fullName || "Student Candidate"}
                </h1>
                <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Authenticated Student
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>{userProfile?.email}</span>
                <span>•</span>
                <span className="font-mono text-[11px]">ID: {userProfile?.id}</span>
                {userProfile?.createdAt && (
                  <>
                    <span>•</span>
                    <span>Member since {new Date(userProfile.createdAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/predictor"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              New Prediction
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* COMPARISON SHORTCUTS WIDGET */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-950 dark:bg-indigo-950/20 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Scale className="h-3.5 w-3.5" />
                Comparison Tray
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {activeCompareCount} / 3 Colleges
              </div>
              <p className="text-[11px] text-slate-500">
                {activeCompareCount >= 2 ? "Ready for side-by-side analysis" : "Select up to 3 institutions"}
              </p>
            </div>
            <Link
              href="/compare"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors shrink-0"
            >
              Open Matrix
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <BookmarkCheck className="h-3.5 w-3.5" />
                Bookmarked Shortlist
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {savedColleges.length} Colleges
              </div>
              <p className="text-[11px] text-slate-500">
                Personalized saved colleges
              </p>
            </div>
            {savedColleges.length >= 2 ? (
              <button
                onClick={handleCompareBookmarked}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors shrink-0"
              >
                Compare All
              </button>
            ) : (
              <Link
                href="/colleges"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors shrink-0"
              >
                Browse Catalog
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <History className="h-3.5 w-3.5" />
                Historical Runs
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {history.length} Calculations
              </div>
              <p className="text-[11px] text-slate-500">
                Auditable prediction history
              </p>
            </div>
            <Link
              href="/predictor"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition-colors shrink-0"
            >
              New Run
            </Link>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {loading && <TableSkeleton rows={6} cols={3} />}

        {/* MAIN DASHBOARD CONTENT */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: SAVED COLLEGES */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Saved Colleges Shortlist ({savedColleges.length})
                  </h2>
                </div>
                <Link
                  href="/colleges"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1"
                >
                  Explore Directory <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {savedColleges.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <Building2 className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No colleges bookmarked yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Bookmark institutions while exploring the colleges catalog or reviewing prediction recommendations.
                  </p>
                  <Link
                    href="/colleges"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors"
                  >
                    Browse Colleges Directory
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedColleges.map((col) => (
                    <div
                      key={col.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-all dark:border-slate-800 dark:bg-slate-900 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {col.district}
                          </span>
                          {col.branch_name && (
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {col.branch_name}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/colleges/${col.college_id}`}
                          className="text-base font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 transition-colors line-clamp-1"
                        >
                          {col.college_name}
                        </Link>

                        {col.notes && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg">
                            Note: &ldquo;{col.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/colleges/${col.college_id}`}
                          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 transition-colors"
                          title="View College Details"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteSaved(col.college_id, col.college_name)}
                          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:hover:border-rose-800 transition-colors"
                          title="Remove bookmark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: PREDICTION HISTORY & RECOMMENDATIONS */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Prediction History ({history.length})
                  </h2>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <Sparkles className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No prediction history recorded
                  </h3>
                  <p className="text-xs text-slate-500">
                    Run the college recommendation predictor to generate matching institutions and store calculation history.
                  </p>
                  <Link
                    href="/predictor"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors"
                  >
                    Run First Prediction
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((hist) => {
                    const isExpanded = expandedHistoryId === hist.id;
                    const replayParams = new URLSearchParams({
                      percentile: hist.percentile.toString(),
                      score_type: hist.score_type,
                      seat_type: hist.seat_type
                    });
                    if (hist.preferred_branches && hist.preferred_branches.length > 0) {
                      replayParams.set("branches", hist.preferred_branches.join(","));
                    }
                    if (hist.preferred_locations && hist.preferred_locations.length > 0) {
                      replayParams.set("districts", hist.preferred_locations.join(","));
                    }

                    return (
                      <div
                        key={hist.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                              {hist.percentile.toFixed(2)}%
                            </span>
                            <span className="rounded bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                              {hist.score_type}
                            </span>
                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {hist.seat_type}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(hist.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Preferences */}
                        {(hist.preferred_branches?.length || hist.preferred_locations?.length) ? (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            {hist.preferred_branches && hist.preferred_branches.length > 0 && (
                              <div className="truncate">
                                Branches: <strong className="text-slate-700 dark:text-slate-300">{hist.preferred_branches.join(", ")}</strong>
                              </div>
                            )}
                            {hist.preferred_locations && hist.preferred_locations.length > 0 && (
                              <div className="truncate">
                                Locations: <strong className="text-slate-700 dark:text-slate-300">{hist.preferred_locations.join(", ")}</strong>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Match Counts breakdown */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 tabular-nums">
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {hist.safe_count} Safe
                          </div>
                          <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {hist.moderate_count} Mod
                          </div>
                          <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center gap-1">
                            <Target className="h-3.5 w-3.5" />
                            {hist.reach_count} Reach
                          </div>
                        </div>

                        {/* Generated Recommendations Drawer Preview */}
                        {hist.recommendations && hist.recommendations.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                            <button
                              type="button"
                              onClick={() => setExpandedHistoryId(isExpanded ? null : hist.id)}
                              className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors py-1"
                            >
                              <span>
                                {isExpanded ? "Hide Generated Recommendations" : `Preview Generated Recommendations (${hist.recommendations.length})`}
                              </span>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {isExpanded && (
                              <div className="space-y-2 pt-2 animate-in fade-in">
                                {hist.recommendations.slice(0, 5).map((rec, rIdx: number) => (
                                  <div
                                    key={rIdx}
                                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/60 text-xs flex items-center justify-between gap-2"
                                  >
                                    <div className="truncate">
                                      <div className="font-bold text-slate-900 dark:text-white truncate">
                                        {rec.college_name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {rec.branch_name}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <ClassificationBadge 
                                        classification={rec.classification || "Safe"} 
                                        size="sm" 
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Replay action */}
                        <div className="pt-1">
                          <Link
                            href={`/results?${replayParams.toString()}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Replay Calculation ({hist.total_matches} Total Matches)
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
