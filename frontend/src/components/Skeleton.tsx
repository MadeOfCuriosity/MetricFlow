interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton rounded ${className}`} style={style} />
}

export function KPICardSkeleton() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}

export function InsightCardSkeleton() {
  return (
    <div className="p-4 bg-dark-700/50 border border-dark-600 rounded-xl">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="h-64 flex items-end justify-around gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPIs and Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI cards skeleton */}
          <div>
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </div>
          </div>

          {/* Chart skeleton */}
          <ChartSkeleton />
        </div>

        {/* Sidebar content */}
        <div className="space-y-6">
          {/* Insights skeleton */}
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
              <InsightCardSkeleton />
              <InsightCardSkeleton />
              <InsightCardSkeleton />
            </div>
          </div>

          {/* Progress skeleton */}
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
            <Skeleton className="h-5 w-36 mb-4" />
            <Skeleton className="h-2 w-full rounded-full mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DataEntrySkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-48 rounded-lg" />
      </div>

      {/* Progress skeleton */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Form skeleton */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-dark-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
