import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCardIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { subscriptionsService, Subscription as SubscriptionRecord } from '../../services/subscriptions'
import { getApiError } from '../../lib/apiError'

const PLAN_DISPLAY: Record<string, { name: string; desc: string; color: string; badge: string }> = {
  free: {
    name: 'Free Tier',
    desc: 'Basic workspace features with core metric calculation engine.',
    color: 'border-dark-700 bg-dark-950/40',
    badge: 'bg-dark-800 text-dark-300 border-dark-700',
  },
  team: {
    name: 'Team Tier',
    desc: 'For growing teams with 30 KPIs, 8 users, and 25 AI queries/day.',
    color: 'border-brand/30 bg-brand/5',
    badge: 'bg-brand/10 text-brand border-brand/20',
  },
  team_annual: {
    name: 'Team Tier (Annual)',
    desc: 'For growing teams with 30 KPIs, 8 users, and 25 AI queries/day.',
    color: 'border-brand/30 bg-brand/5',
    badge: 'bg-brand/10 text-brand border-brand/20',
  },
  business: {
    name: 'Business Tier',
    desc: 'Unlimited KPIs, 25 users, all integrations, and 50 AI queries/day.',
    color: 'border-brand/30 bg-brand/5',
    badge: 'bg-brand/10 text-brand border-brand/20',
  },
  business_annual: {
    name: 'Business Tier (Annual)',
    desc: 'Unlimited KPIs, 25 users, all integrations, and 50 AI queries/day.',
    color: 'border-brand/30 bg-brand/5',
    badge: 'bg-brand/10 text-brand border-brand/20',
  },
  enterprise: {
    name: 'Enterprise Tier',
    desc: 'Dedicated infrastructure, custom integrations, SAML SSO, and 24/7 SLA.',
    color: 'border-brand/30 bg-brand/5',
    badge: 'bg-brand/10 text-brand border-brand/20',
  },
}

export function SettingsPlan() {
  const { organization } = useAuth()
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()

  const [currentSub, setCurrentSub] = useState<SubscriptionRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      setIsLoading(true)
      const data = await subscriptionsService.getCurrent()
      setCurrentSub(data)
    } catch {
      // Free or no active sub
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!currentSub) return
    if (!confirm('Are you sure you want to cancel your subscription at the end of the current billing cycle?')) {
      return
    }

    setIsCancelling(true)
    try {
      const updated = await subscriptionsService.cancel(currentSub.razorpay_subscription_id, true)
      setCurrentSub(updated)
      success('Subscription updated', 'Your subscription will cancel at the end of the current period.')
    } catch (err: unknown) {
      toastError(getApiError(err, 'Failed to cancel subscription'))
    } finally {
      setIsCancelling(false)
    }
  }

  const rawPlanCode = currentSub?.plan_code || organization?.plan_code || 'free'
  const planInfo = PLAN_DISPLAY[rawPlanCode] || {
    name: `${rawPlanCode.toUpperCase()} Tier`,
    desc: 'Custom organization workspace plan.',
    color: 'border-dark-700 bg-dark-950/40',
    badge: 'bg-dark-800 text-dark-300 border-dark-700',
  }

  const planStatus = currentSub?.status || organization?.plan_status || 'active'
  const isPaidActive = currentSub && ['active', 'authenticated'].includes(currentSub.status)

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
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <CreditCardIcon className="w-5 h-5 text-brand stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Subscription &amp; Plan</h2>
              <p className="text-xs text-dark-300 mt-0.5">
                Manage your active billing tier, renewals, and workspace entitlements.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToUpgrade}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-xs sm:text-sm shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <ArrowTrendingUpIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Upgrade Plan</span>
          </button>
        </div>

        {/* Current Plan Overview Banner */}
        <div className={`p-5 rounded-2xl border ${planInfo.color}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-foreground tracking-tight">{planInfo.name}</h3>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                    planStatus === 'active'
                      ? 'bg-success-500/10 text-success-400 border-success-500/20'
                      : 'bg-brand/10 text-brand border-brand/20'
                  }`}
                >
                  {planStatus}
                </span>
              </div>
              <p className="text-xs text-dark-300 mt-1 max-w-xl">{planInfo.desc}</p>
            </div>

            <div className="flex items-center gap-3">
              {isPaidActive ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border border-dark-700 bg-dark-800/80 hover:bg-danger-500/10 hover:border-danger-500/30 hover:text-danger-400 text-dark-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={scrollToUpgrade}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors cursor-pointer shadow-sm"
                >
                  Change Plan
                </button>
              )}
            </div>
          </div>

          {currentSub?.current_end && (
            <div className="mt-4 pt-3 border-t border-dark-800/60 flex flex-wrap items-center gap-6 text-xs text-dark-300">
              <div className="flex items-center gap-1.5">
                <CalendarDaysIcon className="w-4 h-4 text-dark-400" />
                <span>Renewal Date:</span>
                <span className="font-semibold text-foreground">
                  {new Date(currentSub.current_end).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div>
                <span>Cycles Paid:</span>{' '}
                <span className="font-semibold text-foreground">
                  {currentSub.paid_count}
                  {currentSub.total_count ? ` / ${currentSub.total_count}` : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment & Security */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <ShieldCheckIcon className="w-4 h-4 text-dark-400" />
          <span>Billing &amp; Payment Security</span>
        </div>
        <p className="text-xs text-dark-300 leading-relaxed">
          Payments are securely handled via Razorpay with 256-bit SSL encryption. We never store raw credit card numbers or banking secrets on our servers. Invoices and receipts are emailed directly to your organization administrator after every successful billing cycle.
        </p>
      </div>
    </div>
  )
}
