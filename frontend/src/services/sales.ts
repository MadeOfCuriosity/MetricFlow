import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface SalesLeadCreate {
  name: string
  email: string
  company?: string
  team_size?: string
  message?: string
  source?: string
}

export interface SalesLead {
  id: string
  name: string
  email: string
  company: string | null
  team_size: string | null
  message: string | null
  source: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export const salesService = {
  async submitContact(data: SalesLeadCreate): Promise<SalesLead> {
    const res = await axios.post<SalesLead>(
      `${API_BASE_URL}/api/sales/contact`,
      data
    )
    return res.data
  },
}
