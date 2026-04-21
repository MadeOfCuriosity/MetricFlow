import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { ExclamationCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { superadminService } from '../../services/superadmin'
import { useTheme } from '../../context/ThemeContext'

export function SuperAdminLogin() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()

  if (superadminService.isAuthenticated()) {
    return <Navigate to="/superadmin" replace />
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return
    setError('')
    setIsLoading(true)
    try {
      const res = await superadminService.googleLogin(credentialResponse.credential)
      superadminService.setToken(res.access_token)
      superadminService.setStoredAdmin(res.admin)
      navigate('/superadmin', { replace: true })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Sign-in failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <ShieldCheckIcon className="w-7 h-7 text-primary-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
          Platform Administration
        </h2>
        <p className="mt-2 text-center text-sm text-dark-300">
          Sign in with a Google account that has been granted super-admin access.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-dark-900 py-8 px-4 shadow-xl border border-dark-700 rounded-xl sm:px-10">
          {error && (
            <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-4 flex items-center gap-3 mb-6">
              <ExclamationCircleIcon className="h-5 w-5 text-danger-400 flex-shrink-0" />
              <p className="text-sm text-danger-400">{error}</p>
            </div>
          )}

          <div className="flex justify-center">
            {isLoading ? (
              <div className="py-3 text-sm text-dark-300">Signing in…</div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed')}
                theme={resolvedTheme === 'light' ? 'outline' : 'filled_black'}
                size="large"
                text="signin_with"
              />
            )}
          </div>

          <p className="mt-6 text-center text-xs text-dark-400">
            Access is restricted to emails listed in the platform admins table.
          </p>
        </div>
      </div>
    </div>
  )
}
