import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'

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

interface GoogleSetupState {
  setup_token: string
  google_name: string
  google_email: string
}

export function GoogleOrgSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { googleCompleteSetup } = useAuth()
  const { resolvedTheme } = useTheme()

  const state = location.state as GoogleSetupState | null

  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!state?.setup_token) {
      navigate('/login', { replace: true })
    }
  }, [state, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state?.setup_token) return

    setError('')
    setIsLoading(true)

    try {
      await googleCompleteSetup({
        google_token: state.setup_token,
        org_name: orgName,
        industry: industry || undefined,
      })
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Setup failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!state?.setup_token) return null

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src={resolvedTheme === 'light' ? '/visualise_dark.png' : '/visualise.png'}
            alt="Visualize"
            className="w-12 h-12"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
          Set up your organization
        </h2>
        <p className="mt-2 text-center text-sm text-dark-300">
          Welcome, {state.google_name}! Complete your setup to get started.
        </p>
        <p className="mt-1 text-center text-xs text-dark-400">
          Signed in as {state.google_email}
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
              <label htmlFor="org_name" className="block text-sm font-medium text-dark-200">
                Organization name
              </label>
              <input
                id="org_name"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
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
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
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
          </form>
        </div>
      </div>
    </div>
  )
}
