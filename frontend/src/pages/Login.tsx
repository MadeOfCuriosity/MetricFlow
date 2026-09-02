import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface Testimonial {
  initials: string
  name: string
  handle: string
  text: string
}

const testimonials: Testimonial[] = [
  {
    initials: 'SC',
    name: 'Sarah Chen',
    handle: '@sarahdigital',
    text: 'Visualize turned a mess of spreadsheets into a dashboard our whole team actually checks every morning.',
  },
  {
    initials: 'MJ',
    name: 'Marcus Johnson',
    handle: '@marcustech',
    text: 'Setup took an afternoon. Now every room owner sees their numbers without asking me for a report.',
  },
  {
    initials: 'DM',
    name: 'David Martinez',
    handle: '@davidcreates',
    text: 'The AI KPI builder alone saved us weeks of custom dashboard work.',
  },
]

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login, googleLogin } = useAuth()
  const { resolvedTheme } = useTheme()
  const { info } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const testimonial = testimonials[0]

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

  const handleResetPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    info('Password reset unavailable', 'Contact your organization admin to reset your password.')
  }

  return (
    <div className="min-h-screen bg-dark-950 lg:grid lg:grid-cols-2">
      {/* Sign-in form */}
      <div className="flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex justify-center lg:justify-start">
            <img src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'} alt="Visualize" className="w-12 h-12" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground text-center lg:text-left">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-dark-300 text-center lg:text-left">
            Sign in to your Visualize account
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                <span className="px-2 bg-dark-950 text-dark-400">Or continue with</span>
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

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-dark-300 hover:text-foreground transition-colors"
            >
              Reset password
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-dark-400">
            New to our platform?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Hero */}
      <div className="hidden lg:flex relative overflow-hidden bg-dark-950">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl glow-primary" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-success-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-center items-center w-full p-12">
          <div className="text-center max-w-md animate-fade-in-up">
            <h3 className="text-2xl font-semibold text-foreground">
              See every metric that matters, in one place
            </h3>
            <p className="mt-3 text-dark-300">
              Track KPIs, spot trends, and keep every room accountable — without the spreadsheet chaos.
            </p>
          </div>
        </div>

        {/* Testimonial */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
          <div className="glass-strong rounded-xl p-5 shadow-xl">
            <p className="text-sm text-dark-100">"{testimonial.text}"</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-sm font-semibold text-primary-300 flex-shrink-0">
                {testimonial.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                <p className="text-xs text-dark-400">{testimonial.handle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
