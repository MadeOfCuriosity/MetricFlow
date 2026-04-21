import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ExclamationTriangleIcon,
  BoltIcon,
  ArrowPathRoundedSquareIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'
import { superadminService, SystemHealth } from '../../services/superadmin'

function Section({
  title,
  Icon,
  children,
}: {
  title: string
  Icon: any
  children: React.ReactNode
}) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <Icon className="w-4 h-4 text-primary-400" />
        {title}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-dark-400">{label}</div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}

export function SuperAdminHealth() {
  const [data, setData] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superadminService
      .getHealth()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-dark-300 text-sm">Loading…</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Health</h1>
        <p className="text-dark-300 mt-1">Platform signals that warrant attention.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Webhooks (7d)" Icon={BoltIcon}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Received" value={data.webhooks.total_events_7d} />
            <Stat
              label="Last event"
              value={
                data.webhooks.last_event_at
                  ? new Date(data.webhooks.last_event_at).toLocaleString()
                  : '—'
              }
            />
          </div>
        </Section>

        <Section title="Syncs (7d)" Icon={ArrowPathRoundedSquareIcon}>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total" value={data.syncs.total_syncs_7d} />
            <Stat label="Failed" value={data.syncs.failed_syncs_7d} />
            <Stat
              label="Last"
              value={
                data.syncs.last_sync_at
                  ? new Date(data.syncs.last_sync_at).toLocaleDateString()
                  : '—'
              }
            />
          </div>
        </Section>

        <Section title="AI Usage (30d)" Icon={CpuChipIcon}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Calls" value={data.ai_usage.calls_30d.toLocaleString()} />
            <Stat label="Orgs using AI" value={data.ai_usage.orgs_using_ai_30d} />
          </div>
        </Section>
      </div>

      <Section title="Integration Failures" Icon={ExclamationTriangleIcon}>
        {data.integration_failures.length === 0 ? (
          <div className="text-sm text-dark-400">No integrations in error state.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-dark-400">
              <tr>
                <th className="text-left py-2">Organization</th>
                <th className="text-left py-2">Provider</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Error</th>
                <th className="text-left py-2">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {data.integration_failures.map((f, idx) => (
                <tr key={idx}>
                  <td className="py-2">
                    <Link
                      to={`/superadmin/organizations/${f.org_id}`}
                      className="text-primary-400 hover:underline"
                    >
                      {f.org_name}
                    </Link>
                  </td>
                  <td className="py-2 text-dark-200 capitalize">
                    {f.provider.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2 text-danger-400 capitalize">{f.status}</td>
                  <td className="py-2 text-dark-300 text-xs max-w-md truncate">
                    {f.error_message || '—'}
                  </td>
                  <td className="py-2 text-dark-400 text-xs">
                    {f.last_sync_at ? new Date(f.last_sync_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}
