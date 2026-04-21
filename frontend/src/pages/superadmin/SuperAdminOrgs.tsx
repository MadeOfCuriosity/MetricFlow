import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { superadminService, OrgListItem } from '../../services/superadmin'

export function SuperAdminOrgs() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [planStatus, setPlanStatus] = useState('')
  const [items, setItems] = useState<OrgListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const load = () => {
    setLoading(true)
    superadminService
      .listOrgs({
        q: q || undefined,
        plan_status: planStatus || undefined,
        limit,
        offset,
      })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, planStatus])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <p className="text-dark-300 mt-1">{total.toLocaleString()} total onboarded.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or website"
            className="pl-10 pr-3 py-2 w-full bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={planStatus}
          onChange={(e) => {
            setOffset(0)
            setPlanStatus(e.target.value)
          }}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All plan statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="authenticated">Authenticated</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800 text-dark-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Industry</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Users</th>
                <th className="text-right px-4 py-3">Rooms</th>
                <th className="text-right px-4 py-3">Integrations</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-dark-400">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-dark-400">
                    No organizations found
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/superadmin/organizations/${o.id}`)}
                    className="cursor-pointer hover:bg-dark-800/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">{o.name}</div>
                      {o.website && <div className="text-xs text-dark-400">{o.website}</div>}
                    </td>
                    <td className="px-4 py-3 text-dark-200">{o.industry || '—'}</td>
                    <td className="px-4 py-3 text-dark-200">{o.plan_code || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          o.plan_status === 'active' || o.plan_status === 'authenticated'
                            ? 'bg-success-500/15 text-success-400'
                            : o.plan_status === 'trialing'
                            ? 'bg-warning-500/15 text-warning-400'
                            : o.plan_status === 'past_due'
                            ? 'bg-danger-500/15 text-danger-400'
                            : 'bg-dark-700 text-dark-300'
                        }`}
                      >
                        {o.plan_status || 'none'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-dark-200">{o.user_count}</td>
                    <td className="px-4 py-3 text-right text-dark-200">{o.room_count}</td>
                    <td className="px-4 py-3 text-right text-dark-200">{o.integration_count}</td>
                    <td className="px-4 py-3 text-dark-400 text-xs">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
