import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  PencilIcon,
  ArrowPathRoundedSquareIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '../../context/ToastContext'
import { ZohoBooksSetupModal } from '../../components/zoho/ZohoBooksSetupModal'
import { isSetupIncomplete } from '../../components/zoho/catalog'
import { SyncHistoryModal } from '../../components/SyncHistoryModal'
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal'
import { integrationsApi } from '../../services/integrations'
import type { Integration } from '../../types/integration'
import { formatDistanceToNow } from 'date-fns'
import { getApiError } from '../../lib/apiError'
import { StatChip } from '../../components/ui/StatChip'
import { WhatsAppOrgCard } from '../../components/whatsapp/WhatsAppOrgCard'

const PROVIDERS: Record<
  string,
  { name: string; color: string; description: string }
> = {
  zoho_books: {
    name: 'Zoho Books',
    color: '#4BC882',
    description: 'Sync financial invoices, expenses, and revenue',
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
  incomplete: {
    icon: WrenchScrewdriverIcon,
    className: 'text-warning-400',
    label: 'Setup incomplete',
    badge: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  },
  pending_auth: {
    icon: ClockIcon,
    className: 'text-warning-400',
    label: 'Pending Auth',
    badge: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  },
}

const SCHEDULE_LABELS: Record<string, string> = {
  manual: 'Manual',
  '1h': 'Every hour',
  '6h': 'Every 6 hours',
  '12h': 'Every 12 hours',
  '24h': 'Daily',
}

export function AdminIntegrations() {
  const { success, error: showError } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  // Modals
  const [editIntegration, setEditIntegration] = useState<Integration | null>(null)
  const [resumeAuthId, setResumeAuthId] = useState<string | null>(null)
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [reconnectingId, setReconnectingId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const handledReturn = useRef(false)
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

  // Back from the Zoho sign-in: continue setup, or confirm a reconnect
  useEffect(() => {
    if (isLoading || handledReturn.current) return
    const connectedId = searchParams.get('connected') ? searchParams.get('id') : null
    const failed = searchParams.get('error') === 'oauth_failed'
    if (!connectedId && !failed) return
    handledReturn.current = true
    setSearchParams({}, { replace: true })

    if (failed) {
      showError('Zoho sign-in didn\'t finish', 'Nothing was changed. Try connecting again.')
      return
    }
    const returned = integrations.find(i => i.id === connectedId)
    if (!returned) return
    if (isSetupIncomplete(returned)) {
      setEditIntegration(null)
      setResumeAuthId(returned.id)
      setIsSetupOpen(true)
    } else {
      success('Reconnected', `${returned.display_name} can sync again.`)
    }
  }, [isLoading, integrations, searchParams, setSearchParams, success, showError])

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

  const handleReconnect = async (integration: Integration) => {
    setReconnectingId(integration.id)
    try {
      const { authorize_url } = await integrationsApi.getOAuthUrl(integration.provider, integration.id)
      window.location.href = authorize_url
    } catch (err: unknown) {
      showError('Reconnect failed', getApiError(err, 'Could not start the Zoho sign-in'))
      setReconnectingId(null)
    }
  }

  const openSetup = (opts: { edit?: Integration; resumeId?: string } = {}) => {
    setEditIntegration(opts.edit ?? null)
    setResumeAuthId(opts.resumeId ?? null)
    setIsSetupOpen(true)
  }

  const connectedCount = integrations.filter((i) => i.status === 'connected').length
  const errorCount = integrations.filter((i) => i.status === 'error').length

  const handleAddIntegration = () => openSetup()

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
          onClick={handleAddIntegration}
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
            <p className="text-xs text-dark-400 mt-1 mb-5">Connect Zoho Books to sync invoices, expenses, and revenue automatically.</p>
            <button
              type="button"
              onClick={handleAddIntegration}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-xs hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Connect Zoho Books</span>
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
                  const incomplete = isSetupIncomplete(integration)
                  const statusCfg = incomplete
                    ? STATUS_CONFIG.incomplete
                    : STATUS_CONFIG[integration.status] || STATUS_CONFIG.disconnected

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
                            {!incomplete && integration.error_message && (
                              <p
                                className={`text-[11px] mt-0.5 max-w-xs truncate ${integration.status === 'error' ? 'text-danger-400' : 'text-warning-400'}`}
                                title={integration.error_message}
                              >
                                {integration.status === 'error' ? integration.error_message : `Last sync incomplete: ${integration.error_message}`}
                              </p>
                            )}
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
                          {incomplete ? '—' : SCHEDULE_LABELS[integration.sync_schedule] ?? integration.sync_schedule}
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
                          {incomplete ? (
                            <button
                              type="button"
                              onClick={() => openSetup(integration.status === 'connected' ? { resumeId: integration.id } : {})}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 mr-1 text-xs font-semibold text-foreground border border-dark-600 hover:border-dark-500 rounded-lg transition-colors cursor-pointer"
                            >
                              <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                              Finish setup
                            </button>
                          ) : (
                            <>
                              {integration.status === 'error' && (
                                <button
                                  type="button"
                                  onClick={() => handleReconnect(integration)}
                                  disabled={reconnectingId === integration.id}
                                  className="px-2.5 py-1.5 mr-1 text-xs font-semibold text-danger-400 border border-danger-500/30 hover:bg-danger-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {reconnectingId === integration.id ? 'Opening Zoho…' : 'Reconnect'}
                                </button>
                              )}
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
                                onClick={() => openSetup({ edit: integration })}
                                className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                                title="Edit values and schedule"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* Setup / Edit Modal */}
      <ZohoBooksSetupModal
        isOpen={isSetupOpen}
        integrations={integrations}
        resumeAuthId={resumeAuthId}
        editIntegration={editIntegration}
        onChanged={fetchIntegrations}
        onClose={() => {
          setIsSetupOpen(false)
          setEditIntegration(null)
          setResumeAuthId(null)
        }}
      />

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
