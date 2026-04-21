import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { superadminService, GlobalSubscriptionItem } from '../../services/superadmin'

export function SuperAdminSubscriptions() {
  const [statusFilter, setStatusFilter] = useState('')
  const [items, setItems] = useState<GlobalSubscriptionItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 50

  useEffect(() => {
    setLoading(true)
    superadminService
      .listSubscriptions({ status: statusFilter || undefined, limit, offset })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }, [offset, statusFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-dark-300 mt-1">{total.toLocaleString()} subscriptions across platform.</p>
      </div>

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setOffset(0)
            setStatusFilter(e.target.value)
          }}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="authenticated">Authenticated</option>
          <option value="trialing">Trialing</option>
          <option value="pending">Pending</option>
          <option value="halted">Halted</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800 text-dark-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Razorpay ID</th>
                <th className="text-left px-4 py-3">Current Period</th>
                <th className="text-right px-4 py-3">Paid / Total</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-dark-400">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-dark-400">
                    No subscriptions
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className="hover:bg-dark-800/60">
                    <td className="px-4 py-3">
                      <Link
                        to={`/superadmin/organizations/${s.org_id}`}
                        className="text-primary-400 hover:underline"
                      >
                        {s.org_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{s.plan_code}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          s.status === 'active' || s.status === 'authenticated'
                            ? 'bg-success-500/15 text-success-400'
                            : s.status === 'trialing'
                            ? 'bg-warning-500/15 text-warning-400'
                            : s.status === 'halted' || s.status === 'expired'
                            ? 'bg-danger-500/15 text-danger-400'
                            : 'bg-dark-700 text-dark-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-400 text-xs">
                      {s.razorpay_subscription_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-dark-400 text-xs">
                      {s.current_start && s.current_end
                        ? `${new Date(s.current_start).toLocaleDateString()} → ${new Date(
                            s.current_end
                          ).toLocaleDateString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-dark-200">
                      {s.paid_count}
                      {s.total_count ? ` / ${s.total_count}` : ''}
                    </td>
                    <td className="px-4 py-3 text-dark-400 text-xs">
                      {new Date(s.created_at).toLocaleDateString()}
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
