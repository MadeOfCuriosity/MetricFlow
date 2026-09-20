import { Link } from 'react-router-dom'
import type { DashboardData } from '../../hooks/useDashboardData'
import { useTheme } from '../../context/ThemeContext'

interface TodayProgressWidgetProps {
  data: DashboardData
}

export function TodayProgressWidget({ data }: TodayProgressWidgetProps) {
  const { todayForm } = data
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  if (!todayForm || todayForm.total_count === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className={`text-sm ${isDark ? 'text-white/40' : 'text-dark-400'}`}>No KPIs to track today</p>
      </div>
    )
  }

  const completionPercentage =
    Math.round((todayForm.completed_count / todayForm.total_count) * 100) || 0

  // Formatted date like "July 28" in the reference image
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const dueLabel = `Due ${dateStr}`

  // Slice first 3 KPIs for collaborator-style visual cards
  const previewKpis = todayForm.kpis.slice(0, 3)

  return (
    <div className="h-full flex flex-col justify-between select-none py-1">
      {/* Top Section */}
      <div>
        {/* Starburst Icon matching reference */}
        <div className="mb-2">
          <svg
            className={`w-5 h-5 ${isDark ? 'text-white/90' : 'text-dark-100'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="12" y1="2" x2="12" y2="5.5" />
            <line x1="12" y1="18.5" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5.5" y2="12" />
            <line x1="18.5" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="7.4" y2="7.4" />
            <line x1="16.6" y1="16.6" x2="19.07" y2="19.07" />
            <line x1="4.93" y1="19.07" x2="7.4" y2="16.6" />
            <line x1="16.6" y1="7.4" x2="19.07" y2="4.93" />
          </svg>
        </div>

        {/* Title row with pill badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className={`text-base sm:text-lg font-semibold tracking-tight ${isDark ? 'text-white' : 'text-dark-50'}`}>
            Today's Progress
          </h2>
          <span
            className={`px-3 py-0.5 rounded-full text-xs font-normal ${
              isDark
                ? 'bg-white/[0.06] border border-white/10 text-white/70'
                : 'bg-black/[0.04] border border-black/[0.08] text-dark-300'
            }`}
          >
            {todayForm.completed_count} of {todayForm.total_count} completed
          </span>
        </div>

        {/* Huge Percentage */}
        <div className="mt-1 sm:mt-2 flex items-baseline">
          <span
            className={`text-4xl sm:text-5xl font-bold tracking-tight leading-none ${
              isDark ? 'text-white' : 'text-foreground'
            }`}
          >
            {completionPercentage}
          </span>
          <span
            className={`text-2xl sm:text-3xl font-medium ml-0.5 ${
              isDark ? 'text-white/45' : 'text-dark-400'
            }`}
          >
            %
          </span>
        </div>
      </div>

      {/* Middle Section: Glowing Gradient Progress Bar */}
      <div className="my-3 relative">
        <div
          className={`h-11 sm:h-12 w-full rounded-full p-1 flex items-center relative overflow-hidden ${
            isDark
              ? 'bg-[#27292e]/80 border border-white/5'
              : 'bg-dark-850/80 border border-dark-700/60 shadow-inner'
          }`}
        >
          {/* Filled bar with lime-to-cyan neon gradient & soft outer glow */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
            style={{
              width: `${Math.max(completionPercentage, 8)}%`,
              background: 'linear-gradient(90deg, #bcf346 0%, #46ec9d 50%, #29e2c6 100%)',
              boxShadow: isDark
                ? '0 0 22px 3px rgba(41, 226, 198, 0.45), 0 0 10px 1px rgba(188, 243, 70, 0.35)'
                : '0 0 14px 2px rgba(41, 226, 198, 0.35)',
            }}
          />

          {/* "Due July 28" capsule badge floating on the right side of the track */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <span
              className={`inline-flex items-center px-3.5 py-1.5 rounded-full backdrop-blur-md text-xs font-medium border shadow-sm ${
                isDark
                  ? 'bg-[#3a3d44]/80 text-white/90 border-white/10'
                  : 'bg-white/90 text-dark-100 border-black/[0.08]'
              }`}
            >
              {dueLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Collaborators/KPIs stack + "More details →" button */}
      <div className="flex items-end justify-between gap-4 pt-1">
        {/* Left: Collaborator / KPI Cards */}
        <div>
          <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-dark-400'}`}>
            Active KPIs {todayForm.total_count}
          </p>
          <div className="flex items-center gap-1.5">
            {previewKpis.map((kpi, idx) => {
              const initials = kpi.kpi_name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

              return (
                <div
                  key={kpi.kpi_id || idx}
                  title={kpi.kpi_name}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-semibold transition-all ${
                    kpi.has_entry_today
                      ? isDark
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                      : isDark
                      ? 'bg-white/[0.05] border-white/10 text-white/70'
                      : 'bg-white border-dark-700/80 text-dark-200 shadow-sm'
                  }`}
                >
                  {initials}
                </div>
              )
            })}
            {todayForm.total_count > 3 && (
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-medium ${
                  isDark
                    ? 'border-white/10 bg-white/[0.03] text-white/50'
                    : 'border-dark-700/80 bg-black/[0.03] text-dark-400'
                }`}
              >
                +{todayForm.total_count - 3}
              </div>
            )}
          </div>
        </div>

        {/* Right: Pill Button "More details →" */}
        <Link
          to="/entries"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold transition-all backdrop-blur-xl shadow-sm active:scale-95 ${
            isDark
              ? 'bg-white/[0.08] hover:bg-white/[0.14] border-white/10 text-white hover:border-white/20'
              : 'bg-black/[0.05] hover:bg-black/[0.09] border-black/[0.08] text-dark-100 hover:border-black/[0.15]'
          }`}
        >
          <span>More details</span>
          <span className={isDark ? 'text-white/60' : 'text-dark-400'}>→</span>
        </Link>
      </div>
    </div>
  )
}
