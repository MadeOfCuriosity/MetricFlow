import { useState, useEffect, useCallback } from 'react'
import { Dialog } from '@headlessui/react'
import {
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  XMarkIcon,
  PencilIcon,
  ArrowPathRoundedSquareIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '../../context/ToastContext'
import { IntegrationSetupModal } from '../../components/IntegrationSetupModal'
import { SyncHistoryModal } from '../../components/SyncHistoryModal'
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal'
import { integrationsApi } from '../../services/integrations'
import type { Integration, IntegrationProvider } from '../../types/integration'
import { formatDistanceToNow } from 'date-fns'
import { getApiError } from '../../lib/apiError'
import { StatChip } from '../../components/ui/StatChip'
import { Modal } from '../../components/ui/Modal'
import { WhatsAppOrgCard } from '../../components/whatsapp/WhatsAppOrgCard'

const PROVIDERS: Record<
  string,
  { name: string; color: string; description: string }
> = {
  google_sheets: {
    name: 'Google Sheets',
    color: '#0F9D58',
    description: 'Import metric data from Google Spreadsheets in real time',
  },
  zoho_crm: {
    name: 'Zoho CRM',
    color: '#E42527',
    description: 'Sync customer leads, pipeline deals, and accounts',
  },
  zoho_books: {
    name: 'Zoho Books',
    color: '#4BC882',
    description: 'Sync financial invoices, expenses, and revenue',
  },
  zoho_sheet: {
    name: 'Zoho Sheet',
    color: '#17B26A',
    description: 'Import worksheets and rows from Zoho cloud sheets',
  },
  leadsquared: {
    name: 'LeadSquared',
    color: '#FF6B35',
    description: 'Pull sales lead stages and activity milestones',
  },
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircleIcon; className: string; label: string; badge: string }
> = {
  connected: {
    icon: CheckCircleIcon,
    className: 'text-success-400',
    label: 'Connected',
    badge: 'bg-success-500/10 text-success-400 border-success-500/20',
  },
  error: {
    icon: ExclamationCircleIcon,
    className: 'text-danger-400',
    label: 'Error',
    badge: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  },
  disconnected: {
    icon: XCircleIcon,
    className: 'text-dark-400',
    label: 'Disconnected',
    badge: 'bg-dark-800 text-dark-400 border-dark-700',
  },
  pending_auth: {
    icon: ClockIcon,
    className: 'text-warning-400',
    label: 'Pending Auth',
    badge: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  },
}

export function AdminIntegrations() {
  const { success, error: showError } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  // Modals
  const [isPickerOpen, setIsPickerOpen] = useState(false)
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
  }, [showError])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const handleSync = async (integration: Integration) => {
    setSyncingIds((prev) => new Set(prev).add(integration.id))
    try {
      const resp = await integrationsApi.triggerSync(integration.id)
      if (resp.status === 'success') {
        success(
          'Sync Completed',
          `${resp.rows_written} records synced for ${integration.display_name}.`
        )
      } else {
        showError('Sync Warning', resp.summary || 'Sync completed with warnings')
      }
      fetchIntegrations()
    } catch (err: unknown) {
      showError('Sync Failed', getApiError(err, 'Failed to trigger sync'))
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
      showError(getApiError(err, 'Failed to disconnect'))
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

  const connectedCount = integrations.filter((i) => i.status === 'connected').length
  const errorCount = integrations.filter((i) => i.status === 'error').length

  const handleChooseProvider = (providerId: string) => {
    setIsPickerOpen(false)
    setSetupProvider(providerId as IntegrationProvider)
    setIsSetupOpen(true)
  }

  return (
    <div className="space-y-6">
      <WhatsAppOrgCard />

      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <StatChip icon={<ArrowPathRoundedSquareIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />} label="Total" value={integrations.length} />

          <StatChip icon={<span className="w-1.5 h-1.5 rounded-full bg-success-400" />} label="Connected" value={connectedCount} />

          {errorCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400">
              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
              <span>{errorCount} Error{errorCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4 stroke-[2.5]" />
          <span>Add Integration</span>
        </button>
      </div>

      {/* Integrations Table */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-dark-400">Loading integrations...</div>
        ) : integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-3">
              <ArrowPathRoundedSquareIcon className="w-7 h-7 text-dark-400 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-foreground">No integrations configured yet</p>
            <p className="text-xs text-dark-400 mt-1 mb-5">Connect Google Sheets, Zoho CRM, or LeadSquared to automate data sync.</p>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-xs hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Connect First Integration</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-950/40 text-[11px] font-semibold text-dark-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Integration</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 hidden md:table-cell">Schedule</th>
                  <th className="px-4 py-3.5 hidden lg:table-cell">Last Sync</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 text-sm">
                {integrations.map((integration) => {
                  const provider = PROVIDERS[integration.provider]
                  const statusCfg = STATUS_CONFIG[integration.status] || STATUS_CONFIG.disconnected

                  return (
                    <tr
                      key={integration.id}
                      className="hover:bg-dark-800/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                            style={{
                              backgroundColor: provider?.color || '#6b7280',
                            }}
                          >
                            {(provider?.name || integration.provider)
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-brand transition-colors">
                              {integration.display_name}
                            </p>
                            <p className="text-xs text-dark-400">
                              {provider?.name || integration.provider}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${statusCfg.badge}`}
                        >
                          <statusCfg.icon className="w-3 h-3" />
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-dark-300 capitalize font-medium">
                          {integration.sync_schedule === 'manual'
                            ? 'Manual'
                            : `Every ${integration.sync_schedule}`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-dark-400">
                          {integration.last_synced_at
                            ? formatDistanceToNow(
                                new Date(integration.last_synced_at),
                                { addSuffix: true }
                              )
                            : 'Never'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {integration.status === 'connected' && (
                            <button
                              type="button"
                              onClick={() => handleSync(integration)}
                              disabled={syncingIds.has(integration.id)}
                              className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              title="Sync now"
                            >
                              <ArrowPathIcon
                                className={`w-4 h-4 ${
                                  syncingIds.has(integration.id) ? 'animate-spin' : ''
                                }`}
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setHistoryIntegration(integration)}
                            className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                            title="View sync history"
                          >
                            <ClockIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditIntegration(integration)
                              setSetupProvider(integration.provider)
                              setIsSetupOpen(true)
                            }}
                            className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit settings"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteIntegration(integration)}
                            className="p-1.5 text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors cursor-pointer"
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
          </div>
        )}
      </div>

      {/* Provider Picker Modal */}
      <Modal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 p-6 shadow-2xl transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <Dialog.Title className="text-base font-bold text-foreground tracking-tight">
              Choose Integration Provider
            </Dialog.Title>
            <p className="text-xs text-dark-400 mt-0.5">Select a data source to connect with your rooms</p>
          </div>
          <button
            onClick={() => setIsPickerOpen(false)}
            className="text-dark-400 hover:text-foreground transition-colors cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {Object.entries(PROVIDERS).map(([key, provider]) => (
            <button
              key={key}
              onClick={() => handleChooseProvider(key)}
              className="flex items-center gap-3.5 w-full p-3.5 bg-dark-950/40 hover:bg-dark-800/40 border border-dark-800 rounded-2xl transition-all text-left cursor-pointer group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: provider.color }}
              >
                {provider.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">{provider.name}</p>
                <p className="text-[11px] text-dark-400 mt-0.5">{provider.description}</p>
              </div>
              <span className="text-xs text-dark-400 group-hover:text-foreground transition-colors">Connect &rarr;</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Setup / Edit Modal */}
      {isSetupOpen && setupProvider && (
        <IntegrationSetupModal
          isOpen={isSetupOpen}
          provider={setupProvider}
          editIntegration={editIntegration}
          onClose={() => {
            setIsSetupOpen(false)
            setSetupProvider(null)
            setEditIntegration(null)
          }}
          onComplete={handleSetupComplete}
        />
      )}

      {/* History Modal */}
      {historyIntegration && (
        <SyncHistoryModal
          isOpen={!!historyIntegration}
          integrationId={historyIntegration.id}
          integrationName={historyIntegration.display_name}
          onClose={() => setHistoryIntegration(null)}
        />
      )}

      {/* Disconnect Confirmation */}
      {deleteIntegration && (
        <DeleteConfirmModal
          isOpen={!!deleteIntegration}
          title="Disconnect Integration"
          message={`Are you sure you want to disconnect "${deleteIntegration.display_name}"? Scheduled syncs will stop running.`}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteIntegration(null)}
        />
      )}
    </div>
  )
}
