import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '../context/ToastContext'
import { ConnectorCard } from '../components/ConnectorCard'
import { IntegrationSetupModal } from '../components/IntegrationSetupModal'
import { SyncHistoryModal } from '../components/SyncHistoryModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { integrationsApi } from '../services/integrations'
import type { Integration, IntegrationProvider } from '../types/integration'

const PROVIDERS = [
  {
    id: 'google_sheets' as IntegrationProvider,
    name: 'Google Sheets',
    description: 'Import data from Google Spreadsheets. Map columns to data fields for automatic KPI calculation.',
    color: '#0F9D58',
  },
  {
    id: 'zoho_crm' as IntegrationProvider,
    name: 'Zoho CRM',
    description: 'Sync leads, deals, and contacts from Zoho CRM. Aggregate CRM data into daily metrics.',
    color: '#E42527',
  },
  {
    id: 'zoho_books' as IntegrationProvider,
    name: 'Zoho Books',
    description: 'Sync invoices, bills, expenses, and payments from Zoho Books into your KPIs.',
    color: '#4BC882',
  },
  {
    id: 'zoho_sheet' as IntegrationProvider,
    name: 'Zoho Sheet',
    description: 'Import data from Zoho Sheet spreadsheets. Map columns to data fields automatically.',
    color: '#17B26A',
  },
  {
    id: 'leadsquared' as IntegrationProvider,
    name: 'LeadSquared',
    description: 'Connect your LeadSquared account to pull lead and activity data into MetricFlow.',
    color: '#FF6B35',
  },
]

export function Integrations({ embedded = false }: { embedded?: boolean }) {
  const { success, error: showError } = useToast()
  const [searchParams] = useSearchParams()

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  // Setup modal
  const [setupProvider, setSetupProvider] = useState<IntegrationProvider | null>(null)
  const [editIntegration, setEditIntegration] = useState<Integration | null>(null)
  const [isSetupOpen, setIsSetupOpen] = useState(false)

  // Sync history modal
  const [historyIntegration, setHistoryIntegration] = useState<Integration | null>(null)

  // Delete modal
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

  // Handle OAuth redirect callback
  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('error')
    if (connected) {
      success('Connected', `${connected.replace('_', ' ')} connected successfully. Configure your field mappings to start syncing.`)
      fetchIntegrations()
    }
    if (oauthError) {
      showError('OAuth authorization failed. Please try again.')
    }
  }, [searchParams])

  const handleConnect = (provider: IntegrationProvider) => {
    setSetupProvider(provider)
    setEditIntegration(null)
    setIsSetupOpen(true)
  }

  const handleManage = (integration: Integration) => {
    setSetupProvider(integration.provider)
    setEditIntegration(integration)
    setIsSetupOpen(true)
  }

  const handleSync = async (integration: Integration) => {
    setSyncingIds(prev => new Set(prev).add(integration.id))
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
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Sync failed')
    } finally {
      setSyncingIds(prev => {
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
      success('Disconnected', `${deleteIntegration.display_name} has been disconnected.`)
      setDeleteIntegration(null)
      fetchIntegrations()
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to disconnect')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetupComplete = () => {
    setIsSetupOpen(false)
    setSetupProvider(null)
    setEditIntegration(null)
    success('Integration Configured', 'Your integration is ready. You can now sync data.')
    fetchIntegrations()
  }

  // Group: connected integrations vs available connectors
  const connectedProviders = new Set(integrations.map(i => i.provider))

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-dark-300 mt-1">
            Connect external data sources to automatically sync data into your KPIs.
          </p>
        </div>
      )}

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
            Connected ({integrations.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const provider = PROVIDERS.find(p => p.id === integration.provider)
              if (!provider) return null
              return (
                <div key={integration.id} className="relative">
                  <ConnectorCard
                    provider={integration.provider}
                    name={provider.name}
                    description={provider.description}
                    color={provider.color}
                    integration={integration}
                    onConnect={() => {}}
                    onManage={() => handleManage(integration)}
                    onSync={() => handleSync(integration)}
                    isSyncing={syncingIds.has(integration.id)}
                  />
                  {/* Extra actions */}
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      onClick={() => setHistoryIntegration(integration)}
                      className="p-1.5 text-dark-400 hover:text-foreground rounded transition-colors"
                      title="Sync History"
                    >
                      <ClockIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteIntegration(integration)}
                      className="p-1.5 text-dark-400 hover:text-danger-400 rounded transition-colors"
                      title="Disconnect"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Connectors */}
      <div>
        <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
          Available Connectors
        </h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-dark-700" />
                  <div className="h-5 w-24 bg-dark-700 rounded" />
                </div>
                <div className="h-4 w-full bg-dark-700 rounded mb-2" />
                <div className="h-4 w-3/4 bg-dark-700 rounded mb-4" />
                <div className="h-9 w-full bg-dark-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.filter(p => !connectedProviders.has(p.id)).map((provider) => (
              <ConnectorCard
                key={provider.id}
                provider={provider.id}
                name={provider.name}
                description={provider.description}
                color={provider.color}
                onConnect={() => handleConnect(provider.id)}
                onManage={() => {}}
                onSync={() => {}}
              />
            ))}
            {PROVIDERS.filter(p => !connectedProviders.has(p.id)).length === 0 && (
              <div className="col-span-full text-center py-8 text-dark-400 text-sm">
                All connectors are connected. You can manage them above.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setup Modal */}
      <IntegrationSetupModal
        isOpen={isSetupOpen}
        onClose={() => { setIsSetupOpen(false); setSetupProvider(null); setEditIntegration(null) }}
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
          message={`Are you sure you want to disconnect "${deleteIntegration.display_name}"? This will remove all field mappings and stop scheduled syncs. Previously synced data will not be deleted.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
