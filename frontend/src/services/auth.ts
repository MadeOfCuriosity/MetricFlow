import api from './api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterOrgData {
  org_name: string
  user_name: string
  email: string
  password: string
  industry?: string
}

export interface Organization {
  id: string
  name: string
  industry: string | null
  created_at: string
}

export type UserRole = 'admin' | 'room_admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  role_label: string
  auth_provider?: string  // 'email' | 'google' | 'both'
  created_at: string
}

export interface UserWithOrg extends User {
  organization: Organization
}

export interface AuthResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  user: User
  organization: Organization
}

export interface GoogleAuthResponse {
  needs_setup: boolean
  setup_token?: string
  google_name?: string
  google_email?: string
  access_token?: string
  refresh_token?: string
  token_type: string
  user?: User
  organization?: Organization
}

export interface GoogleOrgSetupData {
  google_token: string
  org_name: string
  industry?: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', credentials)
    return response.data
  },

  async registerOrg(data: RegisterOrgData): Promise<AuthResponse> {
    // Map frontend field names to backend field names
    const payload = {
      org_name: data.org_name,
      admin_name: data.user_name,
      admin_email: data.email,
      admin_password: data.password,
      industry: data.industry,
    }
    const response = await api.post<AuthResponse>('/api/auth/register-org', payload)
    return response.data
  },

  async getCurrentUser(): Promise<UserWithOrg> {
    const response = await api.get<UserWithOrg>('/api/auth/me')
    return response.data
  },

  logout(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('organization')
  },

  getToken(): string | null {
    return localStorage.getItem('token')
  },

  setToken(token: string): void {
    localStorage.setItem('token', token)
  },

  getStoredUser(): User | null {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  setStoredUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
  },

  getStoredOrg(): Organization | null {
    const org = localStorage.getItem('organization')
    return org ? JSON.parse(org) : null
  },

  setStoredOrg(org: Organization): void {
    localStorage.setItem('organization', JSON.stringify(org))
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  async googleAuth(credential: string): Promise<GoogleAuthResponse> {
    const response = await api.post<GoogleAuthResponse>('/api/auth/google', { credential })
    return response.data
  },

  async googleCompleteSetup(data: GoogleOrgSetupData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/google/complete-setup', data)
    return response.data
  },
}
