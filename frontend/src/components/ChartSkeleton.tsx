const BAR_HEIGHTS = [65, 45, 80, 55, 90, 40, 70, 60, 85, 50, 75, 35]

interface Props {
  height?: number
  variant?: 'bars' | 'donut' | 'horizontal'
}

export function ChartSkeleton({ height = 200, variant = 'bars' }: Props) {
  if (variant === 'donut') {
    return (
      <div className="animate-pulse flex flex-col items-center justify-center gap-4" style={{ height }}>
        <div className="relative w-36 h-36 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-card" />
        </div>
        <div className="w-full space-y-2 px-2">
          {[100, 60, 80, 50, 70].map((w, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" style={{ width: w }} />
              </div>
              <div className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'horizontal') {
    return (
      <div className="animate-pulse space-y-3 px-2" style={{ height }}>
        {[80, 60, 90, 45, 70].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded shrink-0" />
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-r-lg" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="animate-pulse flex items-end gap-1.5 px-2" style={{ height }}>
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}
