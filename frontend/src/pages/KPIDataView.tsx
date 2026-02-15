import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeftIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { DateRangeSelector } from '../components'
import type { DateRange } from '../components'
import api from '../services/api'

interface KPI {
  id: string
  name: string
  description: string | null
  formula: string
  input_fields: string[]
  category: string
  time_period: string
  is_preset: boolean
  is_shared: boolean
}

interface DataEntry {
  id: string
  date: string
  values: Record<string, number>
  calculated_value: number
  created_at: string
}

export function KPIDataView() {
  const { kpiId } = useParams<{ kpiId: string }>()
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [entries, setEntries] = useState<DataEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })

  // Edit / Delete state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  // CSV Import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    entriesCreated?: number
    errors?: string[]
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!kpiId) return

      setIsLoading(true)
      setError(null)

      try {
        // Fetch KPI details (returns { kpi: {...}, recent_entries: [...] })
        const kpiRes = await api.get(`/api/kpis/${kpiId}`)
        const kpiData = kpiRes.data.kpi || kpiRes.data
        setKpi(kpiData)

        // Fetch all entries for this KPI
        const entriesRes = await api.get(`/api/entries?kpi_id=${kpiId}&limit=365`)
        const entriesData = entriesRes.data
        const entriesList = Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []
        setEntries(entriesList)
      } catch (err) {
        console.error('Failed to fetch KPI data:', err)
        setError('Failed to load KPI data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [kpiId])

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      Sales: 'bg-primary-500/10 text-primary-400',
      Marketing: 'bg-purple-500/10 text-purple-400',
      Operations: 'bg-warning-500/10 text-warning-400',
      Finance: 'bg-success-500/10 text-success-400',
      Custom: 'bg-dark-400/10 text-dark-300',
    }
    return colors[cat] || colors.Custom
  }

  const getTrendInfo = (arr: DataEntry[], index: number) => {
    if (index >= arr.length - 1) return null
    const current = arr[index].calculated_value
    const previous = arr[index + 1].calculated_value
    if (previous === 0) return null
    const change = ((current - previous) / Math.abs(previous)) * 100
    return { change, isPositive: change > 0 }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const downloadCsvTemplate = () => {
    if (!kpi) return
    const fields = kpi.input_fields ?? []
    const header = ['date', ...fields].join(',')
    const exampleRow = ['2024-01-01', ...fields.map(() => '0')].join(',')
    const csvContent = `${header}\n${exampleRow}`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${kpi.name.replace(/\s+/g, '_')}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !kpi || !kpiId) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        setImportResult({
          success: false,
          message: 'CSV file must have a header row and at least one data row',
        })
        return
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      const dateIndex = header.findIndex(h => h === 'date')

      if (dateIndex === -1) {
        setImportResult({
          success: false,
          message: 'CSV must have a "date" column',
        })
        return
      }

      const fields = kpi.input_fields ?? []
      const fieldIndices: Record<string, number> = {}

      for (const field of fields) {
        const index = header.findIndex(h => h === field.toLowerCase())
        if (index === -1) {
          setImportResult({
            success: false,
            message: `CSV is missing required column: ${field}`,
          })
          return
        }
        fieldIndices[field] = index
      }

      // Parse data rows and group by date
      const entriesByDate: Record<string, Record<string, number>> = {}
      const parseErrors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',').map(v => v.trim())
        const dateStr = values[dateIndex]

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          parseErrors.push(`Row ${i + 1}: Invalid date format "${dateStr}". Use YYYY-MM-DD`)
          continue
        }

        const fieldValues: Record<string, number> = {}
        let hasError = false

        for (const field of fields) {
          const rawValue = values[fieldIndices[field]]
          const numValue = parseFloat(rawValue)

          if (isNaN(numValue)) {
            parseErrors.push(`Row ${i + 1}: Invalid number "${rawValue}" for ${field}`)
            hasError = true
            break
          }
          fieldValues[field] = numValue
        }

        if (!hasError) {
          entriesByDate[dateStr] = fieldValues
        }
      }

      if (Object.keys(entriesByDate).length === 0) {
        setImportResult({
          success: false,
          message: 'No valid data rows found in CSV',
          errors: parseErrors,
        })
        return
      }

      // Submit entries to API (one request per date)
      let totalCreated = 0
      const apiErrors: string[] = []

      for (const [dateStr, values] of Object.entries(entriesByDate)) {
        try {
          await api.post('/api/entries', {
            date: dateStr,
            entries: [{ kpi_id: kpiId, values }],
          })
          totalCreated++
        } catch (err: any) {
          apiErrors.push(`${dateStr}: ${err.response?.data?.detail || 'Failed to save'}`)
        }
      }

      // Refresh entries
      const entriesRes = await api.get(`/api/entries?kpi_id=${kpiId}&limit=100`)
      const entriesData = entriesRes.data
      const entriesList = Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []
      setEntries(entriesList)

      setImportResult({
        success: totalCreated > 0,
        message: totalCreated > 0
          ? `Successfully imported ${totalCreated} entries`
          : 'No entries were imported',
        entriesCreated: totalCreated,
        errors: [...parseErrors, ...apiErrors],
      })
    } catch (err) {
      console.error('CSV import error:', err)
      setImportResult({
        success: false,
        message: 'Failed to parse CSV file',
      })
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const startEditing = (entry: DataEntry) => {
    setEditingEntryId(entry.id)
    const stringValues: Record<string, string> = {}
    for (const field of (kpi?.input_fields ?? [])) {
      stringValues[field] = entry.values?.[field]?.toString() ?? ''
    }
    setEditValues(stringValues)
  }

  const cancelEditing = () => {
    setEditingEntryId(null)
    setEditValues({})
  }

  const saveEntry = async (entry: DataEntry) => {
    if (!kpiId || !kpi) return
    setIsSaving(true)
    try {
      const numericValues: Record<string, number> = {}
      for (const field of kpi.input_fields ?? []) {
        const val = parseFloat(editValues[field])
        if (isNaN(val)) return
        numericValues[field] = val
      }
      await api.post('/api/entries', {
        date: entry.date,
        entries: [{ kpi_id: kpiId, values: numericValues }],
      })
      // Refresh entries
      const entriesRes = await api.get(`/api/entries?kpi_id=${kpiId}&limit=365`)
      const entriesData = entriesRes.data
      const entriesList = Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []
      setEntries(entriesList)
      setEditingEntryId(null)
      setEditValues({})
    } catch (err) {
      console.error('Failed to save entry:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteEntry = async (entryId: string) => {
    if (!kpiId) return
    setDeletingEntryId(entryId)
    try {
      await api.delete(`/api/entries/${entryId}`)
      // Refresh entries
      const entriesRes = await api.get(`/api/entries?kpi_id=${kpiId}&limit=365`)
      const entriesData = entriesRes.data
      const entriesList = Array.isArray(entriesData) ? entriesData : entriesData?.entries ?? []
      setEntries(entriesList)
    } catch (err) {
      console.error('Failed to delete entry:', err)
    } finally {
      setDeletingEntryId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error || !kpi) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger-400 mb-4">{error || 'KPI not found'}</p>
          <Link to="/dashboard" className="text-primary-400 hover:text-primary-300">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const filteredEntries = entries.filter((e) => {
    if (!dateRange.startDate && !dateRange.endDate) return true
    if (dateRange.startDate && e.date < dateRange.startDate) return false
    if (dateRange.endDate && e.date > dateRange.endDate) return false
    return true
  })

  const currentValue = filteredEntries[0]?.calculated_value ?? null
  const previousValue = filteredEntries[1]?.calculated_value ?? null
  const overallTrend = currentValue !== null && previousValue !== null && previousValue !== 0
    ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
    : null
  const inputFields = kpi.input_fields ?? []

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-dark-300 hover:text-foreground transition-colors"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* KPI Header */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(kpi.category)}`}>
                {kpi.category}
              </span>
              {kpi.is_shared && (
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary-500/10 text-primary-400">
                  Shared
                </span>
              )}
              {kpi.is_preset && (
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-dark-400/10 text-dark-300">
                  Preset
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{kpi.name}</h1>
            {kpi.description && (
              <p className="text-dark-300 mt-1">{kpi.description}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-dark-400">
              <span className="flex items-center gap-1">
                <ChartBarIcon className="w-4 h-4" />
                Formula: <code className="text-dark-300 bg-dark-800 px-1.5 py-0.5 rounded">{kpi.formula}</code>
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {kpi.time_period}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-foreground">
              {currentValue !== null ? currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
            </p>
            <p className="text-sm text-dark-400">Current Value</p>
            {overallTrend !== null && (
              <div className={`flex items-center justify-end gap-1 mt-1 ${overallTrend > 0 ? 'text-success-400' : overallTrend < 0 ? 'text-danger-500' : 'text-dark-400'}`}>
                {overallTrend > 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : overallTrend < 0 ? (
                  <ArrowTrendingDownIcon className="w-4 h-4" />
                ) : (
                  <MinusIcon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {Math.abs(overallTrend).toFixed(1)}% from previous
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date range selector */}
      <DateRangeSelector
        defaultPreset="all"
        onChange={(range) => setDateRange(range)}
      />

      {/* Input Data Table */}
      {inputFields.length > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Input Data</h2>
              <p className="text-sm text-dark-400">Raw values entered for this KPI</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadCsvTemplate}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:text-foreground bg-dark-800 hover:bg-dark-600 rounded-lg transition-colors"
                title="Download CSV template"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Template
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    Import CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Result Message */}
          {importResult && (
            <div className={`px-6 py-4 border-b border-dark-700 ${importResult.success ? 'bg-success-500/10' : 'bg-danger-500/10'}`}>
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircleIcon className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${importResult.success ? 'text-success-400' : 'text-danger-400'}`}>
                    {importResult.message}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <ul className="mt-2 text-xs text-dark-300 space-y-1">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>...and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => setImportResult(null)}
                  className="text-dark-400 hover:text-dark-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {filteredEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                      Date
                    </th>
                    {inputFields.map((field) => (
                      <th key={field} className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        {field}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-dark-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-200">
                        {formatDate(entry.date)}
                      </td>
                      {inputFields.map((field) => (
                        <td key={field} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {editingEntryId === entry.id ? (
                            <input
                              type="number"
                              step="any"
                              value={editValues[field] ?? ''}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, [field]: e.target.value }))}
                              className="w-24 px-2 py-1 text-sm bg-dark-800 border border-dark-600 rounded text-foreground focus:outline-none focus:border-primary-500"
                            />
                          ) : (
                            entry.values?.[field]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {editingEntryId === entry.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => saveEntry(entry)}
                              disabled={isSaving}
                              className="p-1 text-success-400 hover:text-success-300 transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="p-1 text-dark-400 hover:text-dark-200 transition-colors"
                              title="Cancel"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditing(entry)}
                              className="p-1 text-dark-400 hover:text-primary-400 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              disabled={deletingEntryId === entry.id}
                              className="p-1 text-dark-400 hover:text-danger-500 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <ChartBarIcon className="w-12 h-12 text-dark-500 mb-3" />
              <p className="text-dark-400 mb-4">No data entries yet</p>
              <Link
                to="/entries"
                className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
              >
                Add Data Entry
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Calculated Values Table */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-foreground">Historical Data</h2>
          <p className="text-sm text-dark-400">{filteredEntries.length} entries</p>
        </div>

        {filteredEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-800/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Calculated Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredEntries.map((entry, index) => {
                  const trendInfo = getTrendInfo(filteredEntries, index)
                  return (
                    <tr key={entry.id} className="hover:bg-dark-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-200">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {entry.calculated_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {trendInfo ? (
                          <span className={`flex items-center gap-1 ${trendInfo.isPositive ? 'text-success-400' : 'text-danger-500'}`}>
                            {trendInfo.isPositive ? (
                              <ArrowTrendingUpIcon className="w-4 h-4" />
                            ) : (
                              <ArrowTrendingDownIcon className="w-4 h-4" />
                            )}
                            {Math.abs(trendInfo.change).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-dark-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inputFields.length > 0 && (
                            <button
                              onClick={() => startEditing(entry)}
                              className="p-1 text-dark-400 hover:text-primary-400 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            disabled={deletingEntryId === entry.id}
                            className="p-1 text-dark-400 hover:text-danger-500 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <ChartBarIcon className="w-12 h-12 text-dark-500 mb-3" />
            <p className="text-dark-400 mb-4">No data entries yet</p>
            <Link
              to="/entries"
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              Add Data Entry
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
