import { useEffect, useMemo, useState } from 'react'
import {
  ArrowTrendingUpIcon,
  CheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  Plan,
  Subscription as SubscriptionRecord,
  subscriptionsService,
} from '../../services/subscriptions'
import { ContactSalesModal } from '../../components/ContactSalesModal'

declare global {
  interface Window {
    Razorpay: any
  }
}

type PricingPlan = {
  name: string
  desc: string
  price: { monthly: number; annual: number }
  monthlyCode: string
  annualCode: string
  cta: string
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

export function SettingsUpgrade() {
  const { user, organization } = useAuth()
  const { success, error: toastError } = useToast()

  const [plans, setPlans] = useState<Plan[]>([])
  const [current, setCurrent] = useState<SubscriptionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [annual, setAnnual] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [planList, currentSub] = await Promise.all([
        subscriptionsService.listPlans().catch(() => []),
        subscriptionsService.getCurrent().catch(() => null),
      ])
      setPlans(planList)
      setCurrent(currentSub)
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

  const isActive = !!(current && ['active', 'authenticated'].includes(current.status))

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Upgrade Plan</h2>
            <p className="text-xs text-dark-300 mt-0.5">
              Choose the right tier to scale your organization&rsquo;s KPI analytics and team capacity.
            </p>
          </div>
        </div>

        {/* Monthly / Annual Toggle */}
        <div className="inline-flex items-center gap-1.5 p-1 bg-dark-850 dark:bg-dark-950 border border-dark-700 rounded-full self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              !annual
                ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                : 'text-dark-400 hover:text-foreground border border-transparent'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              annual
                ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                : 'text-dark-400 hover:text-foreground border border-transparent'
            }`}
          >
            <span>Annual</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full">
              -20%
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-dark-400">Loading plan options...</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5 items-stretch pt-2">
          {PRICING.map((plan) => {
            const planCode = annual ? plan.annualCode : plan.monthlyCode
            const isCurrent = !!(current?.plan_code === planCode && isActive)
            const planAvailable = plan.contactSales || availableCodes.has(planCode)
            const busy = busyPlan === planCode

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border flex flex-col p-6 transition-all ${
                  plan.popular
                    ? 'bg-dark-950/60 border-primary-500/50 shadow-md ring-1 ring-primary-500/20'
                    : 'bg-dark-950/30 border-dark-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-dark-400 mt-1 min-h-[32px] leading-relaxed">
                    {plan.desc}
                  </p>
                </div>

                <div className="mb-6">
                  {plan.price.monthly === -1 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        ₹{(annual ? plan.price.annual : plan.price.monthly).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-dark-400">/ month</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isCurrent || busy || (!planAvailable && !plan.contactSales)}
                  onClick={() => {
                    if (plan.contactSales) {
                      setContactOpen(true)
                    } else {
                      handleSubscribe(planCode)
                    }
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-6 ${
                    isCurrent
                      ? 'bg-dark-800 border border-dark-700 text-emerald-400 font-bold'
                      : plan.popular
                      ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
                      : 'bg-dark-800 hover:bg-dark-750 border border-dark-700 text-foreground'
                  }`}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : busy
                    ? 'Opening Checkout...'
                    : !planAvailable && !plan.contactSales
                    ? 'Coming Soon'
                    : plan.cta}
                </button>

                <div className="space-y-2.5 mt-auto pt-4 border-t border-dark-800">
                  <span className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider block">
                    What&rsquo;s included:
                  </span>
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-xs text-dark-300">
                      <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Enterprise Contact Modal */}
      <ContactSalesModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  )
}
