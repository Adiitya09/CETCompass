import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Important Disclaimer Notice Box */}
        <div className="mb-10 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 sm:p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex gap-3.5">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200/90 leading-relaxed">
              <strong className="font-semibold block sm:inline mr-1">
                Official Educational Advisory & Disclaimer:
              </strong>
              CETCompass provides data-driven recommendations based on historical cutoff information. Recommendations are informational and do not guarantee admission. This application is an independent educational guidance platform designed to help students analyze historical Maharashtra CET CAP round cutoffs and is <strong>not affiliated with the State Common Entrance Test Cell (CET Cell) or the Directorate of Technical Education (DTE Maharashtra)</strong>. Cutoffs fluctuate annually depending on applicant volume, normalized exam difficulty, and seat capacity.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <div className="mb-3">
              <BrandLogo size="md" asLink={true} showTagline={true} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Empowering students with verified historical cutoff analytics across 326 colleges, 94 branches, and 77 seat categories.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider dark:text-white mb-3">
              Core Tools
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/predictor" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Student Predictor
                </Link>
              </li>
              <li>
                <Link href="/colleges" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  College Directory (326)
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Side-by-Side Comparison
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Saved Shortlists
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider dark:text-white mb-3">
              Major Regions
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/colleges?district=Pune" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Pune District Engineering
                </Link>
              </li>
              <li>
                <Link href="/colleges?district=Mumbai" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Mumbai MMR Colleges
                </Link>
              </li>
              <li>
                <Link href="/colleges?district=Nagpur" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Nagpur & Vidarbha
                </Link>
              </li>
              <li>
                <Link href="/colleges?district=Nashik" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Nashik & North Maharashtra
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider dark:text-white mb-3">
              Data & Standards
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Based on official CAP round institutional cutoff matrices and verified seat distributions.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                MHT-CET
              </span>
              <span className="rounded bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                JEE Main Quota
              </span>
              <span className="rounded bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                TFWS & EWS
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>© {new Date().getFullYear()} CETCompass. Educational recommendation platform.</p>
          <p className="mt-2 sm:mt-0 flex items-center gap-1">
            Engineered with accuracy & care for aspiring engineers.
          </p>
        </div>
      </div>
    </footer>
  );
}
