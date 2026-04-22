import { Fragment, useEffect, useState } from 'react'
import { TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { superadminService, SalesLead } from '../../services/superadmin'

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
  contacted: 'bg-warning-500/20 text-warning-300 border-warning-500/30',
  qualified: 'bg-success-500/20 text-success-300 border-success-500/30',
  won: 'bg-success-500/30 text-success-200 border-success-500/50',
  lost: 'bg-dark-700 text-dark-400 border-dark-600',
}

export function SuperAdminLeads() {
  const [leads, setLeads] = useState<SalesLead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    superadminService
      .listLeads({
        status: statusFilter || undefined,
        q: q || undefined,
        limit: 100,
      })
      .then((res) => {
        setLeads(res.items)
        setTotal(res.total)
        setError('')
      })
      .catch((e) => setError(e.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleStatusChange = async (lead: SalesLead, newStatus: string) => {
    setSavingId(lead.id)
    try {
      const updated = await superadminService.updateLead(lead.id, {
        status: newStatus,
      })
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update')
    } finally {
      setSavingId(null)
    }
  }

  const handleNotesBlur = async (lead: SalesLead, notes: string) => {
    if (notes === (lead.notes || '')) return
    setSavingId(lead.id)
    try {
      const updated = await superadminService.updateLead(lead.id, { notes })
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save notes')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (lead: SalesLead) => {
    if (!confirm(`Delete lead from ${lead.email}? This cannot be undone.`)) return
    try {
      await superadminService.deleteLead(lead.id)
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
      setTotal((t) => t - 1)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales Leads</h1>
        <p className="text-sm text-dark-400 mt-1">
          Inbound requests from the landing page "Contact Sales" form.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load()
          }}
          placeholder="Search by name, email, company…"
          className="flex-1 min-w-[240px] bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-4 py-2 text-sm bg-dark-800 border border-dark-700 text-dark-200 hover:bg-dark-700 rounded-lg"
        >
          Search
        </button>
        <div className="text-xs text-dark-400 ml-auto">
          {loading ? 'Loading…' : `${total} lead${total === 1 ? '' : 's'}`}
        </div>
      </div>

      {error && (
        <div className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!loading && leads.length === 0 ? (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-10 text-center">
          <div className="text-dark-300 text-sm">No leads yet.</div>
          <div className="text-dark-500 text-xs mt-1">
            Submissions from the Enterprise "Contact Sales" form will show up here.
          </div>
        </div>
      ) : (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-850 text-xs uppercase text-dark-400">
              <tr>
                <th className="text-left px-4 py-3">Received</th>
                <th className="text-left px-4 py-3">Name / Email</th>
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3">Team</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {leads.map((l) => {
                const isOpen = expanded === l.id
                return (
                  <Fragment key={l.id}>
                    <tr className="hover:bg-dark-850/40">
                      <td className="px-4 py-3 text-dark-300 text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleDateString()}{' '}
                        <span className="text-dark-500">
                          {new Date(l.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground font-medium">{l.name}</div>
                        <a
                          href={`mailto:${l.email}`}
                          className="text-xs text-primary-400 hover:underline"
                        >
                          {l.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-dark-200">{l.company || '—'}</td>
                      <td className="px-4 py-3 text-dark-300 text-xs">
                        {l.team_size || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={l.status}
                          disabled={savingId === l.id}
                          onChange={(e) => handleStatusChange(l, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded border capitalize focus:outline-none ${
                            STATUS_COLORS[l.status] || STATUS_COLORS.new
                          }`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setExpanded(isOpen ? null : l.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-dark-200 hover:bg-dark-800 rounded"
                        >
                          {isOpen ? (
                            <ChevronUpIcon className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5" />
                          )}
                          Details
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
                          className="inline-flex items-center gap-1 px-2 py-1 ml-1 text-xs text-danger-400 hover:bg-danger-500/10 rounded"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-dark-850/30">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid md:grid-cols-2 gap-5">
                            <div>
                              <div className="text-xs uppercase text-dark-500 mb-1">
                                Message
                              </div>
                              <div className="text-sm text-dark-100 whitespace-pre-wrap bg-dark-900 border border-dark-700 rounded-lg p-3 min-h-[80px]">
                                {l.message || (
                                  <span className="text-dark-500">
                                    No message submitted.
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-dark-500 mt-2">
                                Source: {l.source}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs uppercase text-dark-500 mb-1">
                                Internal notes
                              </label>
                              <textarea
                                defaultValue={l.notes || ''}
                                onBlur={(e) => handleNotesBlur(l, e.target.value)}
                                rows={4}
                                placeholder="Notes save on blur…"
                                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-500 resize-none"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
