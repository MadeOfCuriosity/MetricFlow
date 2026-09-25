import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircleIcon, ArrowTopRightOnSquareIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { whatsappApi, formatPhone, type WhatsAppStatus, type PendingLink } from '../../services/whatsapp'
import { useToast } from '../../context/ToastContext'
import { getApiError } from '../../lib/apiError'
import { Spinner } from '../ui/Spinner'
import { WhatsAppIcon } from './WhatsAppIcon'

/** Personal card: link your WhatsApp number by sending a one-time code to the Visualize number. */
export function WhatsAppLinkCard() {
  const { success, error: showError } = useToast()
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState<PendingLink | null>(null)
  const [busy, setBusy] = useState(false)
  const poll = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const s = await whatsappApi.getStatus()
      setStatus(s)
      return s
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // While a code is waiting, check every few seconds whether the user has sent it
  useEffect(() => {
    if (!pending) return
    poll.current = window.setInterval(async () => {
      const s = await refresh()
      if (s?.me.verified) {
        setPending(null)
        success('WhatsApp connected', formatPhone(s.me.phone_e164))
      } else if (new Date(pending.expires_at + 'Z') < new Date()) {
        setPending(null)
      }
    }, 3000)
    return () => {
      if (poll.current) window.clearInterval(poll.current)
    }
  }, [pending, refresh, success])

  const start = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      setPending(await whatsappApi.startLink(phone))
    } catch (err) {
      showError('Could not start linking', getApiError(err, 'Please try again'))
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await whatsappApi.unlink()
      await refresh()
      setPhone('')
    } catch (err) {
      showError('Could not disconnect', getApiError(err, 'Please try again'))
    } finally {
      setBusy(false)
    }
  }

  if (!status) return null
  const available = status.configured && status.org_enabled
  const me = status.me

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] flex items-center justify-center flex-shrink-0">
          <WhatsAppIcon />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">WhatsApp</h2>
          <p className="text-xs text-dark-300 mt-0.5">
            Connect your number to get insights and, soon, enter your room&apos;s data by chat. Optional.
          </p>
        </div>
      </div>

      {!available ? (
        <p className="text-xs text-dark-400 p-4 bg-dark-950/40 border border-dark-800 rounded-xl">
          WhatsApp isn&apos;t turned on for your organization yet. An admin can enable it in Settings → Integrations.
        </p>
      ) : me.verified ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-dark-950/40 border border-dark-800 rounded-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircleIcon className="w-5 h-5 text-success-400" />
            <div>
              <p className="text-sm font-semibold text-foreground">{formatPhone(me.phone_e164)}</p>
              <p className="text-[11px] text-dark-400">
                {me.opted_in ? 'Connected' : 'Paused — send START on WhatsApp to resume'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      ) : pending?.code ? (
        <div className="p-4 bg-dark-950/40 border border-dark-800 rounded-xl space-y-3">
          <p className="text-xs text-dark-300">
            From <span className="text-foreground font-medium">{formatPhone(pending.phone_e164)}</span>, send this message to
            Visualize on WhatsApp:
          </p>
          <div className="flex items-center gap-2">
            <code className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-base font-mono tracking-widest text-foreground">
              VERIFY {pending.code}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(`VERIFY ${pending.code}`)}
              className="p-2 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-800 cursor-pointer"
              title="Copy"
              aria-label="Copy message"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {pending.wa_link && (
              <a
                href={pending.wa_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <WhatsAppIcon className="w-4 h-4" />
                Open WhatsApp
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
            )}
            <span className="inline-flex items-center gap-2 text-[11px] text-dark-400">
              <Spinner size="xs" /> Waiting for your message… (code expires in 15 min)
            </span>
          </div>
          <button type="button" onClick={() => setPending(null)} className="text-[11px] text-dark-400 hover:text-foreground cursor-pointer">
            Use a different number
          </button>
        </div>
      ) : (
        <form onSubmit={start} className="flex flex-wrap items-center gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            aria-label="WhatsApp number"
            className="w-60 px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-500 focus:outline-none focus:border-dark-500"
          />
          <button
            type="submit"
            disabled={busy || phone.trim().length < 6}
            className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
          >
            {busy ? 'Starting…' : 'Connect'}
          </button>
        </form>
      )}
    </div>
  )
}
