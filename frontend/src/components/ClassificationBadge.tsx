import { CheckCircle2, AlertTriangle, Target, HelpCircle } from "lucide-react";

interface ClassificationBadgeProps {
  classification: "Safe" | "Moderate" | "Reach" | string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function ClassificationBadge({
  classification,
  size = "md",
  showIcon = true
}: ClassificationBadgeProps) {
  const norm = classification.toLowerCase();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-bold gap-2"
  }[size];

  if (norm === "safe") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800 ${sizeClasses}`}
        title="Your percentile exceeds the historical cutoff comfortably. High chance of allotment."
      >
        {showIcon && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
        Safe Match
      </span>
    );
  }

  if (norm === "moderate") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-100/80 text-amber-800 border border-amber-300/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 ${sizeClasses}`}
        title="Your percentile is close to the cutoff boundary. Competitive and realistic match."
      >
        {showIcon && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
        Moderate Match
      </span>
    );
  }

  if (norm === "reach") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-rose-100/80 text-rose-800 border border-rose-300/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 ${sizeClasses}`}
        title="Cutoff is slightly higher than your score. Possible in Round 2, Round 3 or institutional spots."
      >
        {showIcon && <Target className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />}
        Reach / Ambitious
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 ${sizeClasses}`}
    >
      {showIcon && <HelpCircle className="h-3.5 w-3.5 text-slate-500" />}
      {classification}
    </span>
  );
}
