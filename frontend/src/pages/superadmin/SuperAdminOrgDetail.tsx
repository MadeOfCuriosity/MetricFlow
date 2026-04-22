import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  UserCircleIcon,
  GiftIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
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

const MANUAL_SUB_PREFIX = 'manual_'

export function SuperAdminOrgDetail() {
  const { orgId = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)

  // Grant-plan form state
  const [availablePlans, setAvailablePlans] = useState<{ code: string }[]>([])
  const [grantPlanCode, setGrantPlanCode] = useState('')
  const [grantDurationDays, setGrantDurationDays] = useState(30)
  const [grantReason, setGrantReason] = useState('')
  const [granting, setGranting] = useState(false)
  const [grantError, setGrantError] = useState('')
  const [revoking, setRevoking] = useState(false)

  const reloadOrg = async () => {
    const fresh = await superadminService.getOrg(orgId)
    setData(fresh)
  }

  const hasActiveManualSub = !!data?.subscriptions.some(
    (s) =>
      s.status === 'active' &&
      s.razorpay_subscription_id?.startsWith(MANUAL_SUB_PREFIX)
  )

  const handleGrantPlan = async () => {
    if (!grantPlanCode) {
      setGrantError('Pick a plan')
      return
    }
    if (!grantDurationDays || grantDurationDays < 1) {
      setGrantError('Duration must be at least 1 day')
      return
    }
    setGrantError('')
    setGranting(true)
    try {
      await superadminService.grantPlan(orgId, {
        plan_code: grantPlanCode,
        duration_days: grantDurationDays,
        reason: grantReason || undefined,
      })
      setGrantReason('')
      await reloadOrg()
    } catch (err: any) {
      setGrantError(err.response?.data?.detail || 'Failed to grant plan')
    } finally {
      setGranting(false)
    }
  }

  const handleRevokePlan = async () => {
    if (
      !confirm(
        'Revoke the active manually-granted plan for this organization? Users will lose plan access immediately.'
      )
    )
      return
    setRevoking(true)
    try {
      await superadminService.revokePlan(orgId)
      await reloadOrg()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to revoke plan')
    } finally {
      setRevoking(false)
    }
  }

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

  useEffect(() => {
    superadminService
      .listAvailablePlans()
      .then((plans) => {
        setAvailablePlans(plans)
        if (plans.length > 0 && !grantPlanCode) setGrantPlanCode(plans[0].code)
      })
      .catch(() => setAvailablePlans([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      <Section title="Grant plan access (no payment)">
        <p className="text-xs text-dark-400 mb-4">
          Manually activate a subscription for this organization — useful for comp
          accounts, beta testers, or goodwill extensions. Logged to the audit trail.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1">Plan</label>
            <select
              value={grantPlanCode}
              onChange={(e) => setGrantPlanCode(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
              disabled={availablePlans.length === 0}
            >
              {availablePlans.length === 0 ? (
                <option value="">No plans configured</option>
              ) : (
                availablePlans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Duration (days)</label>
            <input
              type="number"
              min={1}
              max={3650}
              value={grantDurationDays}
              onChange={(e) => setGrantDurationDays(parseInt(e.target.value) || 0)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-dark-400 mb-1">
              Reason <span className="text-dark-500">(optional)</span>
            </label>
            <input
              type="text"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="e.g. Beta tester comp, Q2 goodwill, paid offline"
              maxLength={500}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
        {grantError && (
          <div className="mt-3 text-xs text-danger-400">{grantError}</div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleGrantPlan}
            disabled={granting || availablePlans.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white rounded-lg"
          >
            <GiftIcon className="w-4 h-4" />
            {granting ? 'Granting…' : 'Grant plan'}
          </button>
          {hasActiveManualSub && (
            <button
              onClick={handleRevokePlan}
              disabled={revoking}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-danger-500 text-danger-400 hover:bg-danger-500/10 disabled:opacity-40 rounded-lg"
            >
              <XCircleIcon className="w-4 h-4" />
              {revoking ? 'Revoking…' : 'Revoke manual plan'}
            </button>
          )}
        </div>
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
              {data.subscriptions.map((s) => {
                const isManual = s.razorpay_subscription_id?.startsWith(
                  MANUAL_SUB_PREFIX
                )
                return (
                <tr key={s.id}>
                  <td className="py-2 text-foreground">
                    <div className="flex items-center gap-2">
                      {s.plan_code}
                      {isManual && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                          Manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-dark-200 capitalize">{s.status}</td>
                  <td className="py-2 text-dark-400 text-xs">
                    {isManual ? '— (manual grant)' : s.razorpay_subscription_id || '—'}
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
                )
              })}
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
