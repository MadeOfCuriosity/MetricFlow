import { useEffect, useState } from 'react'
import { salesService } from '../services/sales'

interface Props {
  open: boolean
  onClose: () => void
  source?: string
  defaultEmail?: string
  defaultName?: string
  defaultCompany?: string
}

export function ContactSalesModal({
  open,
  onClose,
  source = 'enterprise_contact',
  defaultEmail = '',
  defaultName = '',
  defaultCompany = '',
}: Props) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [company, setCompany] = useState(defaultCompany)
  const [teamSize, setTeamSize] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      setSubmitted(false)
      setError('')
      setName(defaultName)
      setEmail(defaultEmail)
      setCompany(defaultCompany)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await salesService.submitContact({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        team_size: teamSize || undefined,
        message: message.trim() || undefined,
        source,
      })
      setSubmitted(true)
      setTeamSize('')
      setMessage('')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <div>
            <h3 className="text-lg font-bold text-foreground">Talk to Sales</h3>
            <p className="text-xs text-dark-400 mt-0.5">
              Tell us about your team — we'll get back within one business day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-dark-400 hover:text-foreground text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-success-500/15 text-success-400 flex items-center justify-center text-2xl">
              ✓
            </div>
            <h4 className="text-base font-semibold text-foreground mb-1">
              Thanks — we received your request.
            </h4>
            <p className="text-sm text-dark-400 mb-6">
              Someone from the team will reach out to you shortly at the email you
              provided.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-300 mb-1">
                  Name <span className="text-danger-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={255}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-300 mb-1">
                  Work email <span className="text-danger-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-300 mb-1">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={255}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-300 mb-1">Team size</label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
                >
                  <option value="">Select…</option>
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="201-500">201–500</option>
                  <option value="500+">500+</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-dark-300 mb-1">
                What are you trying to solve?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="e.g. We need SSO, 50 seats, and Salesforce integration…"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>
            {error && <div className="text-xs text-danger-400">{error}</div>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-dark-200 hover:text-foreground hover:bg-dark-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
