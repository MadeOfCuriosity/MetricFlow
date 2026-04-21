import { useEffect, useState } from 'react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { superadminService, SuperAdmin } from '../../services/superadmin'

export function SuperAdminAdmins() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const currentAdmin = superadminService.getStoredAdmin()

  const load = () => {
    setLoading(true)
    superadminService
      .listAdmins()
      .then(setAdmins)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await superadminService.createAdmin({
        email: newEmail.trim(),
        name: newName.trim() || undefined,
      })
      setNewEmail('')
      setNewName('')
      setShowAdd(false)
      load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add admin')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (a: SuperAdmin) => {
    try {
      await superadminService.updateAdmin(a.id, { is_active: !a.is_active })
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update admin')
    }
  }

  const remove = async (a: SuperAdmin) => {
    if (!confirm(`Remove ${a.email} as a super-administrator?`)) return
    try {
      await superadminService.deleteAdmin(a.id)
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete admin')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Super-Administrators</h1>
          <p className="text-dark-300 mt-1">
            Only the Google accounts below can sign in to this panel.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-dark-900 border border-dark-700 rounded-xl p-5 space-y-4"
        >
          {error && (
            <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-3 text-sm text-danger-400">
              {error}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-200 mb-1">Google Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="person@company.com"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-200 mb-1">Name (optional)</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-dark-200 hover:bg-dark-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dark-800 text-dark-300 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Last Login</th>
              <th className="text-left px-4 py-3">Added By</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-dark-400">
                  Loading…
                </td>
              </tr>
            ) : (
              admins.map((a) => {
                const isSelf = currentAdmin?.id === a.id
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-foreground">
                      {a.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-primary-400">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-dark-200">{a.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          a.is_active
                            ? 'bg-success-500/15 text-success-400'
                            : 'bg-dark-700 text-dark-300'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-400 text-xs">
                      {a.last_login_at ? new Date(a.last_login_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-dark-400 text-xs">
                      {a.created_by_email || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => toggleActive(a)}
                          disabled={isSelf}
                          className="px-3 py-1 text-xs border border-dark-600 text-dark-200 hover:bg-dark-800 rounded disabled:opacity-40"
                        >
                          {a.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => remove(a)}
                          disabled={isSelf}
                          className="px-2 py-1 text-danger-400 hover:bg-danger-500/10 rounded disabled:opacity-40"
                          title="Remove"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
