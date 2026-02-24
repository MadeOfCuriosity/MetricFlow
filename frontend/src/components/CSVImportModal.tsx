import { useState, useRef, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Papa from 'papaparse'
import { dataFieldsApi } from '../services/dataFields'
import type { CSVImportResponse } from '../types/dataField'

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

interface CSVPreview {
  headers: string[]
  rows: string[][]
  totalRows: number
  hasRoomColumn: boolean
}

export function CSVImportModal({ isOpen, onClose, onImported }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<CSVImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setFile(null)
    setPreview(null)
    setIsUploading(false)
    setResult(null)
    setError(null)
    setIsDragOver(false)
  }

  const handleClose = () => {
    if (result) {
      onImported()
    }
    resetState()
    onClose()
  }

  const parseFile = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setResult(null)

    Papa.parse(selectedFile, {
      preview: 6, // header + 5 data rows
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length < 2) {
          setError('CSV file must have a header row and at least one data row.')
          setPreview(null)
          return
        }

        const headers = (results.data[0] as string[]).map((h) => h.replace(/^\uFEFF/, '').trim())
        const firstCol = headers[0]?.toLowerCase()

        if (!firstCol || !['field', 'field_name', 'name', 'data_field'].includes(firstCol)) {
          setError('First column must be "field". Format: field, date1, date2, ...')
          setPreview(null)
          return
        }

        // Detect optional room column
        const hasRoomColumn = headers.length > 1 && ['room', 'room_name'].includes(headers[1]?.toLowerCase())

        // Count total rows by re-parsing (fast, just counting)
        Papa.parse(selectedFile, {
          skipEmptyLines: true,
          complete: (fullResults) => {
            const totalRows = fullResults.data.length - 1 // minus header
            const rows = (results.data as string[][]).slice(1)
            setPreview({ headers, rows, totalRows, hasRoomColumn })
          },
        })
      },
      error: () => {
        setError('Failed to parse CSV file.')
        setPreview(null)
      },
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) parseFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      parseFile(droppedFile)
    } else {
      setError('Please drop a .csv file.')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleImport = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)

    try {
      const data = await dataFieldsApi.importCSV(file)
      setResult(data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Import failed. Please check your CSV format.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    try {
      await dataFieldsApi.downloadTemplate()
    } catch {
      setError('Failed to download template.')
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
          <div className="fixed inset-0 bg-black/50" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-dark-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    Import CSV
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-dark-300 hover:text-foreground transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-sm flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Result summary */}
                {result && (
                  <div className="space-y-3 mb-4">
                    <div className="p-4 bg-success-500/10 border border-success-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-success-400">Import complete</p>
                          <p className="text-success-400/80 mt-1">
                            {result.rows_processed} row{result.rows_processed !== 1 ? 's' : ''} processed,{' '}
                            {result.entries_created} entr{result.entries_created !== 1 ? 'ies' : 'y'} created
                            {result.kpis_recalculated > 0 && (
                              <>, {result.kpis_recalculated} KPI{result.kpis_recalculated !== 1 ? 's' : ''} recalculated</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {result.fields_created && result.fields_created.length > 0 && (
                      <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg text-sm">
                        <p className="font-medium text-primary-400 mb-1">
                          {result.fields_created.length} new field{result.fields_created.length !== 1 ? 's' : ''} created
                        </p>
                        <p className="text-primary-400/80">
                          {result.fields_created.join(', ')} — assign them to rooms from the Data Fields page.
                        </p>
                      </div>
                    )}

                    {result.unmatched_columns.length > 0 && (
                      <div className="p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg text-sm">
                        <p className="font-medium text-warning-400 mb-1">Unmatched date columns</p>
                        <p className="text-warning-400/80">
                          These date headers didn't match:{' '}
                          {result.unmatched_columns.map((col, i) => (
                            <span key={col}>
                              <code className="bg-warning-500/10 px-1 rounded">{col}</code>
                              {i < result.unmatched_columns.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                      </div>
                    )}

                    {result.errors.length > 0 && (
                      <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-sm">
                        <p className="font-medium text-danger-400 mb-1">
                          {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {result.errors.map((err, i) => (
                            <p key={i} className="text-danger-400/80 text-xs">
                              Row {err.row}: {err.error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-medium text-dark-200 hover:text-foreground transition-colors"
                      >
                        Import Another
                      </button>
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 rounded-lg transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload area */}
                {!result && !preview && (
                  <div className="space-y-4">
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                        isDragOver
                          ? 'border-primary-500 bg-primary-500/5'
                          : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
                      }`}
                    >
                      <ArrowUpTrayIcon className="w-10 h-10 text-dark-400 mx-auto mb-3" />
                      <p className="text-sm text-foreground font-medium">
                        Drop your CSV file here or click to browse
                      </p>
                      <p className="text-xs text-dark-400 mt-1">
                        CSV format: first column "field", optional "room" column, remaining columns are dates (YYYY-MM-DD)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadTemplate()
                      }}
                      disabled={isDownloadingTemplate}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-dark-200 hover:text-foreground border border-dark-600 hover:border-dark-500 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      {isDownloadingTemplate ? 'Downloading...' : 'Download CSV Template'}
                    </button>

                    <div className="bg-dark-900/50 border border-dark-700 rounded-lg p-3">
                      <p className="text-xs font-medium text-dark-300 mb-1.5">Expected format</p>

                      <p className="text-[10px] text-dark-500 mb-1 uppercase tracking-wide">Basic</p>
                      <div className="overflow-x-auto mb-3">
                        <table className="text-xs text-dark-400 font-mono">
                          <thead>
                            <tr>
                              <td className="pr-4 text-primary-400">field</td>
                              <td className="pr-4 text-primary-400">2026-01-15</td>
                              <td className="pr-4 text-primary-400">2026-01-16</td>
                              <td className="text-primary-400">2026-01-17</td>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="pr-4">revenue</td>
                              <td className="pr-4">15000</td>
                              <td className="pr-4">18500</td>
                              <td>20000</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p className="text-[10px] text-dark-500 mb-1 uppercase tracking-wide">Multi-room</p>
                      <div className="overflow-x-auto">
                        <table className="text-xs text-dark-400 font-mono">
                          <thead>
                            <tr>
                              <td className="pr-4 text-primary-400">field</td>
                              <td className="pr-4 text-success-400">room</td>
                              <td className="pr-4 text-primary-400">2026-01-15</td>
                              <td className="text-primary-400">2026-01-16</td>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="pr-4">revenue</td>
                              <td className="pr-4">Marketing School</td>
                              <td className="pr-4">15000</td>
                              <td>18500</td>
                            </tr>
                            <tr>
                              <td className="pr-4">revenue</td>
                              <td className="pr-4">Design School</td>
                              <td className="pr-4">28000</td>
                              <td>121000</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p className="text-xs text-dark-500 mt-1.5">
                        Row names should match data field names. Add an optional "room" column to import across multiple rooms. Dates as YYYY-MM-DD.
                      </p>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {!result && preview && (
                  <div className="space-y-4">
                    {/* File info */}
                    <div className="flex items-center gap-3 p-3 bg-dark-900/50 border border-dark-700 rounded-lg">
                      <DocumentTextIcon className="w-8 h-8 text-primary-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file?.name}</p>
                        <p className="text-xs text-dark-400">
                          {preview.totalRows} data row{preview.totalRows !== 1 ? 's' : ''},{' '}
                          {preview.headers.length - (preview.hasRoomColumn ? 2 : 1)} date{preview.headers.length - (preview.hasRoomColumn ? 2 : 1) !== 1 ? 's' : ''}
                          {preview.hasRoomColumn && <span className="text-success-400 ml-1">(with room column)</span>}
                        </p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="text-xs text-dark-300 hover:text-foreground transition-colors"
                      >
                        Change file
                      </button>
                    </div>

                    {/* Preview table */}
                    <div>
                      <p className="text-xs font-medium text-dark-300 mb-2">
                        Preview (first {Math.min(5, preview.rows.length)} of {preview.totalRows} rows)
                      </p>
                      <div className="overflow-x-auto border border-dark-700 rounded-lg">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-dark-700 bg-dark-900/50">
                              {preview.headers.map((header, i) => (
                                <th
                                  key={i}
                                  className={`px-3 py-2 text-left font-medium ${
                                    i === 0
                                      ? 'text-primary-400'
                                      : preview.hasRoomColumn && i === 1
                                        ? 'text-success-400'
                                        : 'text-dark-200'
                                  }`}
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-700">
                            {preview.rows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-dark-700/30">
                                {preview.headers.map((_, colIdx) => (
                                  <td key={colIdx} className="px-3 py-1.5 text-dark-300 whitespace-nowrap">
                                    {row[colIdx] || ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-dark-200 hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={isUploading}
                        className="px-4 py-2 text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUploading ? 'Importing...' : `Import ${preview.totalRows} row${preview.totalRows !== 1 ? 's' : ''}`}
                      </button>
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
