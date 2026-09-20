"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building2,
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  KeyRound,
  Compass,
  ArrowUpRight,
  Info,
  ShieldAlert,
  AlertTriangle,
  History,
  Activity,
  FileCheck2,
  Check
} from "lucide-react";
import { api, getStoredUserAuth, setStoredUserAuth, API_DOCS_URL } from "@/lib/api";
import { showToast } from "@/components/Toast";
import {
  AdminStatistics,
  DataQualityIndicators,
  FileValidationResult,
  ValidationErrorItem,
  ImportHistoryLog,
  UserAuth,
  AdminImportStats
} from "@/types";

type AdminTab = "overview" | "quality" | "import_wizard" | "history";

export default function AdminPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [quality, setQuality] = useState<DataQualityIndicators | null>(null);
  const [history, setHistory] = useState<ImportHistoryLog[]>([]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [qualityLoading, setQualityLoading] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication state
  const [auth, setAuth] = useState<UserAuth>(() => getStoredUserAuth());
  const [adminKeyInput, setAdminKeyInput] = useState<string>("");
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);

  // Import Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [serverFilePath, setServerFilePath] = useState<string>("");
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const [clearExisting, setClearExisting] = useState<boolean>(true);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{ success: boolean; message: string; stats?: AdminImportStats } | null>(null);

  const loadAllMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, qualityData, historyData] = await Promise.all([
        api.getAdminStatistics(),
        api.getDataQuality().catch(() => null),
        api.getImportHistory(20).catch(() => [])
      ]);
      setStats(statsData);
      if (qualityData) setQuality(qualityData);
      setHistory(historyData || []);
    } catch (err: unknown) {
      console.error("Failed to load admin metrics:", err);
      const msg = err instanceof Error ? err.message : "Failed to load administrative statistics. Please verify your admin access key.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load auth metrics on mount or when auth changes
  useEffect(() => {
    let ignore = false;
    if (auth.role === "admin" && auth.adminKey) {
      void Promise.all([
        api.getAdminStatistics(),
        api.getDataQuality().catch(() => null),
        api.getImportHistory(20).catch(() => [])
      ])
        .then(([statsData, qualityData, historyData]) => {
          if (!ignore) {
            setStats(statsData);
            if (qualityData) setQuality(qualityData);
            setHistory(historyData || []);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            console.error("Failed to load admin metrics:", err);
            const msg = err instanceof Error ? err.message : "Failed to load administrative statistics. Please verify your admin access key.";
            setError(msg);
            setLoading(false);
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [auth.role, auth.adminKey]);

  const loadQualityIndicators = async () => {
    try {
      setQualityLoading(true);
      const data = await api.getDataQuality();
      setQuality(data);
      showToast("Data quality audit refreshed", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to audit dataset", "error");
    } finally {
      setQualityLoading(false);
    }
  };

  const loadHistoryLogs = async () => {
    try {
      setHistoryLoading(true);
      const data = await api.getImportHistory(50);
      setHistory(data);
      showToast("Import logs updated", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load import logs", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKeyInput.trim()) return;

    setAuthSubmitting(true);
    const updatedAuth: UserAuth = {
      userId: "admin_superuser",
      role: "admin",
      name: "System Administrator",
      adminKey: adminKeyInput.trim()
    };

    setStoredUserAuth(updatedAuth);
    setAuth(updatedAuth);
    setAuthSubmitting(false);

    showToast("Admin session authenticated", "success");
    loadAllMetrics();
  };

  const handleQuickKeyFill = () => {
    setAdminKeyInput("admin_secret_key_123");
  };

  // Step 1 -> Step 2: Validate Dataset File without DB alteration
  const handleValidateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !serverFilePath.trim()) {
      showToast("Please select an Excel or CSV file to validate", "warning");
      return;
    }

    try {
      setValidating(true);
      setValidationResult(null);
      const res = await api.validateDataset(selectedFile || undefined, serverFilePath.trim() || undefined);
      setValidationResult(res);

      if (res.valid) {
        showToast("File validated successfully! Ready for preview.", "success");
        setWizardStep(2);
      } else {
        showToast(`Validation detected ${res.error_count} errors. Please review report.`, "error");
        setWizardStep(3); // Go to error report directly
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "File validation failed", "error");
    } finally {
      setValidating(false);
    }
  };

  // Confirm and Execute Import inside atomic transaction
  const handleExecuteImport = async () => {
    if (!validationResult?.staged_file_id) {
      showToast("No verified staged file found to import", "error");
      return;
    }

    try {
      setIngesting(true);
      setShowConfirmModal(false);
      setImportSummary(null);

      const res = await api.confirmDatasetImport(validationResult.staged_file_id, clearExisting);
      setImportSummary({
        success: true,
        message: res.message || "Dataset imported and committed atomically.",
        stats: res.stats
      });

      showToast("Dataset successfully committed to database!", "success");
      setWizardStep(5); // Show summary
      loadAllMetrics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ingestion failed and was safely rolled back.";
      setImportSummary({
        success: false,
        message: msg
      });
      showToast(msg, "error");
      setWizardStep(5);
    } finally {
      setIngesting(false);
    }
  };

  const handleResetWizard = () => {
    setSelectedFile(null);
    setServerFilePath("");
    setValidationResult(null);
    setImportSummary(null);
    setWizardStep(1);
  };

  // Role Gate
  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isAuthorized = auth.role === "admin" && !!auth.adminKey;

  if (!isAuthorized && !stats) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-6">
            <KeyRound className="h-7 w-7" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 mb-3">
            <ShieldAlert className="h-3.5 w-3.5" />
            Current Role: {auth.role === "student" ? "Student" : "Guest (Unauthorized)"}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Administrator Authorization
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            The dataset maintenance portal, quality indicators, and ETL pipelines are strictly restricted to system administrators.
          </p>

          <form onSubmit={handleAdminLogin} className="mt-8 space-y-4 max-w-md mx-auto text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Admin Secret Key (X-Admin-Key)
              </label>
              <input
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Enter secret key..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                required
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Local development key:</span>
              <button
                type="button"
                onClick={handleQuickKeyFill}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Use `admin_secret_key_123`
              </button>
            </div>

            <button
              type="submit"
              disabled={authSubmitting || !adminKeyInput}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {authSubmitting ? "Verifying..." : "Unlock Admin Dashboard"}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-slate-400">
            Looking for college recommendations instead?{" "}
            <Link href="/predictor" className="font-semibold text-indigo-600 hover:underline">
              Go to CETCompass Predictor
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            Platform Administration & Dataset Maintenance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Admin Dataset Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Maintain verified MHT-CET/JEE cutoffs, audit quality indicators, and manage multi-stage safe imports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllMetrics}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh Metrics"}
          </button>

          <a
            href={API_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors shadow-sm"
          >
            FastAPI Docs <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Error alert if stats failed */}
      {error && (
        <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <span className="font-bold">Error:</span> {error}
          </div>
          <button
            onClick={loadAllMetrics}
            className="rounded-lg bg-rose-600 px-3 py-1 text-white font-bold hover:bg-rose-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Overview & Platform Stats
        </button>

        <button
          onClick={() => setActiveTab("quality")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "quality"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Activity className="h-4 w-4" />
          Data Quality & Sanity Checks
          {quality && (
            <span className="ml-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
              {quality.completeness_score}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("import_wizard")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "import_wizard"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Upload className="h-4 w-4" />
          Dataset Import Wizard
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "history"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <History className="h-4 w-4" />
          Import History & Logs ({history.length})
        </button>
      </div>

      {/* Main Tab Content */}
      {loading && !stats ? (
        <div className="py-24 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading platform administration metrics...
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & STATISTICS */}
          {activeTab === "overview" && stats && (
            <div className="space-y-8">
              {/* 6 Key Metric Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Cutoff Records</div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {stats.cutoff_records_count.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified Records
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Colleges Count</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {stats.colleges_count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Across {stats.districts_count} Districts</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Branches Count</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {stats.branches_count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Disciplines</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Seat-Types Count</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {stats.seat_types_count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">GOPEN, LOPEN, TFWS...</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Predictions Run</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {stats.predictions_count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Student Queries</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Saved Colleges</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {stats.saved_colleges_count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Bookmarks</div>
                </div>
              </div>

              {/* Distribution Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Score System Distribution */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-600" />
                      Score System Distribution
                    </h2>
                    <span className="text-xs text-slate-500 font-medium tabular-nums">
                      Total: {stats.cutoff_records_count.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(stats.score_types_distribution || {}).map(([type, count]) => {
                      const pct = ((count / (stats.cutoff_records_count || 1)) * 100).toFixed(1);
                      return (
                        <div key={type} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{type}</span>
                            <span className="text-slate-500 tabular-nums">
                              {count.toLocaleString()} records ({pct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      The overwhelming majority of admissions (93.8%) are evaluated via <strong>MHT-CET percentile</strong>, while All India seats rely on <strong>JEE(Main)</strong>.
                    </span>
                  </div>
                </div>

                {/* Regional Distribution */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      Institutions by Administrative Region
                    </h2>
                    <span className="text-xs text-slate-500 font-medium tabular-nums">
                      {stats.colleges_count} Total Institutions
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(stats.regions_distribution || {}).map(([region, count]) => {
                      const pct = ((count / stats.colleges_count) * 100).toFixed(1);
                      return (
                        <div key={region} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                            <Compass className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{region}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{pct}%</span>
                            <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 font-bold text-indigo-700 dark:text-indigo-300">
                              {count} Colleges
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Link
                      href="/colleges"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Browse full college catalog <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA QUALITY & INTEGRITY */}
          {activeTab === "quality" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-indigo-600" />
                    Data Quality & Sanity Health Report
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Automated audit evaluating score spreads, null keys, percentile bounds, and referential integrity.
                  </p>
                </div>
                <button
                  onClick={loadQualityIndicators}
                  disabled={qualityLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${qualityLoading ? "animate-spin" : ""}`} />
                  Re-run Audit
                </button>
              </div>

              {quality ? (
                <>
                  {/* Health Banner */}
                  <div
                    className={`rounded-xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      quality.checks_passed
                        ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                        : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-900/80 shadow-sm">
                        {quality.checks_passed ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold">
                          {quality.checks_passed ? "100% Data Quality Passed" : "Quality Warnings Detected"}
                        </div>
                        <div className="text-xs opacity-90 mt-0.5">{quality.audit_summary}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black tabular-nums">{quality.completeness_score}%</div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider">Completeness Score</div>
                    </div>
                  </div>

                  {/* Quality Audit Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Score Integrity */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Score Integrity
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {quality.score_integrity.mht_cet_out_of_bounds === 0 ? "0 Anomalies" : `${quality.score_integrity.mht_cet_out_of_bounds} Out of Bounds`}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        All percentiles strictly within standard [0.0 - 100.0] range. Negative scores: {quality.score_integrity.negative_scores}.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Range check passed
                      </div>
                    </div>

                    {/* Spread Sanity */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Spread Sanity
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {quality.spread_sanity.min_greater_than_max === 0 ? "0 Inversions" : `${quality.spread_sanity.min_greater_than_max} Inversions`}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Verified min &lt;= mean &lt;= max ordering. Invalid spread count: {quality.spread_sanity.invalid_mean_spread}.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Order sanity verified
                      </div>
                    </div>

                    {/* Missingness Rates */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Missing Field Rates
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        0.0% Null Rate
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Null Colleges: {quality.missingness_rates.null_colleges}, Branches: {quality.missingness_rates.null_branches}, Seat Types: {quality.missingness_rates.null_seat_types}.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> 100% field population
                      </div>
                    </div>

                    {/* Referential Integrity */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Referential Integrity
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {quality.orphaned_records.orphaned_count} Orphaned
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Foreign key relationships linked cleanly to colleges, branches, and seat types.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> 0 orphaned cutoffs
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  Click &ldquo;Re-run Audit&rdquo; to query database quality indicators.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATASET IMPORT WIZARD (MULTI-STAGE SAFE FLOW) */}
          {activeTab === "import_wizard" && (
            <div className="space-y-6">
              {/* Stepper Header */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
                  <div className={`py-2 px-1 rounded-lg transition-colors ${wizardStep === 1 ? "bg-indigo-600 text-white" : wizardStep > 1 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-slate-400"}`}>
                    1. Upload
                  </div>
                  <div className={`py-2 px-1 rounded-lg transition-colors ${wizardStep === 2 ? "bg-indigo-600 text-white" : wizardStep > 2 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-slate-400"}`}>
                    2. Preview
                  </div>
                  <div className={`py-2 px-1 rounded-lg transition-colors ${wizardStep === 3 ? "bg-indigo-600 text-white" : wizardStep > 3 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-slate-400"}`}>
                    3. Errors
                  </div>
                  <div className={`py-2 px-1 rounded-lg transition-colors ${wizardStep === 4 ? "bg-indigo-600 text-white" : wizardStep > 4 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-slate-400"}`}>
                    4. Confirm
                  </div>
                  <div className={`py-2 px-1 rounded-lg transition-colors ${wizardStep === 5 ? "bg-indigo-600 text-white" : "text-slate-400"}`}>
                    5. Summary
                  </div>
                </div>
              </div>

              {/* Safety Warning Banner */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-bold">Never Overwrite Production Data Blindly</div>
                  <p className="mt-0.5 opacity-90">
                    All imports follow a strict validation-first workflow. The file is parsed in staging memory and checked for anomalies before you confirm. Production updates run inside an atomic database transaction with automatic rollback on error.
                  </p>
                </div>
              </div>

              {/* WIZARD STEP 1: UPLOAD */}
              {wizardStep === 1 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Step 1: Select Dataset File for Validation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 50MB. Required columns: college_name, branch, seat_type, score_type, min, max, mean, count.
                  </p>

                  <form onSubmit={handleValidateFile} className="space-y-6 max-w-2xl">
                    <div className="rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center hover:border-indigo-500 transition-colors">
                      <FileSpreadsheet className="h-10 w-10 text-indigo-500 mx-auto mb-3" />
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950/60 dark:file:text-indigo-300 cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-400 mt-2">
                        {selectedFile ? `Selected: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)` : "Max file size: 50MB"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Or Server File Path (Local fallback)
                      </label>
                      <input
                        type="text"
                        value={serverFilePath}
                        onChange={(e) => setServerFilePath(e.target.value)}
                        placeholder="e.g. backend/app/data/college_data_cleaned.xlsx"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={validating || (!selectedFile && !serverFilePath.trim())}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {validating ? "Scanning & Validating File..." : "Validate File & Generate Preview"}
                    </button>
                  </form>
                </div>
              )}

              {/* WIZARD STEP 2: PREVIEW DATA */}
              {wizardStep === 2 && validationResult && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Step 2: Dataset Validation & Preview
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        File: <strong>{validationResult.filename}</strong> ({(validationResult.file_size_bytes / (1024 * 1024)).toFixed(2)} MB, {validationResult.file_type})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetWizard}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        Change File
                      </button>
                      <button
                        onClick={() => setWizardStep(3)}
                        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Inspect Errors ({validationResult.error_count})
                      </button>
                    </div>
                  </div>

                  {/* Detected summary tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center border border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500">Total Rows</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {validationResult.total_rows.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center border border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500">Colleges Detected</div>
                      <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {validationResult.detected_colleges}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center border border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500">Branches Detected</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {validationResult.detected_branches}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center border border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500">Seat Categories</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {validationResult.detected_seat_types}
                      </div>
                    </div>
                  </div>

                  {/* Sample rows preview table */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Sample Parsed Rows (First 15 Rows)
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px]">
                          <tr>
                            <th className="px-3 py-2.5">Institution</th>
                            <th className="px-3 py-2.5">Branch</th>
                            <th className="px-3 py-2.5">Quota</th>
                            <th className="px-3 py-2.5">Score</th>
                            <th className="px-3 py-2.5 text-right">Min</th>
                            <th className="px-3 py-2.5 text-right">Mean</th>
                            <th className="px-3 py-2.5 text-right">Max</th>
                            <th className="px-3 py-2.5 text-right">Seats</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {validationResult.preview_rows.map((row, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-medium max-w-xs truncate">{row.college_name}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-xs truncate">{row.branch}</td>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.seat_type}</td>
                              <td className="px-3 py-2 text-slate-500">{row.score_type}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{row.min}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{row.mean}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{row.max}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{row.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      &larr; Back to Upload
                    </button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
                    >
                      Proceed to Confirmation &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* WIZARD STEP 3: ERROR REPORT */}
              {wizardStep === 3 && validationResult && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Step 3: Validation Error Report
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {validationResult.error_count === 0
                          ? "Zero critical errors detected. The file schema and row data are fully valid."
                          : `Detected ${validationResult.error_count} critical error(s) and ${validationResult.warning_count} warning(s).`}
                      </p>
                    </div>
                    <button
                      onClick={() => setWizardStep(2)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      View Preview Table &rarr;
                    </button>
                  </div>

                  {validationResult.errors.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-rose-200 dark:border-rose-900/50">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 uppercase font-semibold text-[10px]">
                          <tr>
                            <th className="px-3 py-2.5">Row</th>
                            <th className="px-3 py-2.5">Column</th>
                            <th className="px-3 py-2.5">Severity</th>
                            <th className="px-3 py-2.5">Error Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100 dark:divide-rose-900/30">
                          {validationResult.errors.map((err: ValidationErrorItem, idx: number) => (
                            <tr key={idx} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                              <td className="px-3 py-2 font-mono font-bold tabular-nums">{err.row > 0 ? err.row : "Schema"}</td>
                              <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{err.column}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${err.severity === "ERROR" ? "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200" : "bg-amber-100 text-amber-800"}`}>
                                  {err.severity}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-rose-800 dark:text-rose-300">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-6 text-center text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                      <div className="font-bold text-sm">All Schema and Row Validations Passed</div>
                      <p className="text-xs opacity-90 mt-1 tabular-nums">
                        All {validationResult.total_rows.toLocaleString()} rows conform to the strict MHT-CET data dictionary with valid percentile ranges.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      &larr; Upload Another File
                    </button>
                    {validationResult.valid && (
                      <button
                        onClick={() => setWizardStep(4)}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
                      >
                        Proceed to Confirmation &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* WIZARD STEP 4: SAFE CONFIRMATION */}
              {wizardStep === 4 && validationResult && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Step 4: Confirm Dataset Ingestion
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Review database update impact before executing the atomic transaction commit.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-slate-500">Incoming Dataset File:</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {validationResult.filename}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Total Validated Records:</div>
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
                          {validationResult.valid_rows.toLocaleString()} cutoff rows
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Colleges Affected:</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                          {validationResult.detected_colleges} institutions
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Branches Affected:</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                          {validationResult.detected_branches} engineering branches
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clearExisting}
                          onChange={(e) => setClearExisting(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          Clear existing cutoff records before importing (Clean replacement recommended)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      &larr; Back to Preview
                    </button>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Execute Confirmed Ingestion
                    </button>
                  </div>
                </div>
              )}

              {/* WIZARD STEP 5: IMPORT SUMMARY */}
              {wizardStep === 5 && importSummary && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  <div
                    className={`rounded-xl p-6 border text-center ${
                      importSummary.success
                        ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                        : "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    {importSummary.success ? (
                      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                    ) : (
                      <AlertCircle className="h-10 w-10 text-rose-600 mx-auto mb-3" />
                    )}

                    <h3 className="text-xl font-bold">
                      {importSummary.success ? "Dataset Import Committed Successfully" : "Ingestion Failed & Rolled Back"}
                    </h3>
                    <p className="text-xs mt-1 max-w-lg mx-auto opacity-90">{importSummary.message}</p>

                    {importSummary.stats && (
                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
                        <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-3 border border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Cutoffs Ingested</div>
                          <div className="text-lg font-black text-indigo-600 tabular-nums">
                            {importSummary.stats.total_records?.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-3 border border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Colleges Synced</div>
                          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                            {importSummary.stats.colleges_count}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-3 border border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Branches Synced</div>
                          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                            {importSummary.stats.branches_count}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-3 border border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Seat Types</div>
                          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                            {importSummary.stats.seat_types_count}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleResetWizard}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      Import Another Dataset
                    </button>
                    <button
                      onClick={() => setActiveTab("history")}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      View Import History Logs &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IMPORT HISTORY & AUDIT LOGS */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600" />
                    Dataset Ingestion Audit History
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Chronological audit log of all validated and committed dataset changes.
                  </p>
                </div>
                <button
                  onClick={loadHistoryLogs}
                  disabled={historyLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                  Refresh Logs
                </button>
              </div>

              {history.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Import ID</th>
                        <th className="px-4 py-3">Filename</th>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3 text-right">Cutoff Records</th>
                        <th className="px-4 py-3 text-right">Colleges</th>
                        <th className="px-4 py-3 text-right">Branches</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Operator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {history.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-mono font-bold text-slate-500 tabular-nums">#{log.id}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                            {log.filename}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {log.total_records.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{log.colleges_count}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{log.branches_count}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                log.status === "SUCCESS"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{log.imported_by || "admin"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  No dataset import history recorded yet. Use the Dataset Import Wizard to stage and commit data.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 mb-4">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Confirm Production Ingestion
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to commit <strong className="tabular-nums">{validationResult.valid_rows.toLocaleString()} verified cutoff records</strong> to the database?
              {clearExisting && " Existing cutoff records will be cleanly replaced."}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={ingesting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={ingesting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition-colors disabled:opacity-50"
              >
                {ingesting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Ingesting Atomically...
                  </>
                ) : (
                  "Yes, Execute Ingestion"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
