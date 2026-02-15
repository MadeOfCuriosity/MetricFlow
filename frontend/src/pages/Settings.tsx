import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  UserCircleIcon,
  BuildingOfficeIcon,
  BellIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  SwatchIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { authService } from '../services/auth'
import { Integrations } from './Integrations'

const validTabs = ['profile', 'organization', 'notifications', 'appearance', 'integrations', 'security']

export function Settings() {
  const { user, organization, logout } = useAuth()
  const { success } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'profile'
  )

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleLogout = () => {
    logout()
    success('Logged out', 'You have been signed out successfully')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    setIsChangingPassword(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      success('Password updated', 'Your password has been changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setPasswordError(error.response?.data?.detail || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    { id: 'organization', label: 'Organization', icon: BuildingOfficeIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'appearance', label: 'Appearance', icon: SwatchIcon },
    { id: 'integrations', label: 'Integrations', icon: ArrowPathRoundedSquareIcon },
    { id: 'security', label: 'Security', icon: KeyIcon },
  ]

  return (
    <div className={`mx-auto space-y-6 ${activeTab === 'integrations' ? 'max-w-6xl' : 'max-w-4xl'}`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-dark-300 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar navigation */}
        <div className="lg:col-span-1">
          <nav className="bg-dark-900 border border-dark-700 rounded-xl p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border border-primary-500 text-foreground'
                      : 'text-dark-300 hover:bg-dark-800 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
            <hr className="my-2 border-dark-700" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-danger-400 hover:bg-danger-500/10 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          {activeTab === 'integrations' && (
            <Integrations embedded />
          )}
          <div className={`bg-dark-900 border border-dark-700 rounded-xl p-6 ${activeTab === 'integrations' ? 'hidden' : ''}`}>
            {activeTab === 'profile' && (
              <div className="space-y-6">
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
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.name || ''}
                      className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Email
                    </label>
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
            )}

            {activeTab === 'organization' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">
                  Organization Settings
                </h2>

                <div className="bg-dark-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <BuildingOfficeIcon className="w-10 h-10 text-dark-300" />
                    <div>
                      <p className="text-foreground font-medium">
                        {organization?.name || 'Your Organization'}
                      </p>
                      <p className="text-sm text-dark-300">
                        Role: <span className="capitalize">{user?.role || 'member'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    defaultValue={organization?.name || ''}
                    className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <button className="px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors">
                    Update Organization
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">
                  Notification Preferences
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      id: 'insights',
                      title: 'New Insights',
                      description: 'Get notified when new insights are generated',
                    },
                    {
                      id: 'anomalies',
                      title: 'Anomaly Alerts',
                      description: 'Receive alerts for unusual KPI changes',
                    },
                    {
                      id: 'reminders',
                      title: 'Daily Reminders',
                      description: 'Reminder to enter daily data',
                    },
                    {
                      id: 'weekly',
                      title: 'Weekly Summary',
                      description: 'Weekly performance summary email',
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl"
                    >
                      <div>
                        <p className="text-foreground font-medium">{item.title}</p>
                        <p className="text-sm text-dark-300">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-dark-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <button className="px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Appearance</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
                    <div>
                      <p className="text-foreground font-medium">Theme</p>
                      <p className="text-sm text-dark-300">
                        Choose between light, dark, or system theme
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-sm">
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-4 py-2 pr-11 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-200 transition-colors"
                      >
                        {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-4 py-2 pr-11 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-200 transition-colors"
                      >
                        {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2 pr-11 bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-200 transition-colors"
                      >
                        {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dark-700">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                <div className="pt-6 border-t border-dark-700">
                  <h3 className="text-sm font-medium text-danger-400 mb-2">Danger Zone</h3>
                  <p className="text-sm text-dark-300 mb-4">
                    Permanently delete your account and all associated data.
                  </p>
                  <button className="px-4 py-2 bg-danger-600/20 text-danger-400 border border-danger-500/30 rounded-lg hover:bg-danger-600/30 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
