import { useEffect, useState } from 'react'
import { CheckBadgeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  Plan,
  Subscription as SubscriptionRecord,
  subscriptionsService,
} from '../services/subscriptions'

declare global {
  interface Window {
    Razorpay: any
  }
}

const PLAN_DISPLAY: Record<string, { name: string; tagline: string; features: string[] }> = {
  starter: {
    name: 'Starter',
    tagline: 'Best for small teams getting started',
    features: ['Up to 5 users', '10 KPIs', 'Email support'],
  },
  pro: {
    name: 'Pro',
    tagline: 'For growing teams that need more power',
    features: ['Up to 25 users', 'Unlimited KPIs', 'AI insights', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    tagline: 'For large orgs with custom needs',
    features: ['Unlimited users', 'SSO', 'Dedicated support', 'Custom integrations'],
  },
}

export function Subscription() {
  const { user, organization } = useAuth()
  const { success, error: toastError } = useToast()

  const [plans, setPlans] = useState<Plan[]>([])
  const [current, setCurrent] = useState<SubscriptionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [planList, currentSub] = await Promise.all([
        subscriptionsService.listPlans(),
        subscriptionsService.getCurrent(),
      ])
      setPlans(planList)
      setCurrent(currentSub)
    } catch (e: any) {
      toastError(e?.response?.data?.detail || 'Failed to load subscription info')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleSubscribe = async (planCode: string) => {
    if (!window.Razorpay) {
      toastError('Razorpay checkout failed to load. Refresh the page and try again.')
      return
    }

    setBusyPlan(planCode)
    try {
      const created = await subscriptionsService.create(planCode, 12)

      const options = {
        key: created.razorpay_key_id,
        subscription_id: created.subscription_id,
        name: organization?.name || 'MetricFlow',
        description: `${PLAN_DISPLAY[planCode]?.name || planCode} subscription`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#6366f1' },
        handler: async (resp: {
          razorpay_payment_id: string
          razorpay_subscription_id: string
          razorpay_signature: string
        }) => {
          try {
            const verified = await subscriptionsService.verify({
              razorpay_subscription_id: resp.razorpay_subscription_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            })
            setCurrent(verified)
            success('Subscription activated successfully!')
          } catch (e: any) {
            toastError(
              e?.response?.data?.detail || 'Payment verification failed. Contact support.'
            )
          }
        },
        modal: {
          ondismiss: () => setBusyPlan(null),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp: any) => {
        toastError(resp?.error?.description || 'Payment failed')
        setBusyPlan(null)
      })
      rzp.open()
    } catch (e: any) {
      toastError(e?.response?.data?.detail || 'Could not start checkout')
      setBusyPlan(null)
    }
  }

  const handleCancel = async () => {
    if (!current) return
    if (!confirm('Cancel subscription at the end of the current cycle?')) return
    setCancelling(true)
    try {
      const updated = await subscriptionsService.cancel(
        current.razorpay_subscription_id,
        true
      )
      setCurrent(updated)
      success('Subscription will cancel at the end of the current cycle')
    } catch (e: any) {
      toastError(e?.response?.data?.detail || 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  const isActive = !!(current && ['active', 'authenticated'].includes(current.status))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-50">Subscription</h1>
        <p className="text-dark-300 mt-1">
          Manage your MetricFlow plan and billing.
        </p>
      </div>

      {loading ? (
        <div className="text-dark-300">Loading...</div>
      ) : (
        <>
          {current && (
            <div className="bg-dark-800 border border-dark-700 rounded-lg p-6 mb-8">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-6 w-6 text-primary-500" />
                    <h2 className="text-lg font-semibold text-dark-50">
                      Current plan: {PLAN_DISPLAY[current.plan_code]?.name || current.plan_code}
                    </h2>
                  </div>
                  <p className="text-sm text-dark-300 mt-2">
                    Status: <span className="text-dark-50 font-medium">{current.status}</span>
                  </p>
                  {current.current_end && (
                    <p className="text-sm text-dark-300">
                      Next billing date:{' '}
                      <span className="text-dark-50">
                        {new Date(current.current_end).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-dark-300">
                    Cycles paid: {current.paid_count}
                    {current.total_count ? ` / ${current.total_count}` : ''}
                  </p>
                </div>
                {isActive && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-4 py-2 text-sm rounded-lg border border-dark-600 text-dark-100 hover:bg-dark-700 disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel subscription'}
                  </button>
                )}
              </div>
            </div>
          )}

          {plans.length === 0 ? (
            <div className="bg-dark-800 border border-dark-700 rounded-lg p-6 text-dark-300">
              No plans configured yet. Set <code>RAZORPAY_PLAN_IDS</code> in the backend env.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const display = PLAN_DISPLAY[plan.code] || {
                  name: plan.code,
                  tagline: '',
                  features: [],
                }
                const isCurrent = !!(current?.plan_code === plan.code && isActive)
                return (
                  <div
                    key={plan.code}
                    className="bg-dark-800 border border-dark-700 rounded-lg p-6 flex flex-col"
                  >
                    <h3 className="text-xl font-bold text-dark-50">{display.name}</h3>
                    <p className="text-sm text-dark-300 mt-1">{display.tagline}</p>
                    <ul className="mt-4 space-y-2 flex-1">
                      {display.features.map((f) => (
                        <li key={f} className="text-sm text-dark-200 flex items-start gap-2">
                          <span className="text-primary-500">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSubscribe(plan.code)}
                      disabled={busyPlan !== null || isCurrent}
                      className="mt-6 w-full px-4 py-2 rounded-lg bg-primary-500 text-foreground font-medium hover:bg-primary-600 disabled:opacity-50"
                    >
                      {isCurrent
                        ? 'Current plan'
                        : busyPlan === plan.code
                        ? 'Starting checkout...'
                        : 'Subscribe'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Subscription
