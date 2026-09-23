import { useState, useEffect, useCallback } from 'react'
import { format, subDays, addDays, isToday, isFuture } from 'date-fns'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { DataEntryForm } from '../components'
import { dataFieldsApi } from '../services/dataFields'
import type { TodayFieldFormResponse, FieldEntryInput, EntryInterval } from '../types/dataField'

type SubmissionStatus = 'idle' | 'success' | 'error'

const activeTab: EntryInterval = 'daily'

function formatPeriodLabel(date: Date): string {
  return isToday(date) ? 'Today' : format(date, 'MMM d, yyyy')
}

export function Entries() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [formData, setFormData] = useState<TodayFieldFormResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchFormData = useCallback(async (date: Date, interval: EntryInterval) => {
    setIsLoading(true)
    setSubmissionStatus('idle')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const data = await dataFieldsApi.getTodayFieldForm(dateStr, interval)
      setFormData(data)
    } catch (error) {
      console.error('Failed to fetch form data:', error)
      setFormData(null)
      setErrorMessage('Failed to load data fields. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFormData(selectedDate, activeTab)
  }, [selectedDate, fetchFormData])

  const isAtCurrentPeriod = isToday(selectedDate)

  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate((current) => {
      const newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
      if (isFuture(newDate)) return current
      return newDate
    })
  }

  const handleSubmit = async (entries: FieldEntryInput[]) => {
    setIsSubmitting(true)
    setSubmissionStatus('idle')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const result = await dataFieldsApi.submitFieldEntries({
        date: dateStr,
        entries,
      })

      setSubmissionStatus('success')
      const kpiMsg =
        result.kpis_recalculated > 0
          ? `, ${result.kpis_recalculated} KPI${result.kpis_recalculated > 1 ? 's' : ''} auto-calculated`
          : ''
      setSuccessMessage(
        `${result.entries_created} entr${result.entries_created > 1 ? 'ies' : 'y'} saved${kpiMsg}`
      )

      await fetchFormData(selectedDate, activeTab)

      setTimeout(() => {
        setSubmissionStatus('idle')
        setSuccessMessage(null)
      }, 5000)
    } catch (err: unknown) {
      console.error('Failed to submit entries:', err)
      setSubmissionStatus('error')
      const error = err as { response?: { data?: { detail?: unknown }; status?: number } }
      const detail = error.response?.data?.detail
      const statusCode = error.response?.status

      if (Array.isArray(detail)) {
        const fieldErrors = detail.map((e: { loc?: string[]; msg?: string }) => {
          const loc = e.loc ? e.loc.slice(-1)[0] : ''
          return loc ? `${loc}: ${e.msg}` : e.msg
        })
        setErrorMessage(`Validation errors:\n${fieldErrors.join('\n')}`)
      } else if (typeof detail === 'string') {
        setErrorMessage(detail)
      } else if (statusCode === 403) {
        setErrorMessage("You don't have permission to enter data for some of these fields.")
      } else if (statusCode === 404) {
        setErrorMessage('Some data fields were not found. The page may be out of date - try refreshing.')
      } else {
        setErrorMessage(`Failed to save entries (${statusCode || 'network error'}). Please try again.`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const completionPercentage = formData
    ? Math.round((formData.completed_count / formData.total_count) * 100) || 0
    : 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Entry</h1>
        <p className="text-dark-300 mt-1 text-sm">
          Enter daily data values to track day-to-day operations.
        </p>
      </div>

      {/* Subtle Summary Stat Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <CalendarDaysIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Period:</span>
          <span className="font-semibold text-foreground">
            {formatPeriodLabel(selectedDate)}
          </span>
        </div>

        {formData && formData.total_count > 0 && (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
              <DocumentCheckIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
              <span className="text-dark-400">Completed:</span>
              <span className="font-semibold text-foreground">
                {formData.completed_count} / {formData.total_count}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  completionPercentage === 100 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-dark-400">Progress:</span>
              <span className="font-semibold text-foreground">{completionPercentage}%</span>
            </div>
          </>
        )}
      </div>

      {/* Toolbar: Date Navigation */}
      <div className="flex items-center justify-end gap-3">
        {/* Date Picker Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleDateChange('prev')}
            className="p-1.5 text-dark-400 hover:text-foreground bg-dark-900 hover:bg-dark-800 border border-dark-700 rounded-xl transition-colors cursor-pointer"
            title="Previous period"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-dark-900 border border-dark-700 rounded-xl text-xs font-semibold text-foreground min-w-[140px] justify-center">
            <ClockIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
            <span>{formatPeriodLabel(selectedDate)}</span>
          </div>

          <button
            type="button"
            onClick={() => handleDateChange('next')}
            disabled={isAtCurrentPeriod}
            className="p-1.5 text-dark-400 hover:text-foreground bg-dark-900 hover:bg-dark-800 border border-dark-700 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next period"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status feedback alerts */}
      {submissionStatus === 'success' && successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">{successMessage}</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              Values recorded for {formatPeriodLabel(selectedDate)}.
            </p>
          </div>
        </div>
      )}

      {submissionStatus === 'error' && errorMessage && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-400">Error saving entries</p>
            <p className="text-xs text-rose-400/80 mt-0.5 whitespace-pre-wrap">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-900 border border-dark-700 rounded-2xl p-6 animate-pulse">
              <div className="h-4 w-32 bg-dark-800 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-10 bg-dark-800 rounded-xl" />
                <div className="h-10 bg-dark-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No fields state */}
      {!isLoading && formData && formData.total_count === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dashed border-dark-700/80 rounded-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-3">
            <CalendarDaysIcon className="w-7 h-7 text-dark-400 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No daily fields configured
          </h3>
          <p className="text-xs text-dark-300 max-w-sm mb-5">
            There are no data fields configured for the daily frequency. Create or assign data fields with "daily" frequency in the Data section.
          </p>
          <a
            href="/data"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-xs shadow-sm"
          >
            Manage Data Fields
          </a>
        </div>
      )}

      {/* Error state */}
      {!isLoading && errorMessage && !formData && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dark-700 rounded-2xl text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">Failed to load entries</h3>
          <p className="text-xs text-dark-300 mb-5">{errorMessage}</p>
          <button
            type="button"
            onClick={() => fetchFormData(selectedDate, activeTab)}
            className="px-4 py-2 bg-foreground text-dark-950 font-semibold rounded-xl text-xs hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      )}

      {/* Data entry form */}
      {!isLoading && formData && formData.total_count > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-sm">
          <DataEntryForm
            rooms={formData.rooms}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  )
}
