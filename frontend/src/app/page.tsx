"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  ArrowRight, 
  Scale, 
  Award, 
  ShieldCheck, 
  ChevronDown 
} from "lucide-react";
import { api } from "@/lib/api";
import { SystemStats } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  
  // Quick predictor state
  const [percentile, setPercentile] = useState<string>("92.5");
  const [seatType, setSeatType] = useState<string>("GOPENS");
  const [district, setDistrict] = useState<string>("Pune");
  const [locations, setLocations] = useState<{ district: string; region: string; colleges_count: number }[]>([]);
  const [seatTypes, setSeatTypes] = useState<{ code: string; category?: string; description?: string }[]>([]);

  // FAQ open index state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((err) => console.error("Could not fetch stats:", err));

    api.getLocations()
      .then((data) => setLocations(data.districts || []))
      .catch((err) => console.error("Could not fetch locations:", err));

    api.getSeatTypes()
      .then((data) => setSeatTypes(data.all_seat_types || []))
      .catch((err) => console.error("Could not fetch seat types:", err));
  }, []);

  const handleQuickPredict = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams({
      percentile: percentile || "90.0",
      seat_type: seatType,
      district: district
    });
    router.push(`/predictor?${query.toString()}`);
  };

  const faqs = [
    {
      q: "How does CETCompass determine Safe, Moderate, and Reach categories?",
      a: "Our algorithm evaluates your MHT-CET score against verified CAP round cutoff metrics (Minimum, Mean, Maximum, and sample size). If your score is at least 3.0 percentile above the historical cutoff threshold and meets the admitted cohort mean, it is marked Safe. If you are within 0 to 3 percentiles, it is Moderate. If you are within -4.0 percentiles, it is classified as Reach."
    },
    {
      q: "Does this predictor guarantee college admission?",
      a: "No. In accordance with state admission guidelines, historical cutoffs fluctuate yearly depending on candidate volumes, seat matrix adjustments, and exam normalization. This system is designed as an educational guidance and option-form planning tool, not an admission guarantee."
    },
    {
      q: "Which entrance exams and seat categories are supported?",
      a: "We support both MHT-CET and JEE Main score types across all 77 official seat allotment categories in Maharashtra, including GOPENS, GOPENH, TFWS, EWS, OBC, SC, ST, and specialized quota seats."
    },
    {
      q: "Can I compare multiple colleges side-by-side?",
      a: "Yes! Use our College Comparison tool to compare between 2 and 3 colleges simultaneously across branches, cutoff percentiles, and university status."
    },
    {
      q: "Are the statistics shown on this website real?",
      a: "Yes. All numbers, cutoff thresholds, and college names are indexed directly from the audited historical dataset containing 326 colleges, 94 branches, 77 seat categories, and 28,377 cutoff entries."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative bg-slate-50/50 dark:bg-slate-950 py-12 lg:py-20 border-b border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Headlines & Value Prop */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Verified MHT-CET Admissions Analytics
              </div>

              <div className="space-y-1">
                <p className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                  CETCompass
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Navigate Your Engineering Future
                </h1>
              </div>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Find engineering colleges that match your MHT-CET percentile, preferred branch, and seat type using historical cutoff data.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                <Link
                  href="/colleges"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  Explore Colleges
                </Link>

                <Link
                  href="/predictor"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Predict My Colleges
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>No Fabricated Data</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>28,377 Historical Cutoffs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>77 Official Quotas</span>
                </div>
              </div>
            </div>

            {/* Right Column: Quick CET Predictor Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Quick Cutoff Check
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Instant estimation by percentile & quota
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    MHT-CET
                  </span>
                </div>

                <form onSubmit={handleQuickPredict} className="space-y-4">
                  {/* Percentile Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Your CET Percentile (0 - 100)
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
                        placeholder="e.g. 92.50"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white tabular-nums"
                      />
                      <span className="absolute right-3.5 top-2 text-xs font-semibold text-slate-400">
                        %ile
                      </span>
                    </div>
                  </div>

                  {/* Seat Category Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Seat Category / Quota
                    </label>
                    <select
                      value={seatType}
                      onChange={(e) => setSeatType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {seatTypes.length > 0 ? (
                        seatTypes.map((st) => (
                          <option key={st.code} value={st.code}>
                            {st.code} ({st.category || st.code})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="GOPENS">GOPENS (General Open - State Level)</option>
                          <option value="GOPENH">GOPENH (General Open - Home University)</option>
                          <option value="GOPENO">GOPENO (General Open - Other Univ)</option>
                          <option value="TFWS">TFWS (Tuition Fee Waiver Scheme)</option>
                          <option value="EWS">EWS (Economically Weaker Section)</option>
                          <option value="AI">AI (All India Merit / JEE)</option>
                          <option value="GOBCH">GOBCH (General OBC - Home Univ)</option>
                          <option value="GSCH">GSCH (General SC - Home Univ)</option>
                          <option value="GSTH">GSTH (General ST - Home Univ)</option>
                          <option value="LOPENS">LOPENS (Ladies Open - State Level)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Preferred Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target District / City
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {locations.length > 0 ? (
                        locations.map((loc) => (
                          <option key={loc.district} value={loc.district}>
                            {loc.district} ({loc.colleges_count} colleges)
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Pune">Pune District</option>
                          <option value="Mumbai">Mumbai MMR</option>
                          <option value="Nagpur">Nagpur</option>
                          <option value="Nashik">Nashik</option>
                          <option value="Kolhapur">Kolhapur</option>
                          <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                          <option value="Ahmednagar">Ahmednagar</option>
                          <option value="Thane">Thane</option>
                        </>
                      )}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Predict My Colleges
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. REAL DATASET STATISTICS TICKER */}
      <section className="border-y border-slate-200 bg-slate-50/70 py-8 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Verified Platform Statistics • Historical Dataset
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stats ? stats.colleges_count : "326"}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Accredited Colleges
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
                {stats ? stats.cutoff_records_count.toLocaleString() : "28,377"}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Historical Cutoffs
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stats ? stats.branches_count : "94"}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Engineering Branches
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stats ? stats.seat_types_count : "77"}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Seat Categories
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              Transparent Methodology
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              How CETCompass Classifies Your Colleges
            </h3>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Unlike black-box tools with fake probabilities, we use actual historical CAP round cutoff statistics (Min, Mean, Max, Cohort Size) to give you honest, actionable guidance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Safe */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white mb-4 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                Margin: &ge; +3.00%tile
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Safe Colleges
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Your score comfortably exceeds the historical cutoff threshold and meets the admitted cohort mean. High probability of seat allotment in CAP Round 1 or 2.
              </p>
            </div>

            {/* Moderate */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white mb-4 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                Margin: 0.00 to +3.00%tile
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Moderate / Target
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Your percentile matches or marginally exceeds the previous cutoff. These are realistic, competitive target institutions that should form the core of your CAP option form.
              </p>
            </div>

            {/* Reach */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600 text-white mb-4 shadow-sm">
                <Target className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1">
                Margin: -4.00 to 0.00%tile
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Reach / Ambitious
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                The cutoff was slightly higher than your current score. These aspirational choices are worth listing at the top of your preference list for subsequent rounds or spot admissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              Comprehensive Tools
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Everything You Need For Your CAP Option Form
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">5-Step Predictor Wizard</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Tailor your recommendations by CET score, seat quota, preferred branch clusters, and locations.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Scale className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Side-by-Side Comparison</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Compare cutoffs, branches, and locations across up to 3 engineering colleges on a single comparative matrix.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Shortlist & Notes</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bookmark colleges with custom notes and review your past prediction history directly from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY USE CETCOMPASS */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
                Ethical Admissions Guidance
              </h2>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl mb-6">
                Why Students Trust CETCompass
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Zero Fake Admission Guarantees</h5>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      We never promise 100% admission. Our results transparently explain cutoff deltas so you can evaluate real competition.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Audited MHT-CET Historical Data</h5>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      28,377 official records with min, mean, and max cutoff percentiles, strictly derived from state CAP round seat allocations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Full Maharashtra Regional Coverage</h5>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      All 326 colleges mapped to 34 districts including Pune, Mumbai MMR, Vidarbha, Konkan, and Marathwada.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 p-7 text-white border border-slate-800 shadow-md">
              <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                Transparent Decision Framework
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
                Admissions to Maharashtra engineering colleges under DTE/CET Cell depend on multiple factors. Use this rule of thumb when filling your CAP option form:
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="rounded-lg bg-slate-800/90 p-3 border border-slate-700/60">
                  <span className="font-bold text-emerald-400">Choices 1 - 5:</span> Aspirational / Reach options (dream colleges slightly above your percentile).
                </div>
                <div className="rounded-lg bg-slate-800/90 p-3 border border-slate-700/60">
                  <span className="font-bold text-amber-400">Choices 6 - 15:</span> Moderate / Target institutions where your percentile closely aligns.
                </div>
                <div className="rounded-lg bg-slate-800/90 p-3 border border-slate-700/60">
                  <span className="font-bold text-indigo-400">Choices 16+:</span> Safe institutions guaranteeing seat security in initial allotment rounds.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              Got Questions?
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm sm:text-base font-semibold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${openFaq === idx ? "rotate-180 text-indigo-600" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA BANNER */}
      <section className="bg-indigo-600 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to Navigate Your Engineering Future?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-indigo-100 max-w-xl mx-auto">
            Get personalized Safe, Moderate, and Reach college recommendations tailored to your exact score in seconds.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/predictor"
              className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Predict My Colleges
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
