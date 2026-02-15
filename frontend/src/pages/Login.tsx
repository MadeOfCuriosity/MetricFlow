import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login, googleLogin } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Invalid email or password')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return
    setError('')
    setIsLoading(true)

    try {
      const result = await googleLogin(credentialResponse.credential)
      if (result.needs_setup) {
        navigate('/google-setup', {
          state: {
            setup_token: result.setup_token,
            google_name: result.google_name,
            google_email: result.google_email,
          },
        })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-in failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'} alt="Visualize" className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-dark-300">
          Sign in to your Visualize account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-dark-900 py-8 px-4 shadow-xl border border-dark-700 rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-4 flex items-center gap-3">
                <ExclamationCircleIcon className="h-5 w-5 text-danger-400 flex-shrink-0" />
                <p className="text-sm text-danger-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-200">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-200">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 pr-11 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-900 text-dark-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed')}
                theme={resolvedTheme === 'light' ? 'outline' : 'filled_black'}
                size="large"
                text="signin_with"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-900 text-dark-400">New to Visualize?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full flex justify-center py-3 px-4 border border-dark-600 rounded-lg shadow-sm text-sm font-medium text-dark-200 bg-transparent hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Create an organization
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
