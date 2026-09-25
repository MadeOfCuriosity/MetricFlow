import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { ChevronDownIcon, ChevronRightIcon, CalendarDaysIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import type { PendingFieldItem, FieldEntryInput } from '../types/dataField'
import { EntryFieldRow } from './DataEntryForm'
import { INTERVAL_LABELS } from './IntervalBadge'

export interface PendingBatch {
  date: string
  entries: FieldEntryInput[]
}

interface PendingEntriesListProps {
  items: PendingFieldItem[]
  /** One batch per period date */
  onSubmit: (batches: PendingBatch[]) => Promise<void>
  formId: string
  onChangedCountChange?: (count: number) => void
}

const itemKey = (i: PendingFieldItem) => `${i.data_field_id}@${i.period_start}`

function relativeDay(iso: string) {
  const days = differenceInCalendarDays(new Date(), parseISO(iso))
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

/** Missed entries grouped by date (newest first); each value saves to its own period. */
export function PendingEntriesList({ items, onSubmit, formId, onChangedCountChange }: PendingEntriesListProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [emptyWarning, setEmptyWarning] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const byDate = new Map<string, PendingFieldItem[]>()
    items.forEach((i) => byDate.set(i.period_start, [...(byDate.get(i.period_start) ?? []), i]))
    return [...byDate.entries()] // items arrive newest first
  }, [items])

  const changedCount = useMemo(() => Object.values(values).filter((v) => v.trim()).length, [values])
  useEffect(() => {
    onChangedCountChange?.(changedCount)
  }, [changedCount, onChangedCountChange])

  const setValue = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }))
    setEmptyWarning(false)
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const byDate = new Map<string, FieldEntryInput[]>()
    items.forEach((i) => {
      const v = values[itemKey(i)]?.trim()
      if (!v) return
      if (isNaN(parseFloat(v))) newErrors[itemKey(i)] = 'Must be a number'
      else byDate.set(i.period_start, [...(byDate.get(i.period_start) ?? []), { data_field_id: i.data_field_id, value: parseFloat(v) }])
    })
    setErrors(newErrors)
    if (Object.keys(newErrors).length) return
    if (!byDate.size) {
      setEmptyWarning(true)
      return
    }
    await onSubmit([...byDate.entries()].map(([date, entries]) => ({ date, entries })))
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-2 select-none">
        {groups.map(([date, dayItems], index) => {
          const isOpen = !collapsed.has(date)
          return (
            <div key={date} className={index > 0 ? 'mt-1' : ''}>
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev)
                    if (next.has(date)) next.delete(date)
                    else next.add(date)
                    return next
                  })
                }
                aria-expanded={isOpen}
                className="w-full flex items-center h-10 pr-2 rounded-lg hover:bg-dark-800/60 transition-colors text-left cursor-pointer"
              >
                <span className="w-5 flex items-center justify-center flex-shrink-0 text-dark-400">
                  {isOpen ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                </span>
                <CalendarDaysIcon className="h-4 w-4 text-dark-300 flex-shrink-0 mr-2" />
                <span className="text-sm font-semibold text-foreground">{format(parseISO(date), 'EEE, MMM d')}</span>
                <span className="ml-2 text-[11px] text-dark-500">{relativeDay(date)}</span>
                <span className="flex-1" />
                <span className="text-[11px] text-warning-400 tabular-nums">{dayItems.length} missing</span>
              </button>

              {isOpen &&
                dayItems.map((item) => {
                  const key = itemKey(item)
                  const v = values[key] ?? ''
                  const meta = [
                    item.entry_interval !== 'daily' &&
                      `${INTERVAL_LABELS[item.entry_interval]} · ${format(parseISO(item.period_start), 'MMM d')} – ${format(parseISO(item.period_end), 'MMM d')}`,
                    item.room_names.join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <EntryFieldRow
                      key={key}
                      inputId={`pending-${key}`}
                      name={item.data_field_name}
                      meta={meta || undefined}
                      done={false}
                      changed={!!v.trim()}
                      value={v}
                      onChange={(nv) => setValue(key, nv)}
                      unit={item.unit}
                      error={errors[key]}
                    />
                  )
                })}
            </div>
          )
        })}
      </div>

      {emptyWarning && (
        <div className="flex items-center gap-2 p-3.5 bg-warning-500/10 border border-warning-500/20 rounded-2xl">
          <ExclamationCircleIcon className="w-5 h-5 text-warning-400 flex-shrink-0" />
          <p className="text-xs text-warning-400 font-medium">Please enter at least one value before saving.</p>
        </div>
      )}
    </form>
  )
}
