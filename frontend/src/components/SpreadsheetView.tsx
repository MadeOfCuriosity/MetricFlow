import { Fragment, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { format, parse, parseISO } from 'date-fns'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { dataFieldsApi } from '../services/dataFields'
import type { SheetViewResponse, SheetFieldRow, FieldEntryInput } from '../types/dataField'
import { Spinner } from './ui/Spinner'
import { INTERVAL_LABELS } from './IntervalBadge'

// Cell key: "fieldId:dateStr"
type CellKey = string
function makeCellKey(fieldId: string, dateStr: string): CellKey {
  return `${fieldId}:${dateStr}`
}

interface SpreadsheetViewProps {
  searchQuery: string
  selectedRoom: string
  /** Called with the data field id when a field name is clicked */
  onFieldClick?: (fieldId: string) => void
}

export function SpreadsheetView({ searchQuery, selectedRoom, onFieldClick }: SpreadsheetViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [sheetData, setSheetData] = useState<SheetViewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Dirty cells: cellKey -> new value (string while editing, number when committed)
  const [dirtyValues, setDirtyValues] = useState<Map<CellKey, number>>(new Map())

  // Currently editing cell
  const [editingCell, setEditingCell] = useState<CellKey | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setSaveStatus('idle')
    setSaveMessage(null)
    try {
      const roomId = selectedRoom !== 'all' ? selectedRoom : undefined
      const data = await dataFieldsApi.getSheetData(currentMonth, roomId)
      setSheetData(data)
      setDirtyValues(new Map())
      setEditingCell(null)
    } catch (err) {
      console.error('Failed to load sheet data:', err)
      setSheetData(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth, selectedRoom])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Focus input when editing cell changes
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  const isCurrentMonth = currentMonth === format(new Date(), 'yyyy-MM')

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const d = parse(currentMonth + '-01', 'yyyy-MM-dd', new Date())
    const newDate = new Date(d)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    // Don't go beyond current month
    const now = new Date()
    if (
      newDate.getFullYear() > now.getFullYear() ||
      (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() > now.getMonth())
    ) {
      return
    }
    setCurrentMonth(format(newDate, 'yyyy-MM'))
  }

  const monthLabel = useMemo(() => {
    const d = parse(currentMonth + '-01', 'yyyy-MM-dd', new Date())
    return format(d, 'MMMM yyyy')
  }, [currentMonth])

  const visibleRoomGroups = useMemo(() => {
    if (!sheetData) return []
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sheetData.room_groups
    return sheetData.room_groups
      .map((group) => ({
        ...group,
        fields: group.fields.filter((field) => field.name.toLowerCase().includes(query)),
      }))
      .filter((group) => group.fields.length > 0)
  }, [sheetData, searchQuery])

  // Get the effective value for a cell (dirty value takes precedence)
  const getCellValue = useCallback(
    (fieldId: string, dateStr: string): number | null => {
      const key = makeCellKey(fieldId, dateStr)
      if (dirtyValues.has(key)) return dirtyValues.get(key)!
      if (!sheetData) return null
      for (const group of sheetData.room_groups) {
        for (const field of group.fields) {
          if (field.data_field_id === fieldId) {
            return field.values[dateStr] ?? null
          }
        }
      }
      return null
    },
    [dirtyValues, sheetData]
  )

  // Compute live MTD for a field (original values + dirty overrides)
  const getFieldMTD = useCallback(
    (field: SheetFieldRow): number => {
      if (!sheetData) return 0
      let total = 0
      for (const dateStr of sheetData.dates) {
        const key = makeCellKey(field.data_field_id, dateStr)
        if (dirtyValues.has(key)) {
          total += dirtyValues.get(key)!
        } else if (field.values[dateStr] != null) {
          total += field.values[dateStr]!
        }
      }
      return total
    },
    [dirtyValues, sheetData]
  )

  // Weekly/monthly rows only accept values on each period's start date
  const fieldById = useMemo(() => {
    const map = new Map<string, SheetFieldRow>()
    sheetData?.room_groups.forEach((g) => g.fields.forEach((f) => map.set(f.data_field_id, f)))
    return map
  }, [sheetData])
  const isCellActive = (fieldId: string, dateStr: string) => {
    const periods = fieldById.get(fieldId)?.periods
    return !periods || dateStr in periods
  }

  const startEditing = (fieldId: string, dateStr: string) => {
    if (!isCellActive(fieldId, dateStr)) return
    const key = makeCellKey(fieldId, dateStr)
    const currentVal = getCellValue(fieldId, dateStr)
    setEditingCell(key)
    setEditValue(currentVal != null ? String(currentVal) : '')
  }

  const commitEdit = () => {
    if (!editingCell) return
    const trimmed = editValue.trim()
    if (trimmed === '') {
      setEditingCell(null)
      setEditValue('')
      return
    }
    const num = parseFloat(trimmed)
    if (isNaN(num)) {
      setEditingCell(null)
      setEditValue('')
      return
    }

    const [fieldId, dateStr] = editingCell.split(':')
    let originalVal: number | null = null
    if (sheetData) {
      for (const group of sheetData.room_groups) {
        for (const field of group.fields) {
          if (field.data_field_id === fieldId) {
            originalVal = field.values[dateStr] ?? null
          }
        }
      }
    }

    if (originalVal !== null && originalVal === num) {
      setDirtyValues((prev) => {
        const next = new Map(prev)
        next.delete(editingCell)
        return next
      })
    } else {
      setDirtyValues((prev) => new Map(prev).set(editingCell, num))
    }

    setEditingCell(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Navigate to adjacent cell
  const navigateCell = (direction: 'right' | 'down' | 'left' | 'up') => {
    if (!editingCell || !sheetData) return
    const [currentFieldId, currentDate] = editingCell.split(':')

    const allFieldIds: string[] = []
    for (const group of sheetData.room_groups) {
      for (const field of group.fields) {
        allFieldIds.push(field.data_field_id)
      }
    }
    const fieldIndex = allFieldIds.indexOf(currentFieldId)
    const dateIndex = sheetData.dates.indexOf(currentDate)

    let newFieldIdx = fieldIndex
    let newDateIdx = dateIndex

    // Step over muted cells (weekly/monthly rows between their period dates)
    if (direction === 'right' || direction === 'left') {
      const step = direction === 'right' ? 1 : -1
      do {
        newDateIdx += step
        if (newDateIdx < 0 || newDateIdx >= sheetData.dates.length) return
      } while (!isCellActive(currentFieldId, sheetData.dates[newDateIdx]))
    } else {
      const step = direction === 'down' ? 1 : -1
      do {
        newFieldIdx += step
        if (newFieldIdx < 0 || newFieldIdx >= allFieldIds.length) return
      } while (!isCellActive(allFieldIds[newFieldIdx], currentDate))
    }

    commitEdit()
    startEditing(allFieldIds[newFieldIdx], sheetData.dates[newDateIdx])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      navigateCell(e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
      navigateCell(e.shiftKey ? 'up' : 'down')
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // Save all dirty cells
  const handleSave = async () => {
    if (dirtyValues.size === 0) return
    setIsSaving(true)
    setSaveStatus('idle')
    setSaveMessage(null)

    const byDate: Record<string, FieldEntryInput[]> = {}
    for (const [key, value] of dirtyValues) {
      const [fieldId, dateStr] = key.split(':')
      if (!byDate[dateStr]) byDate[dateStr] = []
      byDate[dateStr].push({ data_field_id: fieldId, value })
    }

    let totalCreated = 0
    let totalKPIs = 0
    const errors: string[] = []

    for (const [dateStr, entries] of Object.entries(byDate)) {
      try {
        const result = await dataFieldsApi.submitFieldEntries({ date: dateStr, entries })
        totalCreated += result.entries_created
        totalKPIs += result.kpis_recalculated
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: unknown } } }
        const detail = error.response?.data?.detail
        errors.push(`${dateStr}: ${typeof detail === 'string' ? detail : 'Failed to save'}`)
      }
    }

    if (errors.length > 0) {
      setSaveStatus('error')
      setSaveMessage(errors.join('; '))
    } else {
      setSaveStatus('success')
      const kpiMsg = totalKPIs > 0 ? `, ${totalKPIs} KPI${totalKPIs > 1 ? 's' : ''} recalculated` : ''
      setSaveMessage(`${totalCreated} entries saved${kpiMsg}`)
      await fetchData()
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveMessage(null)
      }, 4000)
    }

    setIsSaving(false)
  }

  const hasDirtyValues = dirtyValues.size > 0

  const formatDayHeader = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.getDate().toString()
  }

  const formatDayWeekday = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return format(d, 'EEE')
  }

  const isTodayDate = (dateStr: string) => dateStr === format(new Date(), 'yyyy-MM-dd')

  const formatValue = (value: number | null, unit: string | null): string => {
    if (value == null) return ''
    if (unit === '$') return `$${value.toLocaleString()}`
    if (unit === '%') return `${value.toLocaleString()}%`
    return value.toLocaleString()
  }

  return (
    <div className="space-y-4">
      {/* Month navigation + save button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {/* Month navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleMonthChange('prev')}
            className="p-1.5 text-dark-400 hover:text-foreground bg-dark-900 hover:bg-dark-800 border border-dark-700 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-900 rounded-xl border border-dark-700 min-w-[170px] justify-center text-xs font-semibold text-foreground">
            <CalendarDaysIcon className="w-3.5 h-3.5 text-dark-400" />
            <span>{monthLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => handleMonthChange('next')}
            disabled={isCurrentMonth}
            className="p-1.5 text-dark-400 hover:text-foreground bg-dark-900 hover:bg-dark-800 border border-dark-700 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDirtyValues || isSaving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              hasDirtyValues
                ? 'bg-primary-500 text-white hover:opacity-90 shadow-sm'
                : 'bg-dark-900 border border-dark-800 text-dark-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Spinner size="xs" tone="white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Save Changes</span>
                {hasDirtyValues && (
                  <span className="bg-dark-900 text-foreground border border-dark-700 px-1.5 py-0.2 rounded-md text-[10px]">
                    {dirtyValues.size}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {saveStatus === 'success' && saveMessage && (
        <div className="flex items-center gap-3 p-3.5 bg-success-500/10 border border-success-500/20 rounded-2xl">
          <CheckCircleIcon className="w-4 h-4 text-success-400 flex-shrink-0" />
          <p className="text-xs font-semibold text-success-400">{saveMessage}</p>
        </div>
      )}
      {saveStatus === 'error' && saveMessage && (
        <div className="flex items-center gap-3 p-3.5 bg-danger-500/10 border border-danger-500/20 rounded-2xl">
          <ExclamationTriangleIcon className="w-4 h-4 text-danger-400 flex-shrink-0" />
          <p className="text-xs font-semibold text-danger-400">{saveMessage}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64 bg-dark-900 border border-dark-700 rounded-2xl">
          <Spinner size="md" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sheetData && visibleRoomGroups.length === 0 && (
        <div className="bg-dark-900 border border-dashed border-dark-700/80 rounded-2xl p-12 text-center">
          <h3 className="text-base font-semibold text-foreground mb-1">
            {searchQuery ? 'No matching fields' : 'No data fields'}
          </h3>
          <p className="text-xs text-dark-300">
            {searchQuery
              ? `No fields match "${searchQuery}". Try a different search.`
              : 'Create data fields to start tracking them here.'}
          </p>
        </div>
      )}

      {/* Spreadsheet table */}
      {!isLoading && sheetData && visibleRoomGroups.length > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left"
              style={{ minWidth: `${200 + 72 + sheetData.dates.length * 80}px` }}
            >
              <thead>
                <tr className="border-b border-dark-700 bg-dark-950/60">
                  {/* Sticky field name column */}
                  <th className="sticky left-0 z-20 bg-dark-900 px-4 py-3 text-xs font-semibold text-dark-300 uppercase tracking-wider border-r border-dark-700 min-w-[200px]">
                    Field
                  </th>
                  {/* MTD column */}
                  <th className="sticky left-[200px] z-20 bg-dark-900 px-3 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider border-r border-dark-700 min-w-[90px]">
                    MTD
                  </th>
                  {/* Day columns */}
                  {sheetData.dates.map((dateStr) => (
                    <th
                      key={dateStr}
                      className={`px-2 py-2 text-center min-w-[72px] border-r border-dark-800 ${
                        isTodayDate(dateStr) ? 'bg-brand/10' : 'bg-dark-950/40'
                      }`}
                    >
                      <div className="text-[10px] text-dark-400 font-semibold uppercase">
                        {formatDayWeekday(dateStr)}
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          isTodayDate(dateStr) ? 'text-brand' : 'text-dark-200'
                        }`}
                      >
                        {formatDayHeader(dateStr)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRoomGroups.map((group) => (
                  <Fragment key={`group-${group.room_id || 'unassigned'}`}>
                    {/* Room header row */}
                    <tr className="border-b border-dark-700 bg-dark-950/40">
                      <td
                        colSpan={2 + sheetData.dates.length}
                        className="sticky left-0 z-10 px-4 py-2 backdrop-blur-sm"
                      >
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                          {group.room_name}
                        </span>
                        <span className="text-[11px] text-dark-400 ml-2">
                          ({group.fields.length} field{group.fields.length !== 1 ? 's' : ''})
                        </span>
                      </td>
                    </tr>
                    {/* Field rows */}
                    {group.fields.map((field) => {
                      const liveMTD = getFieldMTD(field)
                      return (
                        <tr
                          key={field.data_field_id}
                          className="border-b border-dark-800/80 hover:bg-dark-800/30 transition-colors"
                        >
                          {/* Field name - sticky */}
                          <td className="sticky left-0 z-10 bg-dark-900 px-4 py-2.5 border-r border-dark-700">
                            <div className="flex items-center gap-2">
                              {onFieldClick ? (
                                <button
                                  type="button"
                                  onClick={() => onFieldClick(field.data_field_id)}
                                  className="text-xs font-semibold text-foreground truncate max-w-[140px] text-left hover:text-brand hover:underline underline-offset-2 transition-colors cursor-pointer"
                                  title={`${field.name} — view details`}
                                >
                                  {field.name}
                                </button>
                              ) : (
                                <span
                                  className="text-xs font-semibold text-foreground truncate max-w-[140px]"
                                  title={field.name}
                                >
                                  {field.name}
                                </span>
                              )}
                              {field.entry_interval !== 'daily' && (
                                <span
                                  className="text-[9px] font-semibold uppercase tracking-wider text-dark-300 bg-dark-800 px-1 py-0.5 rounded border border-dark-700 flex-shrink-0"
                                  title={INTERVAL_LABELS[field.entry_interval]}
                                >
                                  {field.entry_interval === 'weekly' ? 'Wk' : field.entry_interval === 'monthly' ? 'Mo' : 'Any'}
                                </span>
                              )}
                              {field.period_start_date && field.period_start_date > format(new Date(), 'yyyy-MM-dd') && (
                                <span className="text-[10px] text-warning-400/80 flex-shrink-0 whitespace-nowrap">
                                  starts {format(parseISO(field.period_start_date), 'MMM d')}
                                </span>
                              )}
                              {field.unit && (
                                <span className="text-[10px] text-dark-400 bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700 flex-shrink-0 font-medium">
                                  {field.unit}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* MTD - sticky */}
                          <td className="sticky left-[200px] z-10 bg-dark-900 px-3 py-2.5 text-right border-r border-dark-700">
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                liveMTD > 0 ? 'text-foreground' : 'text-dark-500'
                              }`}
                            >
                              {liveMTD > 0 ? formatValue(liveMTD, field.unit) : '—'}
                            </span>
                          </td>
                          {/* Day cells */}
                          {sheetData.dates.map((dateStr) => {
                            const cellKey = makeCellKey(field.data_field_id, dateStr)
                            const isEditing = editingCell === cellKey
                            const isDirty = dirtyValues.has(cellKey)
                            const val = getCellValue(field.data_field_id, dateStr)
                            const hasSavedValue = field.values[dateStr] != null
                            const todayCol = isTodayDate(dateStr)
                            const periodEnd = field.periods?.[dateStr]

                            if (field.periods && !periodEnd) {
                              const startsLater = !!field.period_start_date && dateStr < field.period_start_date
                              return (
                                <td
                                  key={dateStr}
                                  className="border-r border-dark-800/50 bg-dark-950/60 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(255,255,255,0.025)_6px_7px)] cursor-not-allowed"
                                  title={
                                    startsLater
                                      ? `Starts ${format(parseISO(field.period_start_date!), 'MMM d')}`
                                      : `${INTERVAL_LABELS[field.entry_interval]} field — values go on the period start date`
                                  }
                                  aria-disabled="true"
                                />
                              )
                            }

                            return (
                              <td
                                title={
                                  periodEnd
                                    ? `${INTERVAL_LABELS[field.entry_interval]}: ${format(parseISO(dateStr), 'MMM d')} – ${format(parseISO(periodEnd), 'MMM d')}`
                                    : undefined
                                }
                                key={dateStr}
                                className={`px-0 py-0 text-center border-r border-dark-800/50 transition-colors cursor-pointer ${
                                  todayCol ? 'bg-brand/[0.04]' : ''
                                } ${
                                  isDirty
                                    ? 'bg-brand/[0.12]'
                                    : hasSavedValue
                                    ? 'bg-brand/[0.05]'
                                    : ''
                                }`}
                                onClick={() =>
                                  !isEditing && startEditing(field.data_field_id, dateStr)
                                }
                              >
                                {isEditing ? (
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="decimal"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={handleKeyDown}
                                    className="w-full h-full px-2 py-2 text-xs text-center text-foreground bg-brand/15 border-2 border-brand outline-none tabular-nums"
                                    style={{ minHeight: '34px' }}
                                  />
                                ) : (
                                  <div
                                    className={`px-2 py-2 text-xs tabular-nums min-h-[34px] flex items-center justify-center ${
                                      isDirty
                                        ? 'text-brand font-semibold'
                                        : val != null
                                        ? 'text-foreground'
                                        : 'text-dark-600'
                                    }`}
                                  >
                                    {val != null ? val.toLocaleString() : ''}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer with stats */}
          <div className="px-5 py-3 bg-dark-950/40 border-t border-dark-800 flex items-center justify-between text-xs text-dark-400">
            <span>
              {sheetData.total_filled} of {sheetData.total_cells} cells recorded
            </span>
            {hasDirtyValues && (
              <span className="text-brand font-semibold">
                {dirtyValues.size} unsaved change{dirtyValues.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
