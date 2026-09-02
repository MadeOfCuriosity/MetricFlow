import { useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { authService } from '../../services/auth'
import { useToast } from '../../context/ToastContext'

export function SettingsSecurity() {
  const { success } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  return (
    <div className="max-w-2xl bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>

      <form onSubmit={handleChangePassword} className="space-y-4">
        {passwordError && (
          <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-sm">
            {passwordError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">Current Password</label>
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
          <label className="block text-sm font-medium text-dark-300 mb-1">New Password</label>
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
          <label className="block text-sm font-medium text-dark-300 mb-1">Confirm New Password</label>
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
  )
}
