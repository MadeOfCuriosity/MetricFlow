import { useAuth } from '../../context/AuthContext'

export function SettingsProfile() {
  const { user } = useAuth()

  return (
    <div className="max-w-2xl bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
        </div>
        <div>
          <p className="text-foreground font-medium">{user?.name || 'User'}</p>
          <p className="text-sm text-dark-300">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">Full Name</label>
          <input
            type="text"
            defaultValue={user?.name || ''}
            className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
          <input
            type="email"
            defaultValue={user?.email || ''}
            disabled
            className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-400 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-dark-700">
        <button className="px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  )
}
