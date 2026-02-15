import { useState, useRef, useEffect } from 'react'
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday as isDateToday,
  isBefore,
  isAfter,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

export type DateRangePreset = 'all' | 'today' | 'weekly' | 'monthly' | 'quarterly' | 'custom'

export interface DateRange {
  startDate: string | null
  endDate: string | null
}

interface DateRangeSelectorProps {
  onChange: (range: DateRange, preset: DateRangePreset) => void
  defaultPreset?: DateRangePreset
}

const presets: { key: DateRangePreset; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'custom', label: 'Custom' },
]

function getDateRange(preset: DateRangePreset): DateRange {
  const today = format(new Date(), 'yyyy-MM-dd')
  switch (preset) {
    case 'all':
      return { startDate: null, endDate: null }
    case 'today':
      return { startDate: today, endDate: today }
    case 'weekly':
      return { startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'), endDate: today }
    case 'monthly':
      return { startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'), endDate: today }
    case 'quarterly':
      return { startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'), endDate: today }
    default:
      return { startDate: null, endDate: null }
  }
}

export function getPresetLabel(preset: DateRangePreset): string {
  switch (preset) {
    case 'all': return 'All time'
    case 'today': return 'Today'
    case 'weekly': return 'Last 7 days'
    case 'monthly': return 'Last 30 days'
    case 'quarterly': return 'Last 90 days'
    case 'custom': return 'Custom range'
  }
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface CalendarPickerProps {
  value: string
  onChange: (dateStr: string) => void
  label: string
  minDate?: string
  maxDate?: string
}

function CalendarPicker({ value, onChange, label, minDate, maxDate }: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() =>
    value ? new Date(value + 'T00:00:00') : new Date()
  )
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedDate = value ? new Date(value + 'T00:00:00') : null

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const handleDayClick = (day: Date) => {
    if (minDate && isBefore(day, new Date(minDate + 'T00:00:00'))) return
    if (maxDate && isAfter(day, new Date(maxDate + 'T00:00:00'))) return
    onChange(format(day, 'yyyy-MM-dd'))
    setIsOpen(false)
  }

  const isDisabled = (day: Date) => {
    if (minDate && isBefore(day, new Date(minDate + 'T00:00:00'))) return true
    if (maxDate && isAfter(day, new Date(maxDate + 'T00:00:00'))) return true
    return false
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-dark-800 border border-dark-600 text-foreground hover:border-dark-400 transition-colors min-w-[140px]"
      >
        <CalendarDaysIcon className="w-4 h-4 text-dark-400" />
        <span className={value ? 'text-foreground' : 'text-dark-400'}>
          {value ? format(new Date(value + 'T00:00:00'), 'MMM d, yyyy') : label}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-dark-900 border border-dark-600 rounded-xl shadow-lg shadow-black/40 p-4 w-[280px]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-1 rounded-lg text-dark-300 hover:text-foreground hover:bg-dark-700 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1 rounded-lg text-dark-300 hover:text-foreground hover:bg-dark-700 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-dark-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth)
              const selected = selectedDate && isSameDay(day, selectedDate)
              const today = isDateToday(day)
              const disabled = isDisabled(day)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => !disabled && handleDayClick(day)}
                  disabled={disabled}
                  className={`
                    h-8 w-full text-xs rounded-lg transition-colors relative
                    ${disabled ? 'text-dark-600 cursor-not-allowed' : 'cursor-pointer'}
                    ${!inMonth && !disabled ? 'text-dark-600' : ''}
                    ${inMonth && !selected && !disabled ? 'text-dark-200 hover:bg-dark-700' : ''}
                    ${selected ? 'bg-primary-500 text-white font-semibold' : ''}
                    ${today && !selected ? 'font-semibold text-primary-400' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {today && !selected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-700">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className="text-xs text-dark-400 hover:text-dark-200 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = format(new Date(), 'yyyy-MM-dd')
                onChange(today)
                setViewMonth(new Date())
                setIsOpen(false)
              }}
              className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DateRangeSelector({ onChange, defaultPreset = 'all' }: DateRangeSelectorProps) {
  const [activePreset, setActivePreset] = useState<DateRangePreset>(defaultPreset)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePresetClick = (preset: DateRangePreset) => {
    setActivePreset(preset)
    if (preset !== 'custom') {
      onChange(getDateRange(preset), preset)
    }
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ startDate: customStart, endDate: customEnd }, 'custom')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handlePresetClick(key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activePreset === key
              ? 'border border-primary-500 text-foreground'
              : 'bg-dark-800 text-dark-300 hover:bg-dark-600'
          }`}
        >
          {label}
        </button>
      ))}

      {activePreset === 'custom' && (
        <div className="flex items-center gap-2 ml-1">
          <CalendarPicker
            value={customStart}
            onChange={setCustomStart}
            label="Start date"
            maxDate={customEnd || undefined}
          />
          <span className="text-dark-400 text-sm">to</span>
          <CalendarPicker
            value={customEnd}
            onChange={setCustomEnd}
            label="End date"
            minDate={customStart || undefined}
          />
          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-primary-500 text-foreground hover:bg-primary-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
