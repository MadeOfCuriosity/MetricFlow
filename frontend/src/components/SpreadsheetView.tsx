import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { format, parse } from 'date-fns'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useRoom } from '../context/RoomContext'
import { dataFieldsApi } from '../services/dataFields'
import type { SheetViewResponse, SheetFieldRow, FieldEntryInput } from '../types/dataField'
import type { RoomTreeNode } from '../types/room'

interface FlatRoomOption {
  id: string
  name: string
  depth: number
}

function flattenTree(nodes: RoomTreeNode[], depth = 0): FlatRoomOption[] {
  const result: FlatRoomOption[] = []
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth })
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

// Cell key: "fieldId:dateStr"
type CellKey = string
function makeCellKey(fieldId: string, dateStr: string): CellKey {
  return `${fieldId}:${dateStr}`
}

export function SpreadsheetView() {
  const { roomTree } = useRoom()
  const flatRooms = useMemo(() => flattenTree(roomTree), [roomTree])

  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
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
    if (newDate.getFullYear() > now.getFullYear() ||
        (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() > now.getMonth())) {
      return
    }
    setCurrentMonth(format(newDate, 'yyyy-MM'))
  }

  const monthLabel = useMemo(() => {
    const d = parse(currentMonth + '-01', 'yyyy-MM-dd', new Date())
    return format(d, 'MMMM yyyy')
  }, [currentMonth])

  // Get the effective value for a cell (dirty value takes precedence)
  const getCellValue = useCallback((fieldId: string, dateStr: string): number | null => {
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
  }, [dirtyValues, sheetData])

  // Compute live MTD for a field (original values + dirty overrides)
  const getFieldMTD = useCallback((field: SheetFieldRow): number => {
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
  }, [dirtyValues, sheetData])

  const startEditing = (fieldId: string, dateStr: string) => {
    const key = makeCellKey(fieldId, dateStr)
    const currentVal = getCellValue(fieldId, dateStr)
    setEditingCell(key)
    setEditValue(currentVal != null ? String(currentVal) : '')
  }

  const commitEdit = () => {
    if (!editingCell) return
    const trimmed = editValue.trim()
    if (trimmed === '') {
      // If user cleared the value, remove from dirty if it was dirty, otherwise ignore
      setEditingCell(null)
      setEditValue('')
      return
    }
    const num = parseFloat(trimmed)
    if (isNaN(num)) {
      // Invalid, just cancel
      setEditingCell(null)
      setEditValue('')
      return
    }

    const [fieldId, dateStr] = editingCell.split(':')
    // Check if value actually changed from the original
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
      // Value unchanged, remove from dirty
      setDirtyValues(prev => {
        const next = new Map(prev)
        next.delete(editingCell)
        return next
      })
    } else {
      setDirtyValues(prev => new Map(prev).set(editingCell, num))
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

    // Build flat list of all field IDs and dates
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

    if (direction === 'right' || direction === 'left') {
      newDateIdx = direction === 'right' ? dateIndex + 1 : dateIndex - 1
      if (newDateIdx < 0 || newDateIdx >= sheetData.dates.length) return
    } else {
      newFieldIdx = direction === 'down' ? fieldIndex + 1 : fieldIndex - 1
      if (newFieldIdx < 0 || newFieldIdx >= allFieldIds.length) return
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

    // Group dirty values by date
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
      } catch (err: any) {
        const detail = err.response?.data?.detail
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
      // Refresh data to get updated values
      await fetchData()
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveMessage(null)
      }, 4000)
    }

    setIsSaving(false)
  }

  const hasDirtyValues = dirtyValues.size > 0

  // Format day header from date string
  const formatDayHeader = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.getDate().toString()
  }

  const formatDayWeekday = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return format(d, 'EEE')
  }

  const isToday = (dateStr: string) => dateStr === format(new Date(), 'yyyy-MM-dd')

  const formatValue = (value: number | null, unit: string | null): string => {
    if (value == null) return ''
    if (unit === '$') return `$${value.toLocaleString()}`
    if (unit === '%') return `${value.toLocaleString()}%`
    return value.toLocaleString()
  }

  return (
    <div className="space-y-4">
      {/* Header row: month picker + room filter + save button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMonthChange('prev')}
            className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-dark-800 rounded-lg border border-dark-600 min-w-[180px] text-center">
            <span className="text-foreground font-semibold">{monthLabel}</span>
          </div>
          <button
            onClick={() => handleMonthChange('next')}
            disabled={isCurrentMonth}
            className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Room filter */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Rooms</option>
            {flatRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {'—\u00A0'.repeat(room.depth)}{room.name}
              </option>
            ))}
          </select>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasDirtyValues || isSaving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              hasDirtyValues
                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                : 'bg-dark-700 text-dark-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                Save Changes
                {hasDirtyValues && (
                  <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-xs">
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
        <div className="flex items-center gap-3 p-3 bg-success-500/10 border border-success-500/20 rounded-xl">
          <CheckCircleIcon className="w-5 h-5 text-success-400 flex-shrink-0" />
          <p className="text-sm text-success-400">{saveMessage}</p>
        </div>
      )}
      {saveStatus === 'error' && saveMessage && (
        <div className="flex items-center gap-3 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-danger-400 flex-shrink-0" />
          <p className="text-sm text-danger-400">{saveMessage}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sheetData && sheetData.room_groups.length === 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">No daily data fields</h2>
          <p className="text-dark-300">
            The sheet view shows fields with daily entry interval. Create daily data fields to use this view.
          </p>
        </div>
      )}

      {/* Spreadsheet table */}
      {!isLoading && sheetData && sheetData.room_groups.length > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: `${200 + 72 + sheetData.dates.length * 80}px` }}>
              <thead>
                <tr className="border-b border-dark-600">
                  {/* Sticky field name column */}
                  <th className="sticky left-0 z-20 bg-dark-800 px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider border-r border-dark-600 min-w-[200px]">
                    Field
                  </th>
                  {/* MTD column */}
                  <th className="sticky left-[200px] z-20 bg-dark-800 px-3 py-3 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider border-r border-dark-600 min-w-[90px]">
                    MTD
                  </th>
                  {/* Day columns */}
                  {sheetData.dates.map((dateStr) => (
                    <th
                      key={dateStr}
                      className={`px-2 py-1.5 text-center min-w-[72px] border-r border-dark-700/50 ${
                        isToday(dateStr) ? 'bg-primary-500/10' : 'bg-dark-800'
                      }`}
                    >
                      <div className="text-[10px] text-dark-400 font-medium uppercase">{formatDayWeekday(dateStr)}</div>
                      <div className={`text-sm font-semibold ${isToday(dateStr) ? 'text-primary-400' : 'text-dark-200'}`}>
                        {formatDayHeader(dateStr)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetData.room_groups.map((group) => (
                  <>
                    {/* Room header row */}
                    <tr key={`room-${group.room_id || 'unassigned'}`} className="border-b border-dark-600">
                      <td
                        colSpan={2 + sheetData.dates.length}
                        className="sticky left-0 z-10 px-4 py-2.5 bg-dark-800/80 backdrop-blur-sm"
                      >
                        <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                          {group.room_name}
                        </span>
                        <span className="text-xs text-dark-400 ml-2">
                          {group.fields.length} field{group.fields.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                    {/* Field rows */}
                    {group.fields.map((field) => {
                      const liveMTD = getFieldMTD(field)
                      return (
                        <tr key={field.data_field_id} className="border-b border-dark-700/50 hover:bg-dark-800/30 transition-colors">
                          {/* Field name - sticky */}
                          <td className="sticky left-0 z-10 bg-dark-900 px-4 py-2 border-r border-dark-600">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate max-w-[140px]" title={field.name}>
                                {field.name}
                              </span>
                              {field.unit && (
                                <span className="text-[10px] text-dark-400 bg-dark-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {field.unit}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* MTD - sticky */}
                          <td className="sticky left-[200px] z-10 bg-dark-850 px-3 py-2 text-right border-r border-dark-600"
                              style={{ backgroundColor: 'rgb(var(--color-dark-800) / 0.5)' }}>
                            <span className={`text-sm font-semibold tabular-nums ${liveMTD > 0 ? 'text-foreground' : 'text-dark-500'}`}>
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
                            const todayCol = isToday(dateStr)

                            return (
                              <td
                                key={dateStr}
                                className={`px-0 py-0 text-center border-r border-dark-700/30 transition-colors cursor-pointer ${
                                  todayCol ? 'bg-primary-500/[0.03]' : ''
                                } ${isDirty ? 'bg-primary-500/[0.08]' : hasSavedValue ? 'bg-success-500/[0.04]' : ''}`}
                                onClick={() => !isEditing && startEditing(field.data_field_id, dateStr)}
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
                                    className="w-full h-full px-2 py-2 text-sm text-center text-foreground bg-primary-500/10 border-2 border-primary-500 outline-none tabular-nums"
                                    style={{ minHeight: '36px' }}
                                  />
                                ) : (
                                  <div className={`px-2 py-2 text-sm tabular-nums min-h-[36px] flex items-center justify-center ${
                                    isDirty
                                      ? 'text-primary-300 font-medium'
                                      : val != null
                                        ? 'text-foreground'
                                        : 'text-dark-600'
                                  }`}>
                                    {val != null ? val.toLocaleString() : ''}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer with stats */}
          <div className="px-4 py-3 border-t border-dark-700 flex items-center justify-between">
            <p className="text-xs text-dark-400">
              {sheetData.total_filled} of {sheetData.total_cells} cells filled
            </p>
            {hasDirtyValues && (
              <p className="text-xs text-primary-400 font-medium">
                {dirtyValues.size} unsaved change{dirtyValues.size !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
