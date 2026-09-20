import { useNavigate } from 'react-router-dom'
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  ChartBarSquareIcon,
  SparklesIcon,
  CircleStackIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'

const PLAN_NAME: Record<string, string> = {
  team: 'Team',
  team_annual: 'Team (Annual)',
  business: 'Business',
  business_annual: 'Business (Annual)',
}

export function AdminOrganization() {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const planCode = organization?.plan_code
  const planName = planCode ? PLAN_NAME[planCode] || planCode : 'Free'
  const planStatus = organization?.plan_status || 'active'
  const isPlanActive = planStatus === 'active'

  return (
    <div className="space-y-6">
      {/* Organization Profile */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <BuildingOfficeIcon className="w-5 h-5 text-dark-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Organization Profile</h2>
            <p className="text-xs text-dark-300 mt-0.5">Workspace metadata and corporate identity.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1.5">
              Organization Name
            </label>
            <div className="px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm font-semibold text-foreground">
              {organization?.name || '—'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1.5">Industry Vertical</label>
            <div className="px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground">
              {organization?.industry || 'Not specified'}
            </div>
          </div>
        </div>
      </div>

      {/* Billing & Plan */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <CreditCardIcon className="w-5 h-5 text-dark-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Subscription & Plan</h2>
            <p className="text-xs text-dark-300 mt-0.5">Manage your active billing tier and organization entitlements.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-dark-950/40 border border-dark-800 rounded-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{planName} Tier</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                  isPlanActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {isPlanActive ? 'Active' : planStatus}
              </span>
            </div>
            <p className="text-xs text-dark-400 mt-1">
              {planCode
                ? `Your organization is enrolled in the ${planName} plan.`
                : 'Free tier with full workspace features and unlimited metric calculations.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings/upgrade')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs font-semibold text-foreground hover:bg-dark-700 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Usage & Limits */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <ChartBarSquareIcon className="w-5 h-5 text-dark-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Usage & Quotas</h2>
            <p className="text-xs text-dark-300 mt-0.5">Workspace consumption metrics and API capacity.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-950/40 border border-dark-800 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-dark-400 mb-1">
              <SparklesIcon className="w-4 h-4 text-primary-400" />
              <span>AI Queries Today</span>
            </div>
            <p className="text-xl font-bold text-foreground mt-1">0</p>
            <p className="text-[11px] text-dark-400 mt-1">Quota: 10 / day</p>
          </div>
          <div className="p-4 bg-dark-950/40 border border-dark-800 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-dark-400 mb-1">
              <CircleStackIcon className="w-4 h-4 text-emerald-400" />
              <span>Storage Used</span>
            </div>
            <p className="text-xl font-bold text-foreground mt-1">&lt; 1 MB</p>
            <p className="text-[11px] text-dark-400 mt-1">Quota: 5 GB</p>
          </div>
          <div className="p-4 bg-dark-950/40 border border-dark-800 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-dark-400 mb-1">
              <BoltIcon className="w-4 h-4 text-amber-400" />
              <span>Calculations</span>
            </div>
            <p className="text-xl font-bold text-foreground mt-1">Unlimited</p>
            <p className="text-[11px] text-dark-400 mt-1">Real-time reactive engine</p>
          </div>
        </div>
      </div>
    </div>
  )
}
