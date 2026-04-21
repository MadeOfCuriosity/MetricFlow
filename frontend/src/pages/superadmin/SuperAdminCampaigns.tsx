import { useEffect, useMemo, useState } from 'react'
import {
  PlusIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import {
  superadminService,
  Campaign,
  CampaignTargetFilter,
  CreateCampaignData,
} from '../../services/superadmin'

function SeverityPill({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    info: 'bg-primary-500/15 text-primary-400',
    warning: 'bg-warning-500/15 text-warning-400',
    success: 'bg-success-500/15 text-success-400',
    announcement: 'bg-primary-500/15 text-primary-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[severity] || map.info}`}>
      {severity}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-dark-700 text-dark-300',
    sent: 'bg-success-500/15 text-success-400',
    cancelled: 'bg-danger-500/15 text-danger-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${map[status] || map.draft}`}>
      {status}
    </span>
  )
}

export function SuperAdminCampaigns() {
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)

  const load = () => {
    setLoading(true)
    superadminService
      .listCampaigns({ limit: 100 })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleSend = async (c: Campaign) => {
    if (!confirm(`Send "${c.title}" to matching users now?`)) return
    try {
      await superadminService.sendCampaign(c.id)
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to send')
    }
  }

  const handleDelete = async (c: Campaign) => {
    if (!confirm(`Delete campaign "${c.title}"?`)) return
    try {
      await superadminService.deleteCampaign(c.id)
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promotional Notifications</h1>
          <p className="text-dark-300 mt-1">
            Compose announcements and target them by industry, plan, or all orgs.
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {showCompose && (
        <ComposeCampaign
          onClose={() => setShowCompose(false)}
          onCreated={() => {
            setShowCompose(false)
            load()
          }}
        />
      )}

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dark-800 text-dark-300 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Channel</th>
              <th className="text-left px-4 py-3">Severity</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Orgs</th>
              <th className="text-right px-4 py-3">Users</th>
              <th className="text-left px-4 py-3">Sent</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-dark-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-dark-400">
                  No campaigns yet
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="hover:bg-dark-800/60">
                  <td className="px-4 py-3">
                    <div className="text-foreground font-medium">{c.title}</div>
                    <div className="text-xs text-dark-400 line-clamp-1">{c.body}</div>
                  </td>
                  <td className="px-4 py-3 text-dark-200 capitalize">{c.channel.replace('_', '-')}</td>
                  <td className="px-4 py-3">
                    <SeverityPill severity={c.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-dark-200">
                    {c.recipient_org_count ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-dark-200">
                    {c.recipient_user_count ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-xs">
                    {c.sent_at ? new Date(c.sent_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {c.status === 'draft' && (
                        <button
                          onClick={() => handleSend(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600"
                        >
                          <PaperAirplaneIcon className="w-3.5 h-3.5" />
                          Send
                        </button>
                      )}
                      {c.status !== 'sent' && (
                        <button
                          onClick={() => handleDelete(c)}
                          className="px-2 py-1 text-danger-400 hover:bg-danger-500/10 rounded"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ComposeCampaign({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [channel, setChannel] = useState<'in_app' | 'email'>('in_app')
  const [severity, setSeverity] = useState<'info' | 'warning' | 'success' | 'announcement'>('info')
  const [targetMode, setTargetMode] = useState<'all' | 'industries' | 'plans' | 'plan_statuses'>('all')
  const [industriesRaw, setIndustriesRaw] = useState('')
  const [planCodesRaw, setPlanCodesRaw] = useState('')
  const [planStatusesRaw, setPlanStatusesRaw] = useState('active')
  const [expiresAt, setExpiresAt] = useState('')
  const [preview, setPreview] = useState<{ org_count: number; user_count: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const buildTarget = (): CampaignTargetFilter => {
    if (targetMode === 'all') return { all: true }
    if (targetMode === 'industries') {
      return {
        industries: industriesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    }
    if (targetMode === 'plans') {
      return {
        plan_codes: planCodesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    }
    return {
      plan_statuses: planStatusesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
  }

  const target = useMemo(buildTarget, [targetMode, industriesRaw, planCodesRaw, planStatusesRaw])

  const handlePreview = async () => {
    setError('')
    try {
      const r = await superadminService.previewCampaignTarget(target)
      setPreview(r)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload: CreateCampaignData = {
        title,
        body,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
        channel,
        severity,
        target,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      await superadminService.createCampaign(payload)
      onCreated()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-dark-900 border border-dark-700 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">New Campaign</h3>
        <button type="button" onClick={onClose} className="text-dark-300 hover:text-foreground">
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-3 text-sm text-danger-400">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm text-dark-200 mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-dark-200 mb-1">Body</label>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm text-dark-200 mb-1">CTA label (optional)</label>
          <input
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm text-dark-200 mb-1">CTA URL (optional)</label>
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm text-dark-200 mb-1">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as 'in_app' | 'email')}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          >
            <option value="in_app">In-app banner</option>
            <option value="email">Email (provider not configured — records only)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-dark-200 mb-1">Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          >
            <option value="info">Info</option>
            <option value="announcement">Announcement</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-dark-200 mb-1">Expires at (optional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        </div>
      </div>

      <div className="border-t border-dark-700 pt-4 space-y-3">
        <label className="block text-sm font-medium text-foreground">Target</label>
        <div className="flex flex-wrap gap-2">
          {(['all', 'industries', 'plans', 'plan_statuses'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTargetMode(m)}
              className={`px-3 py-1 text-sm rounded-full border ${
                targetMode === m
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'border-dark-600 text-dark-200 hover:bg-dark-800'
              }`}
            >
              {m === 'all' ? 'All orgs' : m.replace('_', ' ')}
            </button>
          ))}
        </div>
        {targetMode === 'industries' && (
          <input
            placeholder="Comma-separated: SaaS, Retail, Healthcare"
            value={industriesRaw}
            onChange={(e) => setIndustriesRaw(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        )}
        {targetMode === 'plans' && (
          <input
            placeholder="Comma-separated: starter, pro, enterprise"
            value={planCodesRaw}
            onChange={(e) => setPlanCodesRaw(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        )}
        {targetMode === 'plan_statuses' && (
          <input
            placeholder="Comma-separated: active, trialing, past_due"
            value={planStatusesRaw}
            onChange={(e) => setPlanStatusesRaw(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground"
          />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            className="px-3 py-1.5 text-sm border border-dark-600 text-dark-200 hover:bg-dark-800 rounded-lg"
          >
            Preview audience
          </button>
          {preview && (
            <span className="text-sm text-dark-200">
              {preview.org_count.toLocaleString()} orgs ·{' '}
              {preview.user_count.toLocaleString()} users
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-dark-200 hover:bg-dark-800 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save draft'}
        </button>
      </div>

      <p className="text-xs text-dark-400">
        Drafts are not sent until you click <span className="font-semibold">Send</span> on the list.
      </p>
    </form>
  )
}
