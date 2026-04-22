import { useEffect, useMemo, useState } from 'react'
import { CheckBadgeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  Plan,
  Subscription as SubscriptionRecord,
  subscriptionsService,
} from '../services/subscriptions'
import { ContactSalesModal } from '../components/ContactSalesModal'

declare global {
  interface Window {
    Razorpay: any
  }
}

const CheckIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
)

type PricingPlan = {
  name: string
  desc: string
  price: { monthly: number; annual: number }
  monthlyCode: string
  annualCode: string
  cta: string
  ctaStyle: string
  popular?: boolean
  contactSales?: boolean
  features: string[]
}

const PLAN_NAME: Record<string, string> = {
  team: 'Team',
  team_annual: 'Team (Annual)',
  business: 'Business',
  business_annual: 'Business (Annual)',
}

const PRICING: PricingPlan[] = [
  {
    name: 'Team',
    desc: 'For growing teams that need real-time KPI tracking and collaboration.',
    price: { monthly: 3999, annual: 3199 },
    monthlyCode: 'team',
    annualCode: 'team_annual',
    cta: 'Subscribe',
    ctaStyle: 'glass hover:bg-dark-700/60 text-foreground',
    features: [
      '30 KPIs',
      '8 Users',
      '25 AI calls / day',
      'Unlimited data retention',
      '2 Integrations',
      '3 Team Rooms',
      'AI Insights',
      'Email support',
    ],
  },
  {
    name: 'Business',
    desc: 'For scaling companies that demand complete visibility across every department.',
    price: { monthly: 7999, annual: 6399 },
    monthlyCode: 'business',
    annualCode: 'business_annual',
    cta: 'Subscribe',
    ctaStyle:
      'bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] text-white hover:opacity-90 shadow-lg',
    popular: true,
    features: [
      'Unlimited KPIs',
      '25 Users',
      '50 AI calls / day',
      'All Integrations',
      'Unlimited Rooms',
      'Admin Dashboard',
      'Priority AI Insights',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    desc: 'Custom solutions for large organizations with advanced security and compliance needs.',
    price: { monthly: -1, annual: -1 },
    monthlyCode: '',
    annualCode: '',
    cta: 'Contact Sales',
    ctaStyle: 'glass hover:bg-dark-700/60 text-foreground',
    contactSales: true,
    features: [
      'Everything in Business',
      'Unlimited Users',
      'Unlimited AI calls',
      'SSO / SAML',
      'Custom integrations',
      'Dedicated onboarding',
      'SLA guarantee',
      'Dedicated support',
    ],
  },
]

export function Subscription() {
  const { user, organization } = useAuth()
  const { success, error: toastError } = useToast()

  const [plans, setPlans] = useState<Plan[]>([])
  const [current, setCurrent] = useState<SubscriptionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [annual, setAnnual] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)

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

  const availableCodes = useMemo(() => new Set(plans.map((p) => p.code)), [plans])

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
        name: organization?.name || 'Visualize',
        description: `${PLAN_NAME[planCode] || planCode} subscription`,
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
        <p className="text-dark-300 mt-1">Manage your Visualize plan and billing.</p>
      </div>

      {loading ? (
        <div className="text-dark-300">Loading...</div>
      ) : (
        <>
          {current && (
            <div className="glass rounded-2xl p-6 mb-10">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckBadgeIcon className="h-6 w-6 text-primary-500" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Current plan: {PLAN_NAME[current.plan_code] || current.plan_code}
                    </h2>
                  </div>
                  <p className="text-sm text-dark-300 mt-2">
                    Status:{' '}
                    <span className="text-foreground font-medium">{current.status}</span>
                  </p>
                  {current.current_end && (
                    <p className="text-sm text-dark-300">
                      Next billing date:{' '}
                      <span className="text-foreground">
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

          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 glass rounded-full p-1.5">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  !annual
                    ? 'bg-foreground text-dark-950 shadow'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                  annual
                    ? 'bg-foreground text-dark-950 shadow'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                Annual
                <span className="px-1.5 py-0.5 bg-dark-700 text-dark-200 text-xs font-bold rounded-md">
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {PRICING.map((plan) => {
              const planCode = annual ? plan.annualCode : plan.monthlyCode
              const isCurrent = !!(current?.plan_code === planCode && isActive)
              const planAvailable = plan.contactSales || availableCodes.has(planCode)
              const busy = busyPlan === planCode

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-[1.25rem] ${plan.popular ? 'pricing-popular' : ''}`}
                >
                  <div
                    className={`glass rounded-2xl p-7 h-full flex flex-col ${
                      plan.popular ? 'bg-dark-800/90' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-foreground text-dark-950 text-xs font-bold rounded-full shadow-lg">
                        MOST POPULAR
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          plan.popular ? 'text-dark-200' : 'text-dark-400'
                        }`}
                      >
                        {plan.desc}
                      </p>
                    </div>

                    <div className="mb-6">
                      {plan.price.monthly === -1 ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-foreground">Custom</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-foreground">
                              ₹
                              {(annual ? plan.price.annual : plan.price.monthly).toLocaleString(
                                'en-IN'
                              )}
                            </span>
                            <span
                              className={`text-sm ${
                                plan.popular ? 'text-dark-200' : 'text-dark-400'
                              }`}
                            >
                              /month
                            </span>
                          </div>
                          {annual && (
                            <div className="text-xs text-foreground mt-1">
                              Save ₹
                              {((plan.price.monthly - plan.price.annual) * 12).toLocaleString(
                                'en-IN'
                              )}
                              /year
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {plan.contactSales ? (
                      <button
                        type="button"
                        onClick={() => setContactOpen(true)}
                        className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all hover:scale-[1.02] active:scale-[0.98] block mb-6 ${plan.ctaStyle}`}
                      >
                        {plan.cta}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(planCode)}
                        disabled={busyPlan !== null || isCurrent || !planAvailable}
                        className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all hover:scale-[1.02] active:scale-[0.98] block mb-6 disabled:opacity-50 disabled:hover:scale-100 ${plan.ctaStyle}`}
                      >
                        {isCurrent
                          ? 'Current plan'
                          : busy
                          ? 'Starting checkout...'
                          : !planAvailable
                          ? 'Unavailable'
                          : plan.cta}
                      </button>
                    )}

                    <div className="space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-center gap-2.5">
                          <span className="text-foreground">{CheckIcon}</span>
                          <span className="text-sm text-dark-200">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-center text-sm text-dark-400 mt-8">
            Prices shown exclude GST. Cancel anytime.
          </p>
        </>
      )}
      <ContactSalesModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        source="enterprise_contact_inapp"
        defaultEmail={user?.email || ''}
        defaultName={user?.name || ''}
        defaultCompany={organization?.name || ''}
      />
    </div>
  )
}

export default Subscription
