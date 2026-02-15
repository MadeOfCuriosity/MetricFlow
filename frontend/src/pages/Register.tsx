import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Marketing',
  'Consulting',
  'Other',
]

export function Register() {
  const [formData, setFormData] = useState({
    org_name: '',
    user_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    industry: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register, googleLogin } = useAuth()
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      await register({
        org_name: formData.org_name,
        user_name: formData.user_name,
        email: formData.email,
        password: formData.password,
        industry: formData.industry || undefined,
      })
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Registration failed. Please try again.')
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
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-up failed')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    'Track unlimited KPIs',
    'AI-powered insights',
    'Team collaboration',
    'Custom formulas',
  ]

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'} alt="Visualize" className="w-10 h-10" />
            <span className="text-xl font-bold text-foreground">Visualize</span>
          </div>

          <h2 className="mt-8 text-3xl font-bold text-foreground">
            Create your organization
          </h2>
          <p className="mt-2 text-sm text-dark-300">
            Start tracking your business KPIs in minutes
          </p>

          <div className="mt-8 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-up failed')}
              theme={resolvedTheme === 'light' ? 'outline' : 'filled_black'}
              size="large"
              text="signup_with"
            />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-dark-950 text-dark-400">Or register with email</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-4 flex items-center gap-3">
                <ExclamationCircleIcon className="h-5 w-5 text-danger-400 flex-shrink-0" />
                <p className="text-sm text-danger-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="org_name" className="block text-sm font-medium text-dark-200">
                Organization name
              </label>
              <input
                id="org_name"
                name="org_name"
                type="text"
                required
                value={formData.org_name}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-dark-200">
                Industry (optional)
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select industry</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-dark-700 pt-5">
              <h3 className="text-sm font-medium text-dark-300 mb-4">Your account</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="user_name" className="block text-sm font-medium text-dark-200">
                    Your name
                  </label>
                  <input
                    id="user_name"
                    name="user_name"
                    type="text"
                    required
                    value={formData.user_name}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-dark-200">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="john@acme.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-dark-200">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-200">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Creating organization...
                </div>
              ) : (
                'Create organization'
              )}
            </button>

            <p className="text-center text-sm text-dark-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-400 hover:text-primary-300">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 to-indigo-800 items-center justify-center p-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-white mb-6">
            Track what matters for your business
          </h2>
          <p className="text-primary-200 mb-8">
            Visualize helps you define, track, and analyze your key performance indicators with powerful insights and team collaboration.
          </p>

          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <CheckCircleIcon className="h-6 w-6 text-primary-300" />
                <span className="text-white font-medium">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 p-6 bg-white/10 backdrop-blur rounded-xl">
            <p className="text-white italic">
              "Visualize transformed how we track our sales metrics. The AI insights are incredibly valuable."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-400 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">S</span>
              </div>
              <div>
                <p className="text-white font-medium">Sarah Johnson</p>
                <p className="text-primary-300 text-sm">VP of Sales, TechCorp</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
