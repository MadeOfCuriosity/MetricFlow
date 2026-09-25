import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { CheckCircleIcon, ExclamationTriangleIcon, CalendarDaysIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { DataEntryForm } from '../components'
import { PendingEntriesList, type PendingBatch } from '../components/PendingEntriesList'
import { dataFieldsApi } from '../services/dataFields'
import type { TodayFieldFormResponse, FieldEntryInput, PendingEntriesResponse } from '../types/dataField'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'

type View = 'today' | 'pending'
type SubmissionStatus = 'idle' | 'success' | 'error'

const PENDING_LOOKBACK_DAYS = 30
const FORM_ID = 'data-entry-form'

/** Turn an axios error from the entries API into a readable message */
function describeSaveError(err: unknown): string {
  const error = err as { response?: { data?: { detail?: unknown }; status?: number } }
  const detail = error.response?.data?.detail
  const statusCode = error.response?.status
  if (Array.isArray(detail)) {
    const fieldErrors = detail.map((e: { loc?: string[]; msg?: string }) => {
      const loc = e.loc ? e.loc.slice(-1)[0] : ''
      return loc ? `${loc}: ${e.msg}` : e.msg
    })
    return `Validation errors:\n${fieldErrors.join('\n')}`
  }
  if (typeof detail === 'string') return detail
  if (statusCode === 403) return "You don't have permission to enter data for some of these fields."
  if (statusCode === 404) return 'Some data fields were not found. The page may be out of date - try refreshing.'
  return `Failed to save entries (${statusCode || 'network error'}). Please try again.`
}

export function Entries() {
  const { isAdmin } = useAuth()
  const [view, setView] = useState<View>('today')
  const [today, setToday] = useState<TodayFieldFormResponse | null>(null)
  const [pending, setPending] = useState<PendingEntriesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [changedCount, setChangedCount] = useState(0)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Bumped after a save so the forms remount with fresh values
  const [formKey, setFormKey] = useState(0)

  // Both views load together so the tab counts are always right
  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [todayData, pendingData] = await Promise.all([
        dataFieldsApi.getTodayFieldForm(format(new Date(), 'yyyy-MM-dd')),
        dataFieldsApi.getPending(PENDING_LOOKBACK_DAYS),
      ])
      setToday(todayData)
      setPending(pendingData)
      setFormKey((k) => k + 1)
    } catch (error) {
      console.error('Failed to load entries:', error)
      setLoadError('Failed to load data fields. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const changeView = (next: View) => {
    setView(next)
    setChangedCount(0)
    setSubmissionStatus('idle')
  }

  const runSave = async (save: () => Promise<{ saved: number; kpis: number }>) => {
    setIsSubmitting(true)
    setSubmissionStatus('idle')
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const { saved, kpis } = await save()
      const kpiMsg = kpis > 0 ? `, ${kpis} KPI${kpis > 1 ? 's' : ''} auto-calculated` : ''
      setSuccessMessage(`${saved} entr${saved === 1 ? 'y' : 'ies'} saved${kpiMsg}`)
      setSubmissionStatus('success')
      await load()
      setTimeout(() => {
        setSubmissionStatus('idle')
        setSuccessMessage(null)
      }, 5000)
    } catch (err: unknown) {
      console.error('Failed to submit entries:', err)
      setErrorMessage(describeSaveError(err))
      setSubmissionStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTodaySubmit = (entries: FieldEntryInput[]) =>
    runSave(async () => {
      const result = await dataFieldsApi.submitFieldEntries({ date: format(new Date(), 'yyyy-MM-dd'), entries })
      return { saved: result.entries_created, kpis: result.kpis_recalculated }
    })

  // Each missed period saves to its own date
  const handlePendingSubmit = (batches: PendingBatch[]) =>
    runSave(async () => {
      let saved = 0
      let kpis = 0
      for (const batch of batches) {
        const result = await dataFieldsApi.submitFieldEntries(batch)
        saved += result.entries_created
        kpis += result.kpis_recalculated
      }
      return { saved, kpis }
    })

  // Scheduled fields still due today (no-schedule fields are optional, never "due")
  const todayRemaining = today
    ? new Set(
        today.rooms.flatMap((r) =>
          r.fields.filter((f) => f.entry_interval !== 'custom' && !f.has_entry_today).map((f) => f.data_field_id)
        )
      ).size
    : 0
  const pendingCount = pending?.total ?? 0
  const hasTodayFields = !!today && today.total_count > 0
  const showSave = view === 'today' ? hasTodayFields : pendingCount > 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Entry</h1>
          <p className="text-dark-300 mt-1 text-sm">
            {view === 'today'
              ? `Everything due today — ${format(new Date(), 'EEEE, MMM d')}.`
              : `Entries missed in the last ${PENDING_LOOKBACK_DAYS} days. Each value is saved to its own date.`}
          </p>
        </div>
        {showSave && (
          <button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting || isLoading || changedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-start"
          >
            {isSubmitting ? (
              <>
                <Spinner tone="white" />
                Saving...
              </>
            ) : (
              <>
                Save Entries
                {changedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-dark-950/15 text-xs tabular-nums">{changedCount}</span>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {/* View switch */}
      <SegmentedControl
        aria-label="Entries view"
        className="w-fit"
        value={view}
        onChange={changeView}
        options={[
          {
            value: 'today',
            label: (
              <>
                Today
                {todayRemaining > 0 && (
                  <span className="px-1.5 rounded-full bg-dark-700 text-[10px] text-dark-200 tabular-nums">{todayRemaining}</span>
                )}
              </>
            ),
          },
          {
            value: 'pending',
            label: (
              <>
                Pending
                {pendingCount > 0 && (
                  <span className="px-1.5 rounded-full bg-brand text-[10px] font-semibold text-white tabular-nums">{pendingCount}</span>
                )}
              </>
            ),
          },
        ]}
      />

      {/* Status feedback */}
      {submissionStatus === 'success' && successMessage && (
        <div className="flex items-center gap-3 p-4 bg-success-500/10 border border-success-500/20 rounded-2xl">
          <CheckCircleIcon className="w-5 h-5 text-success-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-success-400">{successMessage}</p>
        </div>
      )}
      {submissionStatus === 'error' && errorMessage && (
        <div className="flex items-start gap-3 p-4 bg-danger-500/10 border border-danger-500/20 rounded-2xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger-400">Error saving entries</p>
            <p className="text-xs text-danger-400/80 mt-0.5 whitespace-pre-wrap">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-3 space-y-2 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 bg-dark-800/70 rounded-lg" />
          ))}
        </div>
      )}

      {/* Load error */}
      {!isLoading && loadError && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dark-700 rounded-2xl text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-danger-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">Failed to load entries</h3>
          <p className="text-xs text-dark-300 mb-5">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true)
              load()
            }}
            className="px-4 py-2 bg-primary-500 text-white font-semibold rounded-xl text-xs hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      )}

      {/* Today */}
      {!isLoading && !loadError && view === 'today' && today && (
        hasTodayFields ? (
          <DataEntryForm
            key={`today-${formKey}`}
            rooms={today.rooms}
            onSubmit={handleTodaySubmit}
            isSubmitting={isSubmitting}
            canAssign={isAdmin}
            formId={FORM_ID}
            onChangedCountChange={setChangedCount}
          />
        ) : (
          <EmptyState
            icon={<CalendarDaysIcon className="w-7 h-7 text-dark-400 stroke-[1.5]" />}
            title="Nothing due today"
            body="No data fields are scheduled yet. Create fields and set their frequency in the Data Table."
            action={{ href: '/data-table', label: 'Manage Data Fields' }}
          />
        )
      )}

      {/* Pending */}
      {!isLoading && !loadError && view === 'pending' && pending && (
        pendingCount > 0 ? (
          <PendingEntriesList
            key={`pending-${formKey}`}
            items={pending.items}
            onSubmit={handlePendingSubmit}
            formId={FORM_ID}
            onChangedCountChange={setChangedCount}
          />
        ) : (
          <EmptyState
            icon={<SparklesIcon className="w-7 h-7 text-success-400 stroke-[1.5]" />}
            title="All caught up"
            body={`No missed entries in the last ${PENDING_LOOKBACK_DAYS} days.`}
          />
        )
      )}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dashed border-dark-700/80 rounded-2xl text-center">
      <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-dark-300 max-w-sm mb-5">{body}</p>
      {action && (
        <a
          href={action.href}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-xs shadow-sm"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
