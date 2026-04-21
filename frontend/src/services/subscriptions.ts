import api from './api'

export interface Plan {
  code: string
  razorpay_plan_id: string
}

export interface Subscription {
  id: string
  plan_code: string
  razorpay_subscription_id: string
  status: string
  total_count: number | null
  paid_count: number
  current_start: string | null
  current_end: string | null
  ended_at: string | null
  created_at: string
}

export interface CreateSubscriptionResponse {
  subscription_id: string
  razorpay_key_id: string
  plan_code: string
  short_url: string | null
}

export interface VerifyPayload {
  razorpay_subscription_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export const subscriptionsService = {
  listPlans: async (): Promise<Plan[]> => {
    const res = await api.get('/api/subscriptions/plans')
    return res.data.plans
  },

  getCurrent: async (): Promise<Subscription | null> => {
    const res = await api.get('/api/subscriptions/current')
    return res.data
  },

  create: async (
    plan_code: string,
    total_count = 12
  ): Promise<CreateSubscriptionResponse> => {
    const res = await api.post('/api/subscriptions/create', {
      plan_code,
      total_count,
    })
    return res.data
  },

  verify: async (payload: VerifyPayload): Promise<Subscription> => {
    const res = await api.post('/api/subscriptions/verify', payload)
    return res.data
  },

  cancel: async (
    subscription_id: string,
    cancel_at_cycle_end = true
  ): Promise<Subscription> => {
    const res = await api.post(
      `/api/subscriptions/${subscription_id}/cancel?cancel_at_cycle_end=${cancel_at_cycle_end}`
    )
    return res.data
  },
}
