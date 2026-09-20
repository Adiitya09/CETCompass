export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-6 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800 mb-2" />
          <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
          <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800/60 mb-4" />
          <div className="flex items-center justify-between pt-2">
            <div className="h-8 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse">
      <div className="bg-slate-100 dark:bg-slate-800 h-11 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-300 dark:bg-slate-700 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-14 px-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
          <div className="h-8 w-28 bg-slate-300 dark:bg-slate-700 rounded mb-1" />
          <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/80 rounded" />
        </div>
      ))}
    </div>
  );
}
