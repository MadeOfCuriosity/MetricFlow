import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  BuildingOffice2Icon,
  UsersIcon,
  CreditCardIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { superadminService, PlatformInsights } from '../../services/superadmin'

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#14b8a6', '#eab308']

function StatCard({
  label,
  value,
  sub,
  Icon,
}: {
  label: string
  value: string | number
  sub?: string
  Icon: any
}) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-dark-300">{label}</div>
        <Icon className="w-5 h-5 text-primary-400" />
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="mt-1 text-xs text-dark-400">{sub}</div>}
    </div>
  )
}

export function SuperAdminInsights() {
  const [data, setData] = useState<PlatformInsights | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superadminService
      .getInsights()
      .then(setData)
      .catch((e: any) => setError(e.response?.data?.detail || 'Failed to load insights'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-dark-300 text-sm">Loading insights…</div>
  if (error) return <div className="text-danger-400 text-sm">{error}</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Insights</h1>
        <p className="text-dark-300 mt-1">Health and growth across every organization.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Organizations"
          value={data.total_orgs.toLocaleString()}
          sub={`+${data.orgs_created_30d} in last 30 days`}
          Icon={BuildingOffice2Icon}
        />
        <StatCard
          label="Total Users"
          value={data.total_users.toLocaleString()}
          sub={`+${data.users_created_30d} in last 30 days`}
          Icon={UsersIcon}
        />
        <StatCard
          label="Active Subscriptions"
          value={data.active_subscriptions.toLocaleString()}
          Icon={CreditCardIcon}
        />
        <StatCard
          label="Estimated MRR"
          value={data.mrr > 0 ? `₹${data.mrr.toLocaleString()}` : '—'}
          sub={data.mrr === 0 ? 'Set RAZORPAY_PLAN_PRICES' : 'based on active subs'}
          Icon={BanknotesIcon}
        />
      </div>

      <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
        <div className="text-sm font-semibold text-foreground mb-4">
          Signups (last 30 days)
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={data.signups_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Legend />
              <Line type="monotone" dataKey="orgs" stroke="#6366f1" strokeWidth={2} />
              <Line type="monotone" dataKey="users" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Organizations by Industry</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.orgs_by_industry}
                  dataKey="count"
                  nameKey="industry"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={(e) => e.industry}
                >
                  {data.orgs_by_industry.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Organizations by Plan</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={data.orgs_by_plan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="plan_code" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Plan Status Distribution</div>
          <ul className="space-y-2 text-sm">
            {data.orgs_by_plan_status.map((r) => (
              <li key={r.plan_status} className="flex justify-between text-dark-200">
                <span className="capitalize">{r.plan_status}</span>
                <span className="text-foreground font-medium">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Feature Adoption</div>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between text-dark-200">
              <span>Orgs with Integrations</span>
              <span className="text-foreground font-medium">{data.feature_adoption.with_integrations}</span>
            </li>
            <li className="flex justify-between text-dark-200">
              <span>Orgs with KPIs</span>
              <span className="text-foreground font-medium">{data.feature_adoption.with_kpis}</span>
            </li>
            <li className="flex justify-between text-dark-200">
              <span>Orgs with Rooms</span>
              <span className="text-foreground font-medium">{data.feature_adoption.with_rooms}</span>
            </li>
            <li className="flex justify-between text-dark-200">
              <span>Orgs with Data Entries</span>
              <span className="text-foreground font-medium">{data.feature_adoption.with_data}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
