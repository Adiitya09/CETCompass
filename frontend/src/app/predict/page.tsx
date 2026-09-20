"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";

function PredictRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("percentile")) {
      router.replace(`/results?${searchParams.toString()}`);
    } else {
      router.replace("/predictor");
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Sparkles className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="text-sm font-medium">Navigating to CETCompass...</span>
      </div>
    </div>
  );
}

export default function PredictRedirectPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading CETCompass...</div>}>
      <PredictRedirectContent />
    </Suspense>
  );
}
