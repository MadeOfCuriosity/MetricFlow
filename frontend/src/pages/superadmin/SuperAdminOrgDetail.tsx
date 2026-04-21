import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { superadminService, OrgDetail } from '../../services/superadmin'
import { startImpersonation } from '../../services/impersonation'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
      <div className="text-sm font-semibold text-foreground mb-4">{title}</div>
      {children}
    </div>
  )
}

export function SuperAdminOrgDetail() {
  const { orgId = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)

  const handleImpersonate = async (userId: string, userEmail: string) => {
    if (
      !confirm(
        `Impersonate ${userEmail}? Your actions while impersonated will be recorded in the audit log.`
      )
    )
      return
    setImpersonatingId(userId)
    try {
      const result = await superadminService.impersonate(userId)
      startImpersonation(result)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to impersonate')
      setImpersonatingId(null)
    }
  }

  useEffect(() => {
    setLoading(true)
    superadminService
      .getOrg(orgId)
      .then(setData)
      .catch((e) => setError(e.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [orgId])

  if (loading) return <div className="text-dark-300 text-sm">Loading…</div>
  if (error) return <div className="text-danger-400 text-sm">{error}</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/superadmin/organizations"
          className="inline-flex items-center gap-2 text-sm text-dark-300 hover:text-foreground"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to organizations
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">{data.name}</h1>
        <div className="text-dark-300 mt-1 text-sm">
          {data.industry || 'Industry unspecified'}
          {data.website && (
            <>
              {' · '}
              <a
                href={data.website}
                target="_blank"
                rel="noreferrer"
                className="text-primary-400 hover:underline"
              >
                {data.website}
              </a>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
          <div className="text-xs text-dark-400">Plan</div>
          <div className="text-foreground font-medium">{data.plan_code || '—'}</div>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
          <div className="text-xs text-dark-400">Status</div>
          <div className="text-foreground font-medium capitalize">
            {data.plan_status || 'none'}
          </div>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
          <div className="text-xs text-dark-400">Users</div>
          <div className="text-foreground font-medium">{data.users.length}</div>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
          <div className="text-xs text-dark-400">Rooms</div>
          <div className="text-foreground font-medium">{data.room_count}</div>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
          <div className="text-xs text-dark-400">KPIs</div>
          <div className="text-foreground font-medium">{data.kpi_count}</div>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
          <div className="text-xs text-dark-400">Entries</div>
          <div className="text-foreground font-medium">{data.entry_count}</div>
        </div>
      </div>

      <Section title="Users">
        {data.users.length === 0 ? (
          <div className="text-dark-400 text-sm">No users.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-dark-400">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Role</th>
                <th className="text-left py-2">Auth</th>
                <th className="text-left py-2">Joined</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 text-foreground">{u.name}</td>
                  <td className="py-2 text-dark-200">{u.email}</td>
                  <td className="py-2 text-dark-200">{u.role_label || u.role}</td>
                  <td className="py-2 text-dark-400 text-xs">{u.auth_provider}</td>
                  <td className="py-2 text-dark-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleImpersonate(u.id, u.email)}
                      disabled={impersonatingId === u.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-dark-600 text-dark-200 hover:bg-dark-800 rounded disabled:opacity-40"
                    >
                      <UserCircleIcon className="w-3.5 h-3.5" />
                      {impersonatingId === u.id ? 'Starting…' : 'Impersonate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Subscriptions">
        {data.subscriptions.length === 0 ? (
          <div className="text-dark-400 text-sm">No subscriptions.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-dark-400">
              <tr>
                <th className="text-left py-2">Plan</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Razorpay ID</th>
                <th className="text-left py-2">Current Period</th>
                <th className="text-left py-2">Paid / Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {data.subscriptions.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 text-foreground">{s.plan_code}</td>
                  <td className="py-2 text-dark-200 capitalize">{s.status}</td>
                  <td className="py-2 text-dark-400 text-xs">
                    {s.razorpay_subscription_id || '—'}
                  </td>
                  <td className="py-2 text-dark-400 text-xs">
                    {s.current_start && s.current_end
                      ? `${new Date(s.current_start).toLocaleDateString()} → ${new Date(
                          s.current_end
                        ).toLocaleDateString()}`
                      : '—'}
                  </td>
                  <td className="py-2 text-dark-200">
                    {s.paid_count}
                    {s.total_count ? ` / ${s.total_count}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Integrations">
        {data.integrations.length === 0 ? (
          <div className="text-dark-400 text-sm">None connected.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.integrations.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span className="text-foreground capitalize">{i.provider.replace(/_/g, ' ')}</span>
                <span className="text-dark-400">{i.status || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
