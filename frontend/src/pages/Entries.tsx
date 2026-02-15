import { useState, useEffect } from 'react'
import { format, subDays, addDays, isToday, isFuture } from 'date-fns'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { DataEntryForm } from '../components'
import { dataFieldsApi } from '../services/dataFields'
import type { TodayFieldFormResponse, FieldEntryInput } from '../types/dataField'

type SubmissionStatus = 'idle' | 'success' | 'error'

export function Entries() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [formData, setFormData] = useState<TodayFieldFormResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchFormData = async (date: Date) => {
    setIsLoading(true)
    setSubmissionStatus('idle')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const data = await dataFieldsApi.getTodayFieldForm(dateStr)
      setFormData(data)
    } catch (error) {
      console.error('Failed to fetch form data:', error)
      setFormData(null)
      setErrorMessage('Failed to load data fields. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFormData(selectedDate)
  }, [selectedDate])

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
      const kpiMsg = result.kpis_recalculated > 0
        ? `, ${result.kpis_recalculated} KPI${result.kpis_recalculated > 1 ? 's' : ''} auto-calculated`
        : ''
      setSuccessMessage(
        `${result.entries_created} entr${result.entries_created > 1 ? 'ies' : 'y'} saved${kpiMsg}`
      )

      await fetchFormData(selectedDate)

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
        // Pydantic validation errors - show each one clearly
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
            Enter your daily data values
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDateChange('prev')}
            className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg border border-dark-600">
            <CalendarDaysIcon className="w-5 h-5 text-dark-300" />
            <span className="text-foreground font-medium">
              {isToday(selectedDate)
                ? 'Today'
                : format(selectedDate, 'MMM d, yyyy')}
            </span>
          </div>

          <button
            onClick={() => handleDateChange('next')}
            disabled={isToday(selectedDate)}
            className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status messages */}
      {submissionStatus === 'success' && successMessage && (
        <div className="flex items-center gap-3 p-4 bg-success-500/10 border border-success-500/20 rounded-xl">
          <CheckCircleIcon className="w-6 h-6 text-success-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-success-400">{successMessage}</p>
            <p className="text-xs text-success-400/70 mt-0.5">
              Data recorded for {format(selectedDate, 'MMMM d, yyyy')}.
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
                {isToday(selectedDate) ? "Today's" : format(selectedDate, 'MMM d')} Progress
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
          <h2 className="text-lg font-semibold text-foreground mb-2">No data fields to enter</h2>
          <p className="text-dark-300 mb-4">
            There are no data fields assigned to you yet. Data fields are created when KPIs are set up.
          </p>
          <a
            href="/kpis"
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
          >
            Set up KPIs
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
            onClick={() => fetchFormData(selectedDate)}
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
            <li>You can navigate to past dates to enter historical data</li>
          </ul>
        </div>
      )}
    </div>
  )
}
