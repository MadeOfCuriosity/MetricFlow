import { useState, useRef, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  TableCellsIcon,
  SparklesIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import Papa from 'papaparse'
import { dataFieldsApi } from '../services/dataFields'
import type {
  CSVImportResponse,
  CSVAnalysisResponse,
  CSVColumnMappingConfig,
  CSVLayoutType,
  DataField,
} from '../types/dataField'

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

const LAYOUT_LABELS: Record<CSVLayoutType, { title: string; desc: string; badge: string }> = {
  columnar: {
    title: 'Columnar Time-Series',
    desc: 'Each row is a date; columns are metrics (e.g., Date, Revenue, Signups)',
    badge: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  },
  statement: {
    title: 'Financial Statement (P&L / Report)',
    desc: 'Metric line items (Sales, Gross Profit, Expenses, Net Earnings) for a single reporting period',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  matrix: {
    title: 'Matrix / Transposed',
    desc: 'Each row is a metric field; columns are dates (e.g., field, 2026-01-01, 2026-01-02)',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  long: {
    title: 'Normalized / Long (EAV)',
    desc: 'Each row has Date, Field Name, and Value (e.g., Date, Metric, Amount)',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  transactional: {
    title: 'Transactional Logs',
    desc: 'Multiple rows per date to be aggregated (e.g., Sum daily amounts)',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
}

function formatApiErrorMessage(err: unknown, fallback: string = 'An error occurred'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  const errObj = err as any
  const detail = errObj.response?.data?.detail ?? errObj.detail ?? errObj.message
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          return item.msg || item.message || JSON.stringify(item)
        }
        return String(item)
      })
      .join(', ')
  }
  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail)
  }
  return fallback
}

export function CSVImportModal({ isOpen, onClose, onImported }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [existingFields, setExistingFields] = useState<DataField[]>([])
  const [analysis, setAnalysis] = useState<CSVAnalysisResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false)

  // Sheets state for Excel files
  const [sheets, setSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')

  // Mapping state
  const [layout, setLayout] = useState<CSVLayoutType>('columnar')
  const [dateColumn, setDateColumn] = useState<string>('')
  const [roomColumn, setRoomColumn] = useState<string>('')
  const [dateFormat, setDateFormat] = useState<string>('')
  const [statementDate, setStatementDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'min' | 'max' | 'count' | 'latest'>('sum')
  const [fieldColumn, setFieldColumn] = useState<string>('')
  const [valueColumn, setValueColumn] = useState<string>('')

  // Column mappings: source_column -> { action: 'auto' | 'map' | 'create' | 'ignore', target_field_id, target_field_name }
  const [columnMappings, setColumnMappings] = useState<
    Record<string, { action: 'auto' | 'map' | 'create' | 'ignore'; target_field_id: string; target_field_name: string }>
  >({})

  const [result, setResult] = useState<CSVImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing fields for dropdown mapping
  useEffect(() => {
    if (isOpen) {
      dataFieldsApi.getAll().then((res) => {
        setExistingFields(res.data_fields || [])
      }).catch(() => {})
    }
  }, [isOpen])

  const resetState = () => {
    setFile(null)
    setAnalysis(null)
    setSheets([])
    setSelectedSheet('')
    setIsAnalyzing(false)
    setIsUploading(false)
    setResult(null)
    setError(null)
    setIsDragOver(false)
    setShowAdvancedMapping(false)
    setColumnMappings({})
  }

  const handleClose = () => {
    if (result && result.entries_created > 0) {
      onImported()
    }
    resetState()
    onClose()
  }

  const analyzeClientSide = (selectedFile: File, fields: DataField[]): Promise<CSVAnalysisResponse> => {
    return new Promise((resolve, reject) => {
      Papa.parse(selectedFile, {
        preview: 60,
        skipEmptyLines: 'greedy',
        transform: (val) => (val || '').trim(),
        complete: (results) => {
          if (!results.data || results.data.length < 1) {
            reject(new Error('Document is empty or could not be parsed.'))
            return
          }

          // Clean rows and strip empty lines
          const allRows = (results.data as string[][])
            .map((r) => r.map((c) => (c || '').replace(/^\uFEFF/, '').trim()))
            .filter((r) => r.some((c) => c !== ''))

          if (allRows.length === 0) {
            reject(new Error('No readable data rows found.'))
            return
          }

          const rawHeaders = allRows[0]
          const dataRows = allRows.slice(1)
          const delimiter = results.meta.delimiter || ','

          // Check if this is a Financial Statement / P&L (Key-Value)
          const allText = allRows.map((r) => r.join(' ')).join(' ').toLowerCase()
          const isStatement = ['profit', 'loss', 'income', 'expense', 'sales', 'cogs', 'statement'].some((k) =>
            allText.includes(k)
          )

          let detectedLayout: CSVLayoutType = isStatement ? 'statement' : 'columnar'
          let dateCol: string | null = null
          let roomCol: string | null = null
          let detectedStmtDate = new Date().toISOString().split('T')[0]

          // Extract date from text if found (e.g. 01-JUNE-2026 TO 30-JUNE-2026)
          const dateMatch = allText.match(/(?:to|ended|period)\s*(?:of)?\s*(\d{1,2})[-/\s]([a-z]+)[-/\s](\d{4})/i)
          if (dateMatch) {
            const months: Record<string, string> = {
              jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
              june: '06', jul: '07', july: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
            }
            const dStr = dateMatch[1].padStart(2, '0')
            const mStr = months[dateMatch[2].toLowerCase().slice(0, 3)] || '01'
            const yStr = dateMatch[3]
            detectedStmtDate = `${yStr}-${mStr}-${dStr}`
          }

          const headerLower = rawHeaders.map((h) => h.toLowerCase())

          if (detectedLayout === 'statement') {
            const suggestedMappings: any[] = []
            const seen = new Set<string>()

            dataRows.forEach((r) => {
              if (r.length >= 2 && r[0]) {
                const itemName = r[0]
                const hasNum = r.slice(1).some((c) => !isNaN(parseFloat(c.replace(/[^\d.-]/g, ''))))
                if (hasNum && !seen.has(itemName)) {
                  seen.add(itemName)
                  const clean = itemName.toLowerCase().replace(/[\s-]/g, '_')
                  const matched = fields.find(
                    (f) => f.variable_name.toLowerCase() === clean || f.name.toLowerCase() === itemName.toLowerCase()
                  )
                  suggestedMappings.push({
                    source_column: itemName,
                    target_field_id: matched ? matched.id : null,
                    target_field_name: matched ? matched.name : itemName,
                    action: matched ? 'map' : 'create',
                  })
                }
              }
            })

            resolve({
              detected_layout: 'statement',
              delimiter,
              total_rows: dataRows.length,
              headers: ['Line Item', 'Amount'],
              preview_rows: dataRows.slice(0, 6),
              suggested_date_column: null,
              suggested_room_column: null,
              suggested_statement_date: detectedStmtDate,
              suggested_field_mappings: suggestedMappings,
              unmatched_columns: [],
            })
            return
          }

          // Columnar / Matrix detection
          if (['field', 'field_name', 'name', 'data_field'].includes(headerLower[0])) {
            detectedLayout = 'matrix'
            if (headerLower.length > 1 && ['room', 'room_name'].includes(headerLower[1])) {
              roomCol = rawHeaders[1]
            }
          } else {
            const dateIdx = headerLower.findIndex((h) =>
              ['date', 'day', 'timestamp', 'time', 'created_at', 'entry_date'].some((k) => h.includes(k))
            )
            dateCol = dateIdx !== -1 ? rawHeaders[dateIdx] : rawHeaders[0]

            const roomIdx = headerLower.findIndex(
              (h, idx) => idx !== dateIdx && ['room', 'room_name', 'branch', 'location'].some((k) => h.includes(k))
            )
            if (roomIdx !== -1) roomCol = rawHeaders[roomIdx]
          }

          const metricCols: string[] = []
          rawHeaders.forEach((h) => {
            if (h !== dateCol && h !== roomCol && h) metricCols.push(h)
          })

          const suggestedMappings = metricCols.map((col) => {
            const clean = col.toLowerCase().replace(/[\s-]/g, '_')
            const matched = fields.find(
              (f) => f.variable_name.toLowerCase() === clean || f.name.toLowerCase() === col.toLowerCase()
            )
            return {
              source_column: col,
              target_field_id: matched ? matched.id : null,
              target_field_name: matched ? matched.name : col.replace(/_/g, ' '),
              action: (matched ? 'map' : 'create') as const,
            }
          })

          resolve({
            detected_layout: detectedLayout,
            delimiter,
            total_rows: dataRows.length,
            headers: rawHeaders,
            preview_rows: dataRows.slice(0, 6),
            suggested_date_column: dateCol,
            suggested_room_column: roomCol,
            suggested_statement_date: detectedStmtDate,
            suggested_field_mappings: suggestedMappings,
            unmatched_columns: [],
          })
        },
        error: (err) => reject(err),
      })
    })
  }

  const applyAnalysis = (data: CSVAnalysisResponse) => {
    setAnalysis(data)
    setLayout(data.detected_layout)
    setDateColumn(data.suggested_date_column || data.headers[0] || '')
    setRoomColumn(data.suggested_room_column || '')
    if (data.suggested_statement_date) {
      setStatementDate(data.suggested_statement_date)
    }
    if (data.sheets && data.sheets.length > 0) {
      setSheets(data.sheets)
      setSelectedSheet(data.selected_sheet || data.sheets[0])
    }

    const initialMap: Record<
      string,
      { action: 'auto' | 'map' | 'create' | 'ignore'; target_field_id: string; target_field_name: string }
    > = {}

    data.suggested_field_mappings.forEach((m) => {
      initialMap[m.source_column] = {
        action: (m.action as any) || 'auto',
        target_field_id: m.target_field_id || '',
        target_field_name: m.target_field_name || m.source_column,
      }
    })

    if (data.detected_layout !== 'statement') {
      data.headers.forEach((h) => {
        if (h !== data.suggested_date_column && h !== data.suggested_room_column && !initialMap[h]) {
          initialMap[h] = {
            action: 'auto',
            target_field_id: '',
            target_field_name: h.replace(/_/g, ' '),
          }
        }
      })
    }

    setColumnMappings(initialMap)
  }

  const handleFileSelect = async (selectedFile: File, sheetName?: string) => {
    setFile(selectedFile)
    setError(null)
    setResult(null)
    setIsAnalyzing(true)

    const isExcel =
      selectedFile.name.toLowerCase().endsWith('.xlsx') ||
      selectedFile.name.toLowerCase().endsWith('.xls') ||
      selectedFile.name.toLowerCase().endsWith('.xlsm')

    try {
      try {
        const data = await dataFieldsApi.analyzeCSV(selectedFile, sheetName)
        applyAnalysis(data)
      } catch (backendErr) {
        if (isExcel) {
          throw backendErr
        }
        // Fallback to client-side parsing only for CSV / text files
        const clientData = await analyzeClientSide(selectedFile, existingFields)
        applyAnalysis(clientData)
      }
    } catch (err: unknown) {
      setError(formatApiErrorMessage(err, 'Failed to parse file. Please verify format.'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSheetChange = (sheet: string) => {
    if (file && sheet !== selectedSheet) {
      setSelectedSheet(sheet)
      handleFileSelect(file, sheet)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleImport = async (useAdvancedConfig = false) => {
    if (!file) return
    setIsUploading(true)
    setError(null)

    try {
      let config: CSVColumnMappingConfig | undefined = undefined

      if (useAdvancedConfig || showAdvancedMapping || layout === 'statement') {
        config = {
          layout,
          date_column: dateColumn || null,
          room_column: roomColumn || null,
          field_column: layout === 'long' ? fieldColumn || null : null,
          value_column: layout === 'long' ? valueColumn || null : null,
          date_format: dateFormat || null,
          statement_date: layout === 'statement' ? statementDate : null,
          sheet_name: selectedSheet || null,
          aggregation,
          field_mappings: Object.entries(columnMappings).map(([source_column, mapping]) => ({
            source_column,
            target_field_id: mapping.target_field_id || null,
            target_field_name: mapping.target_field_name || null,
            action: mapping.action,
          })),
        }
      }

      const data = await dataFieldsApi.importCSV(file, config)
      setResult(data)
    } catch (err: unknown) {
      setError(formatApiErrorMessage(err, 'Import failed. Please verify your file format.'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    try {
      await dataFieldsApi.downloadTemplate()
    } catch (err: unknown) {
      setError(formatApiErrorMessage(err, 'Failed to download template.'))
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const handleReset = () => {
    resetState()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-dark-800 border border-dark-700 p-6 shadow-2xl transition-all">
                <div className="flex items-center justify-between pb-4 border-b border-dark-700/60 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">
                      <TableCellsIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-foreground">
                        Universal CSV & Excel Import
                      </Dialog.Title>
                      <p className="text-xs text-dark-400">
                        Import financial statements (P&L), Excel spreadsheets (.xlsx), time-series, or logs
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700/50 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mb-4 p-3.5 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-sm flex items-start gap-2.5">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="flex-1 leading-relaxed">{error}</span>
                  </div>
                )}

                {/* Step 3: Success Results Summary */}
                {result && (
                  <div className="space-y-4">
                    <div className="p-4 bg-success-500/10 border border-success-500/20 rounded-xl">
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-success-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-success-400 text-base">Import Completed Successfully</p>
                          <p className="text-success-400/90 text-sm mt-1">
                            Processed <span className="font-medium">{result.rows_processed}</span> rows, created/updated{' '}
                            <span className="font-semibold">{result.entries_created}</span> data entries
                            {result.kpis_recalculated > 0 && (
                              <>, and auto-recalculated <span className="font-semibold">{result.kpis_recalculated}</span> dependent KPIs</>
                            )}.
                          </p>
                        </div>
                      </div>
                    </div>

                    {result.fields_created && result.fields_created.length > 0 && (
                      <div className="p-3.5 bg-primary-500/10 border border-primary-500/20 rounded-xl text-sm">
                        <p className="font-medium text-primary-400 mb-1 flex items-center gap-1.5">
                          <SparklesIcon className="w-4 h-4" />
                          {result.fields_created.length} New Field{result.fields_created.length !== 1 ? 's' : ''} Auto-Created:
                        </p>
                        <p className="text-primary-300 text-xs leading-relaxed">
                          {result.fields_created.join(', ')}
                        </p>
                      </div>
                    )}

                    {result.errors.length > 0 && (
                      <div className="p-3.5 bg-danger-500/10 border border-danger-500/20 rounded-xl text-sm">
                        <p className="font-medium text-danger-400 mb-1.5">
                          {result.errors.length} Notice{result.errors.length !== 1 ? 's' : ''} / Warning{result.errors.length !== 1 ? 's' : ''}:
                        </p>
                        <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-danger-300/90 font-mono bg-dark-900/60 p-2.5 rounded-lg border border-danger-500/10">
                          {result.errors.map((err, i) => (
                            <p key={i}>
                              {err.row ? `Row ${err.row}: ` : ''}{err.error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-3 border-t border-dark-700/60">
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-foreground transition-colors"
                      >
                        Import Another File
                      </button>
                      <button
                        onClick={handleClose}
                        className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 1: Upload / Drop Zone */}
                {!result && !analysis && (
                  <div className="space-y-4">
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragOver(true)
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-9 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-primary-500 bg-primary-500/10 scale-[0.99]'
                          : 'border-dark-600 hover:border-primary-500/60 hover:bg-dark-700/40'
                      }`}
                    >
                      <ArrowUpTrayIcon className="w-12 h-12 text-primary-400/80 mx-auto mb-3" />
                      <p className="text-base text-foreground font-medium">
                        Drop your CSV or Excel file here, or <span className="text-primary-400 underline decoration-primary-500/40">browse files</span>
                      </p>
                      <p className="text-xs text-dark-400 mt-1.5 max-w-lg mx-auto">
                        Supports P&L financial reports (Zoho, QuickBooks), multi-sheet Excel (.xlsx), time-series tables, matrices, and transaction logs.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.xlsm,.txt,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleFileSelect(f)
                        }}
                        className="hidden"
                      />
                    </div>

                    {isAnalyzing && (
                      <div className="flex items-center justify-center gap-2 p-4 text-xs text-primary-400 font-medium">
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        Analyzing structure, sheets & detecting layout...
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        disabled={isDownloadingTemplate}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-dark-300 hover:text-foreground border border-dark-600 hover:border-dark-500 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {isDownloadingTemplate ? 'Downloading...' : 'Download Standard Template'}
                      </button>
                      <span className="text-[11px] text-dark-400">
                        Supports .csv, .xlsx (multi-sheet), .xls
                      </span>
                    </div>
                  </div>
                )}

                {/* Step 2: Preview & Column Mapping Wizard */}
                {!result && analysis && (
                  <div className="space-y-4">
                    {/* Header info banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-dark-900/60 border border-dark-700/80 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <DocumentTextIcon className="w-8 h-8 text-primary-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{file?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-dark-400">
                              {analysis.total_rows} rows • {analysis.headers.length} cols
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${LAYOUT_LABELS[layout]?.badge || ''}`}>
                              {LAYOUT_LABELS[layout]?.title || layout}
                            </span>
                            {layout === 'statement' && (
                              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                                <CalendarDaysIcon className="w-3.5 h-3.5" />
                                Period: {statementDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            showAdvancedMapping
                              ? 'bg-primary-500/10 text-primary-400 border-primary-500/30'
                              : 'text-dark-300 hover:text-foreground border-dark-600 hover:border-dark-500'
                          }`}
                        >
                          <AdjustmentsHorizontalIcon className="w-4 h-4" />
                          {showAdvancedMapping ? 'Hide Mapping' : 'Customize Mapping'}
                        </button>
                        <button
                          onClick={handleReset}
                          className="text-xs text-dark-400 hover:text-dark-200 px-2 py-1"
                        >
                          Change File
                        </button>
                      </div>
                    </div>

                    {/* Multi-Sheet Selector Tabs (For Excel Files) */}
                    {sheets.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-dark-700/60">
                        <span className="text-xs text-dark-400 font-medium whitespace-nowrap mr-1">Sheets:</span>
                        {sheets.map((sheet) => (
                          <button
                            key={sheet}
                            type="button"
                            onClick={() => handleSheetChange(sheet)}
                            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all whitespace-nowrap ${
                              selectedSheet === sheet
                                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-sm'
                                : 'bg-dark-800 text-dark-300 hover:text-foreground hover:bg-dark-700 border border-dark-700'
                            }`}
                          >
                            {sheet}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Mapping Configuration Box */}
                    {showAdvancedMapping && (
                      <div className="p-4 bg-dark-900/80 border border-dark-700 rounded-xl space-y-4 animate-in fade-in duration-200">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <AdjustmentsHorizontalIcon className="w-4 h-4 text-primary-400" />
                          Structure & Mapping Settings
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Layout Selector */}
                          <div>
                            <label className="block text-xs font-medium text-dark-300 mb-1">Layout Type</label>
                            <select
                              value={layout}
                              onChange={(e) => setLayout(e.target.value as CSVLayoutType)}
                              className="w-full text-xs bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary-500"
                            >
                              <option value="statement">Financial Statement / P&L (Key-Value)</option>
                              <option value="columnar">Columnar Time-Series (Date in rows)</option>
                              <option value="matrix">Matrix (Date in columns)</option>
                              <option value="long">Long / EAV (Date, Field, Value)</option>
                              <option value="transactional">Transactional Logs (Aggregate daily)</option>
                            </select>
                          </div>

                          {/* Statement Date Selector (for financial statements) */}
                          {layout === 'statement' && (
                            <div>
                              <label className="block text-xs font-medium text-dark-300 mb-1">Statement Date</label>
                              <input
                                type="date"
                                value={statementDate}
                                onChange={(e) => setStatementDate(e.target.value)}
                                className="w-full text-xs bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary-500"
                              />
                            </div>
                          )}

                          {/* Date Column (for columnar/transactional) */}
                          {layout !== 'matrix' && layout !== 'statement' && (
                            <div>
                              <label className="block text-xs font-medium text-dark-300 mb-1">Date Column</label>
                              <select
                                value={dateColumn}
                                onChange={(e) => setDateColumn(e.target.value)}
                                className="w-full text-xs bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary-500"
                              >
                                {analysis.headers.map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Room Column */}
                          <div>
                            <label className="block text-xs font-medium text-dark-300 mb-1">Room Column (Optional)</label>
                            <select
                              value={roomColumn}
                              onChange={(e) => setRoomColumn(e.target.value)}
                              className="w-full text-xs bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary-500"
                            >
                              <option value="">None (Global Org)</option>
                              {analysis.headers.map((h) => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>

                          {/* Date Format (non-statement) */}
                          {layout !== 'statement' && (
                            <div>
                              <label className="block text-xs font-medium text-dark-300 mb-1">Date Format</label>
                              <select
                                value={dateFormat}
                                onChange={(e) => setDateFormat(e.target.value)}
                                className="w-full text-xs bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary-500"
                              >
                                <option value="">Auto-Detect Format</option>
                                <option value="%Y-%m-%d">YYYY-MM-DD (2026-01-15)</option>
                                <option value="%d/%m/%Y">DD/MM/YYYY (15/01/2026)</option>
                                <option value="%m/%d/%Y">MM/DD/YYYY (01/15/2026)</option>
                              </select>
                            </div>
                          )}

                          {/* Aggregation */}
                          {(layout === 'transactional' || layout === 'columnar') && (
                            <div>
                              <label className="block text-xs font-medium text-dark-300 mb-1">Daily Aggregation</label>
                              <select
                                value={aggregation}
                                onChange={(e) => setAggregation(e.target.value as any)}
                                className="w-full text-xs bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary-500"
                              >
                                <option value="sum">Sum (Total daily sum)</option>
                                <option value="avg">Average (Mean)</option>
                                <option value="min">Minimum</option>
                                <option value="max">Maximum</option>
                                <option value="count">Count</option>
                                <option value="latest">Latest</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Metric Line Items Mapping (for Financial Statements & Columnar) */}
                        <div className="pt-2 border-t border-dark-700/60">
                          <p className="text-xs font-medium text-dark-300 mb-2">
                            {layout === 'statement' ? 'Financial Line Items Found:' : 'Metric Columns Mapping:'}
                          </p>
                          <div className="max-h-52 overflow-y-auto border border-dark-700 rounded-lg divide-y divide-dark-700 bg-dark-800/60">
                            {Object.entries(columnMappings).map(([headerName, mapping]) => (
                              <div key={headerName} className="flex items-center gap-3 p-2.5 text-xs">
                                <span className="w-1/3 font-mono font-medium text-dark-200 truncate" title={headerName}>
                                  {headerName}
                                </span>

                                <select
                                  value={mapping.action}
                                  onChange={(e) => {
                                    const action = e.target.value as any
                                    setColumnMappings((prev) => ({
                                      ...prev,
                                      [headerName]: { ...mapping, action },
                                    }))
                                  }}
                                  className="w-28 bg-dark-900 border border-dark-600 rounded px-2 py-1 text-foreground"
                                >
                                  <option value="auto">Auto</option>
                                  <option value="map">Map Existing</option>
                                  <option value="create">Create New</option>
                                  <option value="ignore">Skip</option>
                                </select>

                                {mapping.action === 'map' ? (
                                  <select
                                    value={mapping.target_field_id}
                                    onChange={(e) => {
                                      const target_field_id = e.target.value
                                      const f = existingFields.find((ef) => ef.id === target_field_id)
                                      setColumnMappings((prev) => ({
                                        ...prev,
                                        [headerName]: {
                                          ...mapping,
                                          target_field_id,
                                          target_field_name: f ? f.name : mapping.target_field_name,
                                        },
                                      }))
                                    }}
                                    className="flex-1 bg-dark-900 border border-dark-600 rounded px-2 py-1 text-foreground"
                                  >
                                    <option value="">Select Existing Field</option>
                                    {existingFields.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.name} ({f.variable_name})
                                      </option>
                                    ))}
                                  </select>
                                ) : mapping.action === 'create' ? (
                                  <input
                                    type="text"
                                    value={mapping.target_field_name}
                                    onChange={(e) => {
                                      const target_field_name = e.target.value
                                      setColumnMappings((prev) => ({
                                        ...prev,
                                        [headerName]: { ...mapping, target_field_name },
                                      }))
                                    }}
                                    placeholder="New field name..."
                                    className="flex-1 bg-dark-900 border border-dark-600 rounded px-2 py-1 text-foreground"
                                  />
                                ) : mapping.action === 'ignore' ? (
                                  <span className="flex-1 text-dark-500 italic">Will be skipped</span>
                                ) : (
                                  <span className="flex-1 text-dark-400">
                                    Will map to existing or auto-create field
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-dark-300">
                          Data Preview (First {Math.min(6, analysis.preview_rows.length)} of {analysis.total_rows} rows)
                        </p>
                        <p className="text-[11px] text-dark-400">{LAYOUT_LABELS[layout]?.desc}</p>
                      </div>

                      <div className="overflow-x-auto border border-dark-700/80 rounded-xl bg-dark-900/40">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-dark-700 bg-dark-900/80">
                              {analysis.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2.5 text-left font-medium text-dark-200 whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-700/60">
                            {analysis.preview_rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-dark-700/30">
                                {analysis.headers.map((_, cIdx) => (
                                  <td key={cIdx} className="px-3 py-2 text-dark-300 whitespace-nowrap font-mono text-[11px]">
                                    {row[cIdx] || ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-dark-700/60">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>

                      <div className="flex items-center gap-3">
                        {!showAdvancedMapping && (
                          <button
                            type="button"
                            onClick={() => setShowAdvancedMapping(true)}
                            className="px-4 py-2 text-xs font-medium text-dark-300 hover:text-foreground border border-dark-600 rounded-xl transition-colors"
                          >
                            Review & Map Columns
                          </button>
                        )}
                        <button
                          onClick={() => handleImport(showAdvancedMapping)}
                          disabled={isUploading}
                          className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-xl shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Importing...
                            </>
                          ) : (
                            `Import ${Object.keys(columnMappings).length || analysis.total_rows} Metrics`
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
