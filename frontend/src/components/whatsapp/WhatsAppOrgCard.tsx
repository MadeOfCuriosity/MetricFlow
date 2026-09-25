import { useEffect, useMemo, useState } from 'react'
import { whatsappApi, type WhatsAppStatus } from '../../services/whatsapp'
import { useToast } from '../../context/ToastContext'
import { getApiError } from '../../lib/apiError'
import { Spinner } from '../ui/Spinner'
import { WhatsAppIcon } from './WhatsAppIcon'

const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

function allTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  return intl.supportedValuesOf?.('timeZone') ?? [browserTimeZone, 'UTC']
}

/** Admin card: turn WhatsApp on for the organization and set its time zone. */
export function WhatsAppOrgCard() {
  const { success, error: showError } = useToast()
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const zones = useMemo(allTimeZones, [])

  useEffect(() => {
    whatsappApi.getStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  const update = async (data: { enabled?: boolean; timezone?: string }) => {
    setSaving(true)
    try {
      const next = await whatsappApi.updateOrg(data)
      setStatus(next)
      if (data.enabled !== undefined) success(data.enabled ? 'WhatsApp enabled' : 'WhatsApp disabled')
    } catch (err) {
      showError('Could not update WhatsApp', getApiError(err, 'Please try again'))
    } finally {
      setSaving(false)
    }
  }

  if (!status) return null
  const timezone = status.timezone || browserTimeZone

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] flex items-center justify-center flex-shrink-0">
            <WhatsAppIcon />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">WhatsApp</h3>
            <p className="text-xs text-dark-300 mt-0.5 max-w-lg">
              Optional. Lets your team connect their WhatsApp to receive insights and, soon, enter data by chat.
              Manual entry keeps working exactly as it does today.
            </p>
          </div>
        </div>
        {status.configured ? (
          <button
            type="button"
            role="switch"
            aria-checked={status.org_enabled}
            aria-label="Enable WhatsApp"
            disabled={saving}
            onClick={() => update({ enabled: !status.org_enabled, timezone: status.timezone ? undefined : timezone })}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50 ${
              status.org_enabled ? 'bg-[#25D366]' : 'bg-dark-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                status.org_enabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        ) : (
          <span className="text-[11px] text-dark-400 px-2 py-1 rounded-md border border-dark-700 flex-shrink-0">Not set up on server</span>
        )}
      </div>

      {status.configured && status.org_enabled && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-dark-800 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-dark-400">Time zone</span>
            <select
              value={timezone}
              disabled={saving}
              onChange={(e) => update({ timezone: e.target.value })}
              className="px-2.5 py-1.5 bg-dark-950/60 border border-dark-700 rounded-lg text-foreground focus:outline-none focus:border-dark-500 cursor-pointer"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            {saving && <Spinner size="xs" />}
          </label>
          {status.business_number && (
            <span className="text-dark-400">
              Messages come from <span className="text-foreground font-medium">+{status.business_number}</span>
            </span>
          )}
          <span className="text-dark-400">
            Each person links their own number in <span className="text-foreground">Settings → Account</span>.
          </span>
        </div>
      )}
    </div>
  )
}
