import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { superadminService, AuditLogItem } from '../../services/superadmin'

const ACTIONS = [
  '',
  'login',
  'admin_created',
  'admin_updated',
  'admin_deleted',
  'impersonation_started',
  'campaign_created',
  'campaign_sent',
  'campaign_deleted',
]

export function SuperAdminAuditLog() {
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 100

  const load = () => {
    setLoading(true)
    superadminService
      .listAuditLog({
        q: q || undefined,
        action: action || undefined,
        limit,
        offset,
      })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, action])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-dark-300 mt-1">
          {total.toLocaleString()} recorded actions by super-administrators.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setOffset(0)
          load()
        }}
        className="flex gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action, admin email, target"
            className="pl-10 pr-3 py-2 w-full bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={action}
          onChange={(e) => {
            setOffset(0)
            setAction(e.target.value)
          }}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a || 'All actions'}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dark-800 text-dark-300 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">When</th>
              <th className="text-left px-4 py-3">Admin</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">Target</th>
              <th className="text-left px-4 py-3">Details</th>
              <th className="text-left px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-dark-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-dark-400">
                  No audit entries
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3 text-dark-400 text-xs whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-dark-200">{a.superadmin_email}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{a.action}</td>
                  <td className="px-4 py-3 text-dark-300 text-xs">
                    {a.target_type && a.target_id
                      ? `${a.target_type}:${a.target_id.slice(0, 8)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-dark-300 text-xs max-w-md">
                    {a.details ? (
                      <code className="break-all">{JSON.stringify(a.details)}</code>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-xs">{a.ip_address || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-800 text-sm">
            <div className="text-dark-400">
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 bg-dark-800 text-dark-200 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 bg-dark-800 text-dark-200 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
