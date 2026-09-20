"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { BranchItem, SeatTypeItem } from "@/types";

const STEPS = [
  { id: 1, title: "CET Details", desc: "Score & Exam Type" },
  { id: 2, title: "Category", desc: "Quota & Seat Type" },
  { id: 3, title: "Branches", desc: "Disciplines" },
  { id: 4, title: "Locations", desc: "Districts & Regions" },
  { id: 5, title: "Review", desc: "Confirm & Submit" },
];

function PredictorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State initialized from URL params if present (e.g. from homepage quick form or dashboard)
  const [percentile, setPercentile] = useState<string>(() => searchParams.get("percentile") || "92.5");
  const [scoreType, setScoreType] = useState<string>(() => searchParams.get("score_type") || "MHT-CET");
  const [seatType, setSeatType] = useState<string>(() => searchParams.get("seat_type") || "GOPENS");
  const [selectedBranches, setSelectedBranches] = useState<string[]>(() => {
    const raw = searchParams.get("branches");
    return raw ? raw.split(",").map((b) => b.trim()).filter(Boolean) : [];
  });
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(() => {
    const d = searchParams.get("district");
    if (d) return [d];
    const dists = searchParams.get("districts");
    return dists ? dists.split(",").map((d) => d.trim()).filter(Boolean) : ["Pune"];
  });

  // Metadata from API
  const [branchesGrouped, setBranchesGrouped] = useState<Record<string, BranchItem[]>>({});
  const [locations, setLocations] = useState<{ district: string; region: string; colleges_count: number }[]>([]);
  const [seatTypesGrouped, setSeatTypesGrouped] = useState<Record<string, SeatTypeItem[]>>({});
  const [allSeatTypes, setAllSeatTypes] = useState<SeatTypeItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getBranches(),
      api.getLocations(),
      api.getSeatTypes()
    ])
      .then(([bData, lData, sData]) => {
        setBranchesGrouped(bData.grouped || {});
        setLocations(lData.districts || []);
        setSeatTypesGrouped(sData.grouped || {});
        setAllSeatTypes(sData.all_seat_types || []);
      })
      .catch((err) => {
        console.error("Failed to load predictor metadata:", err);
        setErrorMsg("Failed to load metadata options. Please check your backend connection.");
      });
  }, []);

  const handleNext = () => {
    if (currentStep === 1) {
      const p = parseFloat(percentile);
      if (isNaN(p) || p < 0 || p > 100) {
        setErrorMsg("Please enter a valid percentile between 0.00 and 100.00");
        return;
      }
    }
    setErrorMsg(null);
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const toggleBranch = (branchName: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchName) ? prev.filter((b) => b !== branchName) : [...prev, branchName]
    );
  };

  const toggleDistrict = (districtName: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(districtName) ? prev.filter((d) => d !== districtName) : [...prev, districtName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams({
      percentile: percentile || "90.0",
      score_type: scoreType,
      seat_type: seatType,
    });

    if (selectedBranches.length > 0) {
      query.set("branches", selectedBranches.join(","));
    }
    if (selectedDistricts.length > 0) {
      query.set("districts", selectedDistricts.join(","));
    }

    router.push(`/results?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 mb-3">
            <Sparkles className="h-4 w-4" />
            5-Step Guided Recommendation Form
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Find Colleges That Match Your CET Profile
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Enter your percentile, preferred branch, and seat type to explore colleges based on historical cutoff trends.
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mb-6 rounded-xl bg-white p-3 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="grid grid-cols-5 gap-2">
            {STEPS.map((step) => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all mb-1 ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-200 dark:ring-indigo-800"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span className={`text-[11px] font-medium truncate hidden sm:block ${isCurrent ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-500"}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleSubmit}>
            
            {/* STEP 1: CET DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in-50">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Step 1: Enter Entrance Examination Performance
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Provide your percentile score as published by the state admission authority (CET Cell).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Entrance Exam Score Type
                    </label>
                    <select
                      value={scoreType}
                      onChange={(e) => setScoreType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="MHT-CET">MHT-CET (Maharashtra Common Entrance Test)</option>
                      <option value="JEE Main">JEE Main (All India Merit Seats)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Percentile Score (0.00 to 100.00)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        value={percentile}
                        onChange={(e) => setPercentile(e.target.value)}
                        placeholder="e.g. 94.50"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white tabular-nums"
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">
                        %ile
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score guide alert */}
                <div className="rounded-lg bg-indigo-50/60 p-3.5 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                  <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Tip:</span> Entering your exact percentile with decimals (e.g. 92.45) provides maximum classification accuracy against historical CAP cutoffs.
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SEAT CATEGORY & QUOTA */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Step 2: Select Your Seat Category & Quota
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Choose the seat type code representing your reservation, university area, and gender preference.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Seat Type / Category Allotment Code
                    </label>
                    <select
                      value={seatType}
                      onChange={(e) => setSeatType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {Object.keys(seatTypesGrouped).length > 0 ? (
                        Object.entries(seatTypesGrouped).map(([cat, items]) => (
                          <optgroup key={cat} label={`Category: ${cat}`}>
                            {items.map((st) => (
                              <option key={st.code} value={st.code}>
                                {st.code} — {st.description || `${st.category} (${st.quota_scope || "State"})`}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      ) : allSeatTypes.length > 0 ? (
                        allSeatTypes.map((st) => (
                          <option key={st.code} value={st.code}>
                            {st.code} — {st.description || st.category}
                          </option>
                        ))
                      ) : (
                        <option value="GOPENS">GOPENS — General Open (State Level)</option>
                      )}
                    </select>
                  </div>

                  {(() => {
                    const currentSeat = allSeatTypes.find((s) => s.code === seatType);
                    return (
                      <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Active Quota Code: <span className="font-mono text-indigo-600 dark:text-indigo-400">{seatType}</span>
                          </span>
                          {currentSeat && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="rounded bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                                {currentSeat.category}
                              </span>
                              {currentSeat.quota_scope && (
                                <span className="rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-slate-700 dark:text-slate-300">
                                  Scope: {currentSeat.quota_scope}
                                </span>
                              )}
                              {currentSeat.gender && (
                                <span className="rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-slate-700 dark:text-slate-300">
                                  {currentSeat.gender}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                          {currentSeat?.description
                            ? currentSeat.description
                            : `Matches historical cutoffs allocated specifically under ${seatType} reservation criteria across all 326 colleges.`}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* STEP 3: BRANCH PREFERENCES */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in-50">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Step 3: Engineering Branch Preferences
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select your preferred disciplines. Leave blank to consider all 94 available branches.
                  </p>
                </div>

                {/* Popular Quick Selects */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    "Computer Engineering",
                    "Information Technology",
                    "Computer Science and Engineering",
                    "Artificial Intelligence and Data Science",
                    "Electronics and Telecommunication Engg",
                    "Mechanical Engineering",
                    "Civil Engineering",
                    "Electrical Engineering"
                  ].map((br) => {
                    const isSel = selectedBranches.includes(br);
                    return (
                      <button
                        key={br}
                        type="button"
                        onClick={() => toggleBranch(br)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                          isSel
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {br} {isSel && "✓"}
                      </button>
                    );
                  })}
                </div>

                {/* Detailed Categorized Branches */}
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-4">
                  {Object.entries(branchesGrouped).map(([category, branches]) => (
                    <div key={category}>
                      <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                        {category} ({branches.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {branches.map((b: BranchItem) => {
                          const isSel = selectedBranches.includes(b.name);
                          return (
                            <label
                              key={b.id}
                              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => toggleBranch(b.name)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className={isSel ? "font-semibold text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}>
                                {b.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedBranches.length === 0
                    ? "No specific branch filter selected (Showing all branches)."
                    : `${selectedBranches.length} branch(es) selected.`}
                </div>
              </div>
            )}

            {/* STEP 4: LOCATION PREFERENCES */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in-50">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Step 4: Location & District Preferences
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select target districts or leave blank for all Maharashtra colleges.
                  </p>
                </div>

                {/* Popular Districts */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {["Pune", "Mumbai", "Nagpur", "Nashik", "Kolhapur", "Thane", "Chhatrapati Sambhajinagar"].map((dist) => {
                    const isSel = selectedDistricts.includes(dist);
                    return (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => toggleDistrict(dist)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                          isSel
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {dist} {isSel && "✓"}
                      </button>
                    );
                  })}
                </div>

                {/* All Districts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  {locations.map((loc) => {
                    const isSel = selectedDistricts.includes(loc.district);
                    return (
                      <label
                        key={loc.district}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleDistrict(loc.district)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={isSel ? "font-semibold text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}>
                          {loc.district} ({loc.colleges_count})
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDistricts.length === 0
                    ? "All 34 districts in Maharashtra included."
                    : `${selectedDistricts.length} district(s) selected.`}
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & SUBMIT */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in-50">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Step 5: Review Preferences & Run Predictor
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Confirm your details before running the historical cutoff recommendation algorithm.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/40 divide-y divide-slate-200 dark:divide-slate-700 space-y-3">
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Score & Exam:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {percentile}%ile ({scoreType})
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Seat Category:</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {seatType}
                    </span>
                  </div>

                  <div className="flex justify-between items-start pt-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Branches:</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 text-right max-w-xs">
                      {selectedBranches.length === 0 ? "All Branches" : selectedBranches.join(", ")}
                    </span>
                  </div>

                  <div className="flex justify-between items-start pt-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Districts:</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 text-right max-w-xs">
                      {selectedDistricts.length === 0 ? "All Maharashtra" : selectedDistricts.join(", ")}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3.5 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    Algorithm Disclaimer
                  </div>
                  Recommendations are calculated strictly using verified historical CAP round cutoffs. This platform provides statistical guidance and does not guarantee admission.
                </div>
              </div>
            )}

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-8">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
                >
                  Next Step
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Recommendations
                </button>
              )}
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default function PredictorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-12 text-center text-slate-500">Loading predictor...</div>}>
      <PredictorContent />
    </Suspense>
  );
}
