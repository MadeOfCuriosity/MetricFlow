import { useState, useEffect, useCallback } from 'react'
import {
  format,
  subDays,
  addDays,
  isToday,
  isFuture,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  isSameWeek,
  isSameMonth,
} from 'date-fns'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import { DataEntryForm } from '../components'
import { CSVImportModal } from '../components/CSVImportModal'
import { dataFieldsApi } from '../services/dataFields'
import type { TodayFieldFormResponse, FieldEntryInput, EntryInterval } from '../types/dataField'

type SubmissionStatus = 'idle' | 'success' | 'error'

const INTERVAL_TABS: { key: EntryInterval; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom' },
]

function getCanonicalDate(date: Date, interval: EntryInterval): Date {
  switch (interval) {
    case 'weekly':
      return startOfWeek(date, { weekStartsOn: 1 })
    case 'monthly':
      return startOfMonth(date)
    default:
      return date
  }
}

function formatPeriodLabel(date: Date, interval: EntryInterval): string {
  switch (interval) {
    case 'weekly': {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
    case 'monthly':
      return format(date, 'MMMM yyyy')
    case 'custom':
    case 'daily':
    default:
      return isToday(date) ? 'Today' : format(date, 'MMM d, yyyy')
  }
}

function getSubtitleText(interval: EntryInterval): string {
  switch (interval) {
    case 'daily':
      return 'Enter your daily data values'
    case 'weekly':
      return 'Enter your weekly data values'
    case 'monthly':
      return 'Enter your monthly data values'
    case 'custom':
      return 'Enter data for custom-interval fields'
  }
}

export function Entries() {
  const [activeTab, setActiveTab] = useState<EntryInterval>('daily')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [formData, setFormData] = useState<TodayFieldFormResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const fetchFormData = useCallback(async (date: Date, interval: EntryInterval) => {
    setIsLoading(true)
    setSubmissionStatus('idle')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const canonicalDate = getCanonicalDate(date, interval)
      const dateStr = format(canonicalDate, 'yyyy-MM-dd')
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
  }, [selectedDate, activeTab, fetchFormData])

  const isAtCurrentPeriod = (() => {
    const now = new Date()
    switch (activeTab) {
      case 'weekly':
        return isSameWeek(selectedDate, now, { weekStartsOn: 1 })
      case 'monthly':
        return isSameMonth(selectedDate, now)
      default:
        return isToday(selectedDate)
    }
  })()

  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate((current) => {
      let newDate: Date
      switch (activeTab) {
        case 'weekly':
          newDate = direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1)
          break
        case 'monthly':
          newDate = direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
          break
        default:
          newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
      }
      if (isFuture(getCanonicalDate(newDate, activeTab))) return current
      return newDate
    })
  }

  const handleTabChange = (tab: EntryInterval) => {
    setActiveTab(tab)
    setSelectedDate(new Date())
  }

  const handleSubmit = async (entries: FieldEntryInput[]) => {
    setIsSubmitting(true)
    setSubmissionStatus('idle')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const canonicalDate = getCanonicalDate(selectedDate, activeTab)
      const dateStr = format(canonicalDate, 'yyyy-MM-dd')
      const result = await dataFieldsApi.submitFieldEntries({
        date: dateStr,
        entries,
      })

      setSubmissionStatus('success')
      const kpiMsg = result.kpis_recalculated > 0
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
    } catch (error: any) {
      console.error('Failed to submit entries:', error)
      setSubmissionStatus('error')
      const detail = error.response?.data?.detail
      const statusCode = error.response?.status

      if (Array.isArray(detail)) {
        const fieldErrors = detail.map((e: any) => {
          const loc = e.loc ? e.loc.slice(-1)[0] : ''
          return loc ? `${loc}: ${e.msg}` : e.msg
        })
        setErrorMessage(`Validation errors:\n${fieldErrors.join('\n')}`)
      } else if (typeof detail === 'string') {
        setErrorMessage(detail)
      } else if (statusCode === 403) {
        setErrorMessage('You don\'t have permission to enter data for some of these fields.')
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Entry</h1>
          <p className="text-dark-300 mt-1">
            {getSubtitleText(activeTab)}
          </p>
        </div>

        {/* Date picker & import */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-dark-600 text-dark-200 hover:text-foreground hover:border-dark-500 rounded-lg transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => handleDateChange('prev')}
            className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg border border-dark-600">
            <CalendarDaysIcon className="w-5 h-5 text-dark-300" />
            <span className="text-foreground font-medium">
              {formatPeriodLabel(selectedDate, activeTab)}
            </span>
          </div>

          <button
            onClick={() => handleDateChange('next')}
            disabled={isAtCurrentPeriod}
            className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Interval tabs */}
      <div className="flex border-b border-dark-700">
        {INTERVAL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-dark-300 hover:text-foreground hover:border-dark-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status messages */}
      {submissionStatus === 'success' && successMessage && (
        <div className="flex items-center gap-3 p-4 bg-success-500/10 border border-success-500/20 rounded-xl">
          <CheckCircleIcon className="w-6 h-6 text-success-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-success-400">{successMessage}</p>
            <p className="text-xs text-success-400/70 mt-0.5">
              Data recorded for {formatPeriodLabel(selectedDate, activeTab)}.
            </p>
          </div>
        </div>
      )}

      {submissionStatus === 'error' && errorMessage && (
        <div className="flex items-start gap-3 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl">
          <ExclamationTriangleIcon className="w-6 h-6 text-danger-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger-400">Error saving entries</p>
            <p className="text-xs text-danger-400/70 mt-0.5 whitespace-pre-wrap">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Progress summary */}
      {formData && formData.total_count > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatPeriodLabel(selectedDate, activeTab)} Progress
              </p>
              <p className="text-xs text-dark-400">
                {formData.completed_count} of {formData.total_count} fields completed
              </p>
            </div>
            <p className="text-lg font-bold text-foreground">{completionPercentage}%</p>
          </div>
          <div className="w-full bg-dark-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                completionPercentage === 100
                  ? 'bg-success-500'
                  : completionPercentage > 50
                  ? 'bg-primary-500'
                  : 'bg-warning-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* No fields state */}
      {!isLoading && formData && formData.total_count === 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
          <CalendarDaysIcon className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No {activeTab} data fields</h2>
          <p className="text-dark-300 mb-4">
            There are no data fields with {activeTab} entry interval. Create data fields and set their interval to "{activeTab}" to see them here.
          </p>
          <a
            href="/data"
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
          >
            Manage Data Fields
          </a>
        </div>
      )}

      {/* Error state */}
      {!isLoading && errorMessage && !formData && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Failed to load data</h2>
          <p className="text-dark-300 mb-4">{errorMessage}</p>
          <button
            onClick={() => fetchFormData(selectedDate, activeTab)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Data entry form */}
      {!isLoading && formData && formData.total_count > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <DataEntryForm
            rooms={formData.rooms}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Tips section */}
      {!isLoading && formData && formData.total_count > 0 && (
        <div className="bg-dark-900/50 border border-dark-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-dark-300 mb-2">Tips</h3>
          <ul className="text-xs text-dark-400 space-y-1.5">
            <li>
              <span className="inline-flex items-center justify-center w-4 h-4 mr-1">
                <CheckCircleIcon className="w-4 h-4 text-success-400" />
              </span> indicates fields with values already entered
            </li>
            <li>Fields are grouped by room for easy navigation</li>
            <li>Each field only needs to be entered once - all KPIs using it will auto-calculate</li>
            {activeTab === 'daily' && <li>You can navigate to past dates to enter historical data</li>}
            {activeTab === 'weekly' && <li>Weekly values are stored for each Monday-Sunday period</li>}
            {activeTab === 'monthly' && <li>Monthly values are stored for each calendar month</li>}
          </ul>
        </div>
      )}

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={() => fetchFormData(selectedDate, activeTab)}
      />
    </div>
  )
}
