import {
  BuildingOfficeIcon,
  CreditCardIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'

const PLAN_NAME: Record<string, string> = {
  team: 'Team',
  team_annual: 'Team (Annual)',
  business: 'Business',
  business_annual: 'Business (Annual)',
}

export function AdminOrganization() {
  const { organization } = useAuth()
  const planCode = organization?.plan_code
  const planName = planCode ? PLAN_NAME[planCode] || planCode : 'Free'
  const planStatus = organization?.plan_status || 'active'
  const isPlanActive = planStatus === 'active'

  return (
    <div className="space-y-6">
      {/* Organization Profile */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <BuildingOfficeIcon className="h-5 w-5 text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Organization Profile</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Organization Name
            </label>
            <div className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground">
              {organization?.name || '—'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Industry</label>
            <div className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground">
              {organization?.industry || 'Not specified'}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Placeholder */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-success-500/20 rounded-lg">
            <CreditCardIcon className="h-5 w-5 text-success-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Billing & Plan</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-dark-800 border border-dark-600 rounded-lg">
          <div>
            <p className="text-foreground font-medium">{planName} Plan</p>
            <p className="text-sm text-dark-400 mt-0.5">
              {planCode
                ? `You are currently on the ${planName} plan.`
                : 'You are currently on the free plan with full access.'}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              isPlanActive
                ? 'bg-success-500/20 text-success-400'
                : 'bg-warning-500/20 text-warning-400'
            }`}
          >
            {isPlanActive ? 'Active' : planStatus}
          </span>
        </div>
      </div>

      {/* Usage Placeholder */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning-500/20 rounded-lg">
            <ChartBarSquareIcon className="h-5 w-5 text-warning-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Usage</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-800 border border-dark-600 rounded-lg">
            <p className="text-sm text-dark-400">AI Requests Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
            <p className="text-xs text-dark-500 mt-1">Limit: 10/day</p>
          </div>
          <div className="p-4 bg-dark-800 border border-dark-600 rounded-lg">
            <p className="text-sm text-dark-400">Storage Used</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
            <p className="text-xs text-dark-500 mt-1">Coming soon</p>
          </div>
          <div className="p-4 bg-dark-800 border border-dark-600 rounded-lg">
            <p className="text-sm text-dark-400">API Calls (30d)</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
            <p className="text-xs text-dark-500 mt-1">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
