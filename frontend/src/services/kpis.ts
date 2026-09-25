import api from './api'
import type { KPI } from '../types/kpi'

export const kpisApi = {
  /** All org KPIs, enriched with room assignment and latest values. */
  getAll: async (): Promise<KPI[]> => {
    const response = await api.get('/api/kpis')
    const data = response.data
    return (Array.isArray(data) ? data : data?.kpis ?? []) as KPI[]
  },
}

export default kpisApi
