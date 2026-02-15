import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AxiosError } from 'axios'
import { authService, User, Organization, LoginCredentials, RegisterOrgData, GoogleOrgSetupData } from '../services/auth'

interface GoogleLoginResult {
  needs_setup: boolean
  setup_token?: string
  google_name?: string
  google_email?: string
}

interface AuthContextType {
  user: User | null
  organization: Organization | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isRoomAdmin: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterOrgData) => Promise<void>
  googleLogin: (credential: string) => Promise<GoogleLoginResult>
  googleCompleteSetup: (data: GoogleOrgSetupData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(authService.getStoredUser())
  const [organization, setOrganization] = useState<Organization | null>(authService.getStoredOrg())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser()
          setUser(userData)
          setOrganization(userData.organization)
          authService.setStoredUser(userData)
          authService.setStoredOrg(userData.organization)
        } catch (error) {
          const status = (error as AxiosError)?.response?.status
          if (status === 401 || status === 403) {
            // Token is invalid/expired — clear session
            authService.logout()
            setUser(null)
            setOrganization(null)
          }
          // For network errors or server issues, keep using the stored user data
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    authService.setToken(response.access_token)
    if (response.refresh_token) {
      localStorage.setItem('refreshToken', response.refresh_token)
    }
    authService.setStoredUser(response.user)
    authService.setStoredOrg(response.organization)
    setUser(response.user)
    setOrganization(response.organization)
  }

  const register = async (data: RegisterOrgData) => {
    const response = await authService.registerOrg(data)
    authService.setToken(response.access_token)
    if (response.refresh_token) {
      localStorage.setItem('refreshToken', response.refresh_token)
    }
    authService.setStoredUser(response.user)
    authService.setStoredOrg(response.organization)
    setUser(response.user)
    setOrganization(response.organization)
  }

  const googleLogin = async (credential: string): Promise<GoogleLoginResult> => {
    const response = await authService.googleAuth(credential)

    if (!response.needs_setup && response.access_token && response.user && response.organization) {
      authService.setToken(response.access_token)
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token)
      }
      authService.setStoredUser(response.user)
      authService.setStoredOrg(response.organization)
      setUser(response.user)
      setOrganization(response.organization)
      return { needs_setup: false }
    }

    return {
      needs_setup: true,
      setup_token: response.setup_token,
      google_name: response.google_name,
      google_email: response.google_email,
    }
  }

  const googleCompleteSetup = async (data: GoogleOrgSetupData) => {
    const response = await authService.googleCompleteSetup(data)
    authService.setToken(response.access_token)
    if (response.refresh_token) {
      localStorage.setItem('refreshToken', response.refresh_token)
    }
    authService.setStoredUser(response.user)
    authService.setStoredOrg(response.organization)
    setUser(response.user)
    setOrganization(response.organization)
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    setOrganization(null)
  }

  const isAdmin = user?.role === 'admin'
  const isRoomAdmin = user?.role === 'room_admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isRoomAdmin,
        login,
        register,
        googleLogin,
        googleCompleteSetup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
