import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { superadminService, GlobalUserItem } from '../../services/superadmin'

export function SuperAdminUsers() {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [items, setItems] = useState<GlobalUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const load = () => {
    setLoading(true)
    superadminService
      .listUsers({ q: q || undefined, role: role || undefined, limit, offset })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, role])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-dark-300 mt-1">{total.toLocaleString()} across all organizations.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setOffset(0)
          load()
        }}
        className="flex gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email or name"
            className="pl-10 pr-3 py-2 w-full bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setOffset(0)
            setRole(e.target.value)
          }}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="room_admin">Room Admin</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800 text-dark-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Auth</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-dark-400">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-dark-400">
                    No users found
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-dark-800/60">
                    <td className="px-4 py-3 text-foreground">{u.name}</td>
                    <td className="px-4 py-3 text-dark-200">{u.email}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/superadmin/organizations/${u.org_id}`}
                        className="text-primary-400 hover:underline"
                      >
                        {u.org_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-dark-200">{u.role_label || u.role}</td>
                    <td className="px-4 py-3 text-dark-400 text-xs">{u.auth_provider}</td>
                    <td className="px-4 py-3 text-dark-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-800 text-sm">
            <div className="text-dark-400">
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 bg-dark-800 text-dark-200 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 bg-dark-800 text-dark-200 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
