import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const SUPERADMIN_TOKEN_KEY = 'superadmin_token'

const superadminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

superadminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(SUPERADMIN_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

superadminApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(SUPERADMIN_TOKEN_KEY)
      localStorage.removeItem('superadmin_user')
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/superadmin/login')) {
        window.location.href = '/superadmin/login'
      }
    }
    return Promise.reject(error)
  }
)

export default superadminApi
