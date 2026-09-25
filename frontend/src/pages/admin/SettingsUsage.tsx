import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChartBarSquareIcon,
  SparklesIcon,
  UsersIcon,
  FolderIcon,
  ArrowPathRoundedSquareIcon,
  CircleStackIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { adminService, AdminStats } from '../../services/admin'
import api from '../../services/api'

interface RateLimitInfo {
  allowed: boolean
  remaining_calls: number
  limit_per_day: number
  resets_at: string
}

export function SettingsUsage() {
  const { organization } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUsageData()
  }, [])

  const loadUsageData = async () => {
    try {
      setIsLoading(true)
      const [statsData, rateLimitRes] = await Promise.all([
        adminService.getStats(30).catch(() => null),
        api.get<RateLimitInfo>('/api/ai/rate-limit').catch(() => null),
      ])
      if (statsData) setStats(statsData)
      if (rateLimitRes?.data) setRateLimit(rateLimitRes.data)
    } finally {
      setIsLoading(false)
    }
  }

  // Quotas according to plan
  const planCode = organization?.plan_code || 'free'
  const isBusiness = planCode.includes('business')
  const isEnterprise = planCode.includes('enterprise')
  const isTeam = planCode.includes('team')

  const aiDailyLimit = rateLimit?.limit_per_day ?? (isEnterprise ? 1000 : isBusiness ? 50 : isTeam ? 25 : 10)
  const aiRemaining = rateLimit?.remaining_calls ?? aiDailyLimit
  const aiUsed = Math.max(0, aiDailyLimit - aiRemaining)
  const aiPercent = Math.min(100, Math.round((aiUsed / aiDailyLimit) * 100))

  const usersLimit = isEnterprise ? 9999 : isBusiness ? 25 : isTeam ? 8 : 5
  const usersCurrent = stats?.total_users ?? 1
  const usersPercent = Math.min(100, Math.round((usersCurrent / usersLimit) * 100))

  const kpisLimit = isEnterprise || isBusiness ? 9999 : isTeam ? 30 : 10
  const kpisCurrent = stats?.total_kpis ?? 0
  const kpisPercent = kpisLimit === 9999 ? 10 : Math.min(100, Math.round((kpisCurrent / kpisLimit) * 100))

  const integrationsLimit = isEnterprise || isBusiness ? 9999 : isTeam ? 2 : 1
  const integrationsCurrent = stats?.active_integrations ?? 0
  const integrationsPercent = integrationsLimit === 9999 ? 20 : Math.min(100, Math.round((integrationsCurrent / integrationsLimit) * 100))

  const roomsLimit = isEnterprise || isBusiness ? 9999 : isTeam ? 3 : 2
  const roomsCurrent = stats?.total_rooms ?? 0
  const roomsPercent = roomsLimit === 9999 ? 15 : Math.min(100, Math.round((roomsCurrent / roomsLimit) * 100))

  if (isLoading) {
    return (
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-4 animate-pulse shadow-sm">
        <div className="h-6 w-48 bg-dark-800 rounded mb-2" />
        <div className="h-4 w-72 bg-dark-800/60 rounded mb-6" />
        <div className="h-28 bg-dark-950/40 border border-dark-800 rounded-2xl" />
      </div>
    )
  }

  const scrollToUpgrade = () => {
    const el = document.getElementById('upgrade')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate('/settings/plan#upgrade')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
              <ChartBarSquareIcon className="w-5 h-5 text-dark-300 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Usage &amp; Quotas</h2>
              <p className="text-xs text-dark-300 mt-0.5">
                Monitor live resource consumption, active limits, and API capacity.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToUpgrade}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-xs sm:text-sm shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <ArrowTrendingUpIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Increase Quotas</span>
          </button>
        </div>

        {/* Highlight Banner: AI Quota */}
        <div className="p-5 bg-dark-950/40 border border-dark-800 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-brand" />
              <span className="text-sm font-bold text-foreground">AI Intelligence Calls (Today)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-dark-400">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>Resets daily at 00:00 UTC</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-foreground">
                {aiUsed} of {aiDailyLimit} calls used
              </span>
              <span className="text-dark-400 font-medium">{aiRemaining} remaining</span>
            </div>
            <div className="w-full h-2.5 bg-dark-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  aiPercent > 85 ? 'bg-danger-500' : aiPercent > 60 ? 'bg-warning-500' : 'bg-brand'
                }`}
                style={{ width: `${aiPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quota Progress Cards Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Team Members */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <UsersIcon className="w-4 h-4 text-brand" />
              <span>Team Seats</span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {usersCurrent} / {usersLimit === 9999 ? 'Unlimited' : usersLimit}
            </span>
          </div>
          <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${usersLimit === 9999 ? 20 : usersPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-dark-400">
            {usersLimit === 9999
              ? 'Enterprise unlimited seats'
              : `${usersLimit - usersCurrent} seats available on this plan`}
          </p>
        </div>

        {/* Tracked KPIs */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <BoltIcon className="w-4 h-4 text-dark-400" />
              <span>Tracked KPIs</span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {kpisCurrent} / {kpisLimit === 9999 ? 'Unlimited' : kpisLimit}
            </span>
          </div>
          <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-success-500 rounded-full transition-all duration-500"
              style={{ width: `${kpisLimit === 9999 ? 25 : kpisPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-dark-400">
            {kpisLimit === 9999 ? 'Unlimited KPI computations' : `${Math.max(0, kpisLimit - kpisCurrent)} KPI slots remaining`}
          </p>
        </div>

        {/* Connected Integrations */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ArrowPathRoundedSquareIcon className="w-4 h-4 text-dark-400" />
              <span>Connected Integrations</span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {integrationsCurrent} / {integrationsLimit === 9999 ? 'All' : integrationsLimit}
            </span>
          </div>
          <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${integrationsLimit === 9999 ? 30 : integrationsPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-dark-400">Google Sheets, Zoho Suite, LeadSquared sync</p>
        </div>

        {/* Departmental Rooms */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FolderIcon className="w-4 h-4 text-dark-400" />
              <span>Departmental Rooms</span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {roomsCurrent} / {roomsLimit === 9999 ? 'Unlimited' : roomsLimit}
            </span>
          </div>
          <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${roomsLimit === 9999 ? 20 : roomsPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-dark-400">Hierarchical room tree and sub-dashboards</p>
        </div>
      </div>

      {/* Storage & Reactive Engine Stats */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-foreground tracking-tight">Database &amp; Engine Throughput</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-dark-950/40 border border-dark-800 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-700">
              <CircleStackIcon className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <span className="text-xs font-semibold text-foreground">Total Data Entries</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{stats?.total_data_entries ?? 0}</p>
              <p className="text-[11px] text-dark-400">Encrypted in PostgreSQL</p>
            </div>
          </div>

          <div className="p-4 bg-dark-950/40 border border-dark-800 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-700">
              <BoltIcon className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <span className="text-xs font-semibold text-foreground">Calculation Engine</span>
              <p className="text-lg font-bold text-foreground mt-0.5">Unlimited</p>
              <p className="text-[11px] text-dark-400">Sub-millisecond formula updates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA banner */}
      <div className="bg-gradient-to-r from-brand/10 via-dark-900 to-dark-900 border border-brand/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Need higher capacity or custom limits?</h3>
          <p className="text-xs text-dark-300 mt-1 max-w-xl">
            Upgrade your workspace to unlock unlimited tracked metrics, team seats, priority AI pipelines, and dedicated support.
          </p>
        </div>
        <button
          type="button"
          onClick={scrollToUpgrade}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-xs sm:text-sm shadow-sm cursor-pointer self-start sm:self-auto flex-shrink-0"
        >
          <span>Upgrade Workspace</span>
          <ArrowTrendingUpIcon className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  )
}
