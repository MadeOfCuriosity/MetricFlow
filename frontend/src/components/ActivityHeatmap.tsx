import { useState, useEffect, useRef } from 'react'
import {
  format,
  subMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  isAfter,
  startOfDay,
} from 'date-fns'
import { FireIcon } from '@heroicons/react/24/solid'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { adminService, ActivityHeatmapResponse } from '../services/admin'

interface ActivityHeatmapProps {
  className?: string
}

type TimeRange = '6m' | '1y'

export function ActivityHeatmap({ className = '' }: ActivityHeatmapProps) {
  const navigate = useNavigate()
  const [range, setRange] = useState<TimeRange>('6m')
  const [data, setData] = useState<ActivityHeatmapResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredCell, setHoveredCell] = useState<{
    date: string
    count: number
  } | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadHeatmap()
  }, [range])

  const loadHeatmap = async () => {
    try {
      setIsLoading(true)
      const days = range === '6m' ? 180 : 365
      const res = await adminService.getActivityHeatmap(days)
      setData(res)
    } catch {
      // Fallback: build empty response
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Scroll to the end (most recent dates) on 1y view
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
    }
  }, [range, data])

  // Build a map of date string -> { count, level }
  const countsMap = new Map<string, { count: number; level: number }>()
  if (data?.days) {
    for (const d of data.days) {
      countsMap.set(d.date, { count: d.count, level: d.level })
    }
  }

  // Compute grid weeks & days
  const today = startOfDay(new Date())
  const monthsBack = range === '6m' ? 6 : 12
  const startDate = startOfWeek(subMonths(today, monthsBack), { weekStartsOn: 0 })
  const endDate = endOfWeek(today, { weekStartsOn: 0 })

  const allDays = eachDayOfInterval({ start: startDate, end: endDate })

  // Group into columns of 7 days (Sunday = 0 to Saturday = 6)
  const weeks: Date[][] = []
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7))
  }

  // Compute month headers: find which week columns contain the start of a month
  const monthLabels: { label: string; weekIndex: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, weekIndex) => {
    const firstDay = week[0]
    const m = firstDay.getMonth()
    if (m !== lastMonth) {
      monthLabels.push({
        label: format(firstDay, 'MMM'),
        weekIndex,
      })
      lastMonth = m
    }
  })

  const getCellColor = (level: number, isFuture: boolean) => {
    if (isFuture) return 'bg-transparent border border-transparent opacity-0 pointer-events-none'
    switch (level) {
      case 1:
        return 'bg-[#0e4429] border border-[#006d32]/40 hover:border-emerald-500'
      case 2:
        return 'bg-[#006d32] border border-[#26a641]/40 hover:border-emerald-400'
      case 3:
        return 'bg-[#26a641] border border-emerald-400/40 hover:border-emerald-300 shadow-xs shadow-emerald-500/20'
      case 4:
        return 'bg-[#39d353] border border-emerald-300/60 hover:brightness-110 shadow-xs shadow-emerald-400/40'
      case 0:
      default:
        return 'bg-dark-950/90 border border-dark-800/70 hover:border-dark-600'
    }
  }

  const totalActivities = data?.total_activities ?? 0
  const currentStreak = data?.current_streak ?? 0
  const longestStreak = data?.longest_streak ?? 0

  return (
    <div
      className={`bg-dark-900 border border-dark-700 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between relative ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground tracking-tight">Activity</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {totalActivities} {totalActivities === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <p className="text-[11px] text-dark-400 mt-0.5">Daily data submissions & updates</p>
        </div>

        {/* Header Controls: Range Selector + View All Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-dark-950 border border-dark-800 rounded-xl">
            {(['6m', '1y'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  range === r
                    ? 'bg-dark-800 text-foreground shadow-sm'
                    : 'text-dark-400 hover:text-foreground'
                }`}
              >
                {r === '6m' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings/activity')}
            className="inline-flex items-center gap-1.5 px-1 py-1 text-xs font-medium text-dark-300 hover:text-foreground transition-colors cursor-pointer group"
            title="Open complete activity log page"
          >
            <span>View all activity</span>
            <ArrowRightIcon className="w-3.5 h-3.5 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Heatmap Matrix Container */}
      <div className="relative my-auto py-2">
        {isLoading ? (
          <div className="h-[140px] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent"
          >
            <div className="inline-block min-w-full">
              {/* Month Header Row */}
              <div className="flex text-[10px] font-medium text-dark-400 mb-1.5 pl-7">
                {weeks.map((_, wIdx) => {
                  const labelItem = monthLabels.find((m) => m.weekIndex === wIdx)
                  return (
                    <div
                      key={wIdx}
                      style={{ width: '12px', marginRight: '3px' }}
                      className="flex-shrink-0 text-left overflow-visible"
                    >
                      {labelItem && (
                        <span className="whitespace-nowrap select-none">{labelItem.label}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Grid: Day labels on left + 7 rows */}
              <div className="flex items-start">
                {/* Mon, Wed, Fri Day Labels */}
                <div className="flex flex-col justify-between pr-2 text-[9px] font-medium text-dark-500 select-none h-[102px] py-0.5">
                  <span className="leading-none">Mon</span>
                  <span className="leading-none">Wed</span>
                  <span className="leading-none">Fri</span>
                </div>

                {/* Week Columns */}
                <div className="flex gap-[3px]">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px] flex-shrink-0">
                      {week.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const isFuture = isAfter(day, today)
                        const entry = countsMap.get(dateStr)
                        const count = entry ? entry.count : 0
                        const level = entry ? entry.level : 0

                        return (
                          <div
                            key={dateStr}
                            onMouseEnter={() => {
                              if (!isFuture) {
                                setHoveredCell({
                                  date: dateStr,
                                  count,
                                })
                              }
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`w-[12px] h-[12px] rounded-[2.5px] transition-all cursor-pointer ${getCellColor(
                              level,
                              isFuture
                            )}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hover Information / Detail Bar */}
      <div className="h-6 flex items-center justify-center text-xs text-dark-300 font-medium my-1">
        {hoveredCell ? (
          <span>
            <span className="font-semibold text-foreground">
              {hoveredCell.count === 0 ? 'No' : hoveredCell.count}{' '}
              {hoveredCell.count === 1 ? 'activity' : 'activities'}
            </span>{' '}
            on{' '}
            <span className="text-dark-200">
              {format(parseISO(hoveredCell.date), 'EEEE, MMM d, yyyy')}
            </span>
          </span>
        ) : (
          <span className="text-dark-500 text-[11px]">Hover over any cell to see activity count</span>
        )}
      </div>

      {/* Footer: Streaks on Left + Less/More Legend on Right */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dark-800/80 text-[11px]">
        {/* Streak summary */}
        <div className="flex items-center gap-3 text-dark-400">
          <span className="flex items-center gap-1 font-medium">
            <FireIcon className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-dark-400">Streak:</span>
            <span className="font-semibold text-foreground">{currentStreak}d</span>
          </span>
          <span className="text-dark-600">·</span>
          <span className="text-dark-400">
            Best:{' '}
            <span className="font-semibold text-foreground">{longestStreak}d</span>
          </span>
        </div>

        {/* GitHub "Less ... More" Legend */}
        <div className="flex items-center gap-1.5 text-dark-400 select-none">
          <span>Less</span>
          <div className="flex items-center gap-[3px]">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-dark-950/90 border border-dark-800/70" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0e4429] border border-[#006d32]/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#006d32] border border-[#26a641]/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#26a641]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#39d353]" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
