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
import { SegmentedControl } from './ui/SegmentedControl'

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
        return 'bg-brand/25 border border-brand/30 hover:border-brand'
      case 2:
        return 'bg-brand/50 border border-brand/40 hover:border-brand'
      case 3:
        return 'bg-brand/75 border border-brand/50 hover:border-brand'
      case 4:
        return 'bg-brand border border-brand/60 hover:brightness-110'
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
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-500/10 text-success-400 border border-success-500/20">
              {totalActivities} {totalActivities === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <p className="text-[11px] text-dark-400 mt-0.5">Daily data submissions & updates</p>
        </div>

        {/* Header Controls: Range Selector + View All Button */}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="xs"
            surface="inset"
            aria-label="Heatmap range"
            value={range}
            onChange={setRange}
            options={[
              { value: '6m', label: '6 Months' },
              { value: '1y', label: '1 Year' },
            ]}
          />

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
            <div className="w-5 h-5 border-2 border-success-500/30 border-t-success-500 rounded-full animate-spin" />
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
            <FireIcon className="w-3.5 h-3.5 text-brand" />
            <span className="text-dark-400">Streak:</span>
            <span className="font-semibold text-foreground">{currentStreak}d</span>
          </span>
          <span className="text-dark-600">·</span>
          <span className="text-dark-400">
            Best:{' '}
            <span className="font-semibold text-foreground">{longestStreak}d</span>
          </span>
        </div>

        {/* "Less ... More" Legend */}
        <div className="flex items-center gap-1.5 text-dark-400 select-none">
          <span>Less</span>
          <div className="flex items-center gap-[3px]">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-dark-950/90 border border-dark-800/70" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-brand/25 border border-brand/30" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-brand/50 border border-brand/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-brand/75" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-brand" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
