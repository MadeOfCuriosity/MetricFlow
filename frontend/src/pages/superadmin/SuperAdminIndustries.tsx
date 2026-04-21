import { useEffect, useState } from 'react'
import { superadminService, IndustryMetrics } from '../../services/superadmin'

export function SuperAdminIndustries() {
  const [items, setItems] = useState<IndustryMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superadminService
      .getIndustries()
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false))
  }, [])

  const hasMrr = items.some((i) => i.mrr > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Industries</h1>
        <p className="text-dark-300 mt-1">
          Per-industry breakdown of orgs, adoption, and revenue.
        </p>
      </div>

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dark-800 text-dark-300 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Industry</th>
              <th className="text-right px-4 py-3">Orgs</th>
              <th className="text-right px-4 py-3">Users</th>
              <th className="text-right px-4 py-3">Active Subs</th>
              <th className="text-right px-4 py-3">w/ Integrations</th>
              <th className="text-right px-4 py-3">w/ KPIs</th>
              <th className="text-right px-4 py-3">w/ Data</th>
              {hasMrr && <th className="text-right px-4 py-3">MRR</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800">
            {loading ? (
              <tr>
                <td colSpan={hasMrr ? 8 : 7} className="px-4 py-6 text-center text-dark-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={hasMrr ? 8 : 7} className="px-4 py-6 text-center text-dark-400">
                  No organizations yet
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.industry} className="hover:bg-dark-800/60">
                  <td className="px-4 py-3 text-foreground font-medium">{row.industry}</td>
                  <td className="px-4 py-3 text-right text-dark-200">{row.org_count}</td>
                  <td className="px-4 py-3 text-right text-dark-200">{row.user_count}</td>
                  <td className="px-4 py-3 text-right text-dark-200">
                    {row.active_subscriptions}
                  </td>
                  <td className="px-4 py-3 text-right text-dark-200">
                    {row.orgs_with_integrations}
                  </td>
                  <td className="px-4 py-3 text-right text-dark-200">{row.orgs_with_kpis}</td>
                  <td className="px-4 py-3 text-right text-dark-200">{row.orgs_with_data}</td>
                  {hasMrr && (
                    <td className="px-4 py-3 text-right text-dark-200">
                      {row.mrr > 0 ? `₹${row.mrr.toLocaleString()}` : '—'}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hasMrr && (
        <p className="text-xs text-dark-400">
          Set <code>RAZORPAY_PLAN_PRICES</code> in backend env to show MRR column.
        </p>
      )}
    </div>
  )
}
