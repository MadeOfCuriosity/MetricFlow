import { useState, useEffect, useCallback } from 'react'
import {
  ArrowPathIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '../../context/ToastContext'
import { IntegrationSetupModal } from '../../components/IntegrationSetupModal'
import { SyncHistoryModal } from '../../components/SyncHistoryModal'
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal'
import { integrationsApi } from '../../services/integrations'
import type { Integration, IntegrationProvider } from '../../types/integration'
import { formatDistanceToNow } from 'date-fns'

const PROVIDERS: Record<
  string,
  { name: string; color: string; description: string }
> = {
  google_sheets: {
    name: 'Google Sheets',
    color: '#0F9D58',
    description: 'Import data from Google Spreadsheets',
  },
  zoho_crm: {
    name: 'Zoho CRM',
    color: '#E42527',
    description: 'Sync leads, deals, and contacts',
  },
  zoho_books: {
    name: 'Zoho Books',
    color: '#4BC882',
    description: 'Sync invoices and expenses',
  },
  zoho_sheet: {
    name: 'Zoho Sheet',
    color: '#17B26A',
    description: 'Import from Zoho spreadsheets',
  },
  leadsquared: {
    name: 'LeadSquared',
    color: '#FF6B35',
    description: 'Pull lead and activity data',
  },
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircleIcon; className: string; label: string }
> = {
  connected: {
    icon: CheckCircleIcon,
    className: 'text-success-400',
    label: 'Connected',
  },
  error: {
    icon: ExclamationCircleIcon,
    className: 'text-danger-400',
    label: 'Error',
  },
  disconnected: {
    icon: XCircleIcon,
    className: 'text-dark-400',
    label: 'Disconnected',
  },
  pending_auth: {
    icon: ClockIcon,
    className: 'text-warning-400',
    label: 'Pending Auth',
  },
}

export function AdminIntegrations() {
  const { success, error: showError } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  // Modals
  const [setupProvider, setSetupProvider] = useState<IntegrationProvider | null>(null)
  const [editIntegration, setEditIntegration] = useState<Integration | null>(null)
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [historyIntegration, setHistoryIntegration] = useState<Integration | null>(null)
  const [deleteIntegration, setDeleteIntegration] = useState<Integration | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchIntegrations = useCallback(async () => {
    try {
      const resp = await integrationsApi.getAll()
      setIntegrations(resp.integrations)
    } catch {
      showError('Failed to load integrations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const handleSync = async (integration: Integration) => {
    setSyncingIds((prev) => new Set(prev).add(integration.id))
    try {
      const log = await integrationsApi.triggerSync(integration.id)
      if (log.status === 'success') {
        success('Sync Complete', log.summary || `Synced ${log.rows_written} values.`)
      } else if (log.status === 'partial') {
        success('Sync Partial', log.summary || `Synced with ${log.errors_count} errors.`)
      } else {
        showError(log.summary || 'Sync failed.')
      }
      fetchIntegrations()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError(error.response?.data?.detail || 'Sync failed')
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev)
        next.delete(integration.id)
        return next
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteIntegration) return
    setIsDeleting(true)
    try {
      await integrationsApi.delete(deleteIntegration.id)
      success(
        'Disconnected',
        `${deleteIntegration.display_name} has been disconnected.`
      )
      setDeleteIntegration(null)
      fetchIntegrations()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError(error.response?.data?.detail || 'Failed to disconnect')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetupComplete = () => {
    setIsSetupOpen(false)
    setSetupProvider(null)
    setEditIntegration(null)
    success('Integration Configured', 'Your integration is ready.')
    fetchIntegrations()
  }

  const connectedCount = integrations.filter(
    (i) => i.status === 'connected'
  ).length

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <p className="text-sm text-dark-400">Total Integrations</p>
          <p className="text-xl font-bold text-foreground mt-1">{integrations.length}</p>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <p className="text-sm text-dark-400">Connected</p>
          <p className="text-xl font-bold text-success-400 mt-1">{connectedCount}</p>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <p className="text-sm text-dark-400">Errors</p>
          <p className="text-xl font-bold text-danger-400 mt-1">
            {integrations.filter((i) => i.status === 'error').length}
          </p>
        </div>
      </div>

      {/* Integrations Table */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-dark-300">Loading integrations...</div>
        ) : integrations.length === 0 ? (
          <div className="p-8 text-center text-dark-300">
            <ArrowPathIcon className="w-12 h-12 mx-auto mb-4 text-dark-500" />
            <p>No integrations configured yet.</p>
            <button
              onClick={() => {
                setSetupProvider('google_sheets')
                setIsSetupOpen(true)
              }}
              className="mt-3 text-sm text-primary-400 hover:text-primary-300"
            >
              Set up your first integration
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Integration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider hidden md:table-cell">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider hidden lg:table-cell">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {integrations.map((integration) => {
                const provider = PROVIDERS[integration.provider]
                const statusCfg = STATUS_CONFIG[integration.status] || STATUS_CONFIG.disconnected
                const StatusIcon = statusCfg.icon

                return (
                  <tr
                    key={integration.id}
                    className="hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: provider?.color || '#6b7280',
                          }}
                        >
                          {(provider?.name || integration.provider)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground font-medium truncate">
                            {integration.display_name}
                          </p>
                          <p className="text-xs text-dark-400">
                            {provider?.name || integration.provider}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-4 w-4 ${statusCfg.className}`} />
                        <span className={`text-sm ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-dark-300 capitalize">
                        {integration.sync_schedule === 'manual'
                          ? 'Manual'
                          : `Every ${integration.sync_schedule}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-dark-400">
                        {integration.last_synced_at
                          ? formatDistanceToNow(
                              new Date(integration.last_synced_at),
                              { addSuffix: true }
                            )
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {integration.status === 'connected' && (
                          <button
                            onClick={() => handleSync(integration)}
                            disabled={syncingIds.has(integration.id)}
                            className="p-2 text-dark-300 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Sync now"
                          >
                            <ArrowPathIcon
                              className={`w-4 h-4 ${
                                syncingIds.has(integration.id)
                                  ? 'animate-spin'
                                  : ''
                              }`}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryIntegration(integration)}
                          className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-600 rounded-lg transition-colors"
                          title="Sync history"
                        >
                          <ClockIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSetupProvider(integration.provider)
                            setEditIntegration(integration)
                            setIsSetupOpen(true)
                          }}
                          className="px-2 py-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => setDeleteIntegration(integration)}
                          className="p-2 text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors"
                          title="Disconnect"
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
        )}
      </div>

      {/* Setup Modal */}
      <IntegrationSetupModal
        isOpen={isSetupOpen}
        onClose={() => {
          setIsSetupOpen(false)
          setSetupProvider(null)
          setEditIntegration(null)
        }}
        onComplete={handleSetupComplete}
        provider={setupProvider}
        editIntegration={editIntegration}
      />

      {/* Sync History Modal */}
      {historyIntegration && (
        <SyncHistoryModal
          isOpen={!!historyIntegration}
          onClose={() => setHistoryIntegration(null)}
          integrationId={historyIntegration.id}
          integrationName={historyIntegration.display_name}
        />
      )}

      {/* Delete Confirmation */}
      {deleteIntegration && (
        <DeleteConfirmModal
          isOpen={!!deleteIntegration}
          onClose={() => setDeleteIntegration(null)}
          onConfirm={handleDelete}
          title="Disconnect Integration"
          message={`Are you sure you want to disconnect "${deleteIntegration.display_name}"? This will remove all field mappings and stop scheduled syncs.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
