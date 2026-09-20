import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export function SettingsProfile() {
  const { user } = useAuth()
  const { success } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      success('Profile Updated', 'Your profile details have been saved successfully.')
    }, 400)
  }

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-foreground tracking-tight">Profile Settings</h2>
        <p className="text-xs text-dark-300 mt-0.5">Manage your personal account details and display name.</p>
      </div>

      <div className="flex items-center gap-4 p-4 bg-dark-950/40 border border-dark-800 rounded-2xl">
        <div className="w-14 h-14 bg-dark-800 border border-dark-700 rounded-2xl flex items-center justify-center text-foreground text-xl font-bold">
          {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{user?.name || 'User'}</p>
          <p className="text-xs text-dark-400 mt-0.5">{user?.email}</p>
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-dark-800 border border-dark-700 text-[10px] font-semibold text-dark-300 uppercase tracking-wider">
            {user?.role === 'admin' ? 'Organization Admin' : 'Room Admin'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5">Email Address</label>
          <input
            type="email"
            defaultValue={user?.email || ''}
            disabled
            className="w-full px-3.5 py-2.5 bg-dark-950/30 border border-dark-800 rounded-xl text-sm text-dark-400 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-dark-800 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
