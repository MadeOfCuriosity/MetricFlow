import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { integrationsApi } from '../services/integrations'
import type { SyncLog } from '../types/integration'

interface SyncHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  integrationId: string
  integrationName: string
}

const STATUS_CONFIG = {
  running: { label: 'Running', icon: ArrowPathIcon, cls: 'text-primary-400 bg-primary-500/10' },
  success: { label: 'Success', icon: CheckCircleIcon, cls: 'text-success-400 bg-success-500/10' },
  partial: { label: 'Partial', icon: ExclamationTriangleIcon, cls: 'text-warning-400 bg-warning-500/10' },
  failed: { label: 'Failed', icon: XCircleIcon, cls: 'text-danger-400 bg-danger-500/10' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress...'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export function SyncHistoryModal({ isOpen, onClose, integrationId, integrationName }: SyncHistoryModalProps) {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && integrationId) {
      fetchLogs()
    }
  }, [isOpen, integrationId])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const resp = await integrationsApi.getLogs(integrationId, 50)
      setLogs(resp.logs)
    } catch {
      // silently handle
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-xl shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    Sync History — {integrationName}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-dark-400 hover:text-foreground transition-colors">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-dark-400 text-sm">
                      No sync history yet. Run your first sync to see results here.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => {
                        const status = STATUS_CONFIG[log.status]
                        const isExpanded = expandedLog === log.id
                        return (
                          <div key={log.id} className="border border-dark-700 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.cls}`}>
                                  <status.icon className={`w-3 h-3 ${log.status === 'running' ? 'animate-spin' : ''}`} />
                                  {status.label}
                                </span>
                                <span className="text-sm text-foreground">{formatDate(log.started_at)}</span>
                                <span className="text-xs text-dark-400 capitalize">{log.trigger_type}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-dark-400">
                                  {log.rows_written} written | {formatDuration(log.started_at, log.completed_at)}
                                </span>
                                <ChevronDownIcon className={`w-4 h-4 text-dark-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-3 border-t border-dark-700 pt-3 space-y-2">
                                <div className="grid grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="text-dark-400 text-xs">Rows Fetched</span>
                                    <p className="text-foreground font-medium">{log.rows_fetched}</p>
                                  </div>
                                  <div>
                                    <span className="text-dark-400 text-xs">Rows Written</span>
                                    <p className="text-foreground font-medium">{log.rows_written}</p>
                                  </div>
                                  <div>
                                    <span className="text-dark-400 text-xs">Rows Skipped</span>
                                    <p className="text-foreground font-medium">{log.rows_skipped}</p>
                                  </div>
                                  <div>
                                    <span className="text-dark-400 text-xs">Errors</span>
                                    <p className={`font-medium ${log.errors_count > 0 ? 'text-danger-400' : 'text-foreground'}`}>
                                      {log.errors_count}
                                    </p>
                                  </div>
                                </div>

                                {log.summary && (
                                  <p className="text-sm text-dark-300 mt-2">{log.summary}</p>
                                )}

                                {log.error_details && log.error_details.length > 0 && (
                                  <div className="mt-2 p-2 bg-danger-500/10 rounded-lg">
                                    <p className="text-xs font-medium text-danger-400 mb-1">Error Details:</p>
                                    <ul className="text-xs text-danger-300 space-y-0.5">
                                      {log.error_details.slice(0, 10).map((err, i) => (
                                        <li key={i}>{err}</li>
                                      ))}
                                      {log.error_details.length > 10 && (
                                        <li className="text-dark-400">...and {log.error_details.length - 10} more</li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-3 border-t border-dark-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-dark-300 hover:text-foreground transition-colors"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
