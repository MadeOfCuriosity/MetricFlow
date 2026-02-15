import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import type { Integration, IntegrationProvider } from '../types/integration'

interface ConnectorCardProps {
  provider: IntegrationProvider
  name: string
  description: string
  color: string
  integration?: Integration | null
  onConnect: () => void
  onManage: () => void
  onSync: () => void
  isSyncing?: boolean
}

const STATUS_CONFIG = {
  connected: { label: 'Connected', icon: CheckCircleIcon, cls: 'text-success-400 bg-success-500/10' },
  pending_auth: { label: 'Pending Setup', icon: ClockIcon, cls: 'text-warning-400 bg-warning-500/10' },
  error: { label: 'Error', icon: ExclamationTriangleIcon, cls: 'text-danger-400 bg-danger-500/10' },
  disconnected: { label: 'Disconnected', icon: ExclamationTriangleIcon, cls: 'text-dark-400 bg-dark-700' },
}

function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

// Provider logo/icon as simple SVG text
const PROVIDER_ICONS: Record<IntegrationProvider, string> = {
  google_sheets: 'GS',
  zoho_crm: 'Z',
  zoho_books: 'ZB',
  zoho_sheet: 'ZS',
  leadsquared: 'LS',
}

export function ConnectorCard({
  provider,
  name,
  description,
  color,
  integration,
  onConnect,
  onManage,
  onSync,
  isSyncing,
}: ConnectorCardProps) {
  const isConnected = integration && integration.status === 'connected'
  const statusInfo = integration ? STATUS_CONFIG[integration.status] : null

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: color }}
          >
            {PROVIDER_ICONS[provider]}
          </div>
          <div>
            <h3 className="text-foreground font-semibold">{name}</h3>
            {integration && (
              <p className="text-sm text-dark-400">{integration.display_name}</p>
            )}
          </div>
        </div>
        {statusInfo && (
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusInfo.cls}`}>
            <statusInfo.icon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-dark-300 mb-4 flex-1">{description}</p>

      {/* Connected state: show sync info */}
      {isConnected && (
        <div className="flex items-center justify-between text-xs text-dark-400 mb-3 bg-dark-800 rounded-lg px-3 py-2">
          <span>Last sync: {formatLastSync(integration.last_synced_at)}</span>
          <span>{integration.mapping_count} field{integration.mapping_count !== 1 ? 's' : ''} mapped</span>
        </div>
      )}

      {/* Error state */}
      {integration?.status === 'error' && integration.error_message && (
        <div className="text-xs text-danger-400 bg-danger-500/10 rounded-lg px-3 py-2 mb-3">
          {integration.error_message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!integration ? (
          <button
            onClick={onConnect}
            className="flex-1 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Connect
          </button>
        ) : (
          <>
            <button
              onClick={onManage}
              className="flex-1 px-3 py-2 border border-dark-600 text-foreground text-sm font-medium rounded-lg hover:bg-dark-800 transition-colors"
            >
              Configure
            </button>
            {isConnected && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="px-3 py-2 border border-primary-500 text-primary-400 text-sm font-medium rounded-lg hover:bg-primary-500/10 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
