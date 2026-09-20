import Link from "next/link";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  asLink?: boolean;
}

export function CompassIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer compass ring */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        className="opacity-90"
      />
      {/* Subtle cardinal markers */}
      <path
        d="M12 2.5V4M12 20V21.5M2.5 12H4M20 12H21.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="opacity-50"
      />
      {/* North needle tip (filled & sharp) */}
      <polygon
        points="12,5.5 14.5,12 12,10.8"
        fill="currentColor"
      />
      <polygon
        points="12,5.5 9.5,12 12,10.8"
        fill="currentColor"
        fillOpacity="0.8"
      />
      {/* South needle tip */}
      <polygon
        points="12,18.5 14.5,12 12,13.2"
        fill="currentColor"
        fillOpacity="0.45"
      />
      <polygon
        points="12,18.5 9.5,12 12,13.2"
        fill="currentColor"
        fillOpacity="0.3"
      />
      {/* Central pivot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function BrandLogo({
  size = "md",
  showText = true,
  showTagline = true,
  className = "",
  asLink = false
}: BrandLogoProps) {
  const iconBoxSizes = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-9 w-9 rounded-lg",
    lg: "h-11 w-11 rounded-xl"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const titleSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl"
  };

  const taglineSizes = {
    sm: "text-[10px]",
    md: "text-[11px]",
    lg: "text-xs"
  };

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Compass emblem */}
      <div
        className={`flex ${iconBoxSizes[size]} items-center justify-center bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105 shrink-0`}
      >
        <CompassIcon className={iconSizes[size]} />
      </div>

      {/* Brand title & tagline */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className={`${titleSizes[size]} font-bold tracking-tight text-slate-900 dark:text-white leading-none`}>
            CET<span className="text-indigo-600 dark:text-indigo-400">Compass</span>
          </span>
          {showTagline && (
            <span className={`${taglineSizes[size]} font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5`}>
              Navigate Your Engineering Future
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" className="inline-flex items-center group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
