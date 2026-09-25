import { useState } from 'react'
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { authService } from '../../services/auth'
import { useToast } from '../../context/ToastContext'
import { getApiError } from '../../lib/apiError'

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
      setPasswordError(getApiError(err, 'Failed to change password'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-foreground tracking-tight">Security & Authentication</h2>
        <p className="text-xs text-dark-300 mt-0.5">Manage your password and secure account credentials.</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        {passwordError && (
          <div className="flex items-center gap-3 p-4 bg-danger-500/10 border border-danger-500/20 rounded-2xl text-danger-400 text-xs font-semibold">
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3.5 py-2.5 pr-11 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-foreground transition-colors cursor-pointer"
            >
              {showCurrentPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
              className="w-full px-3.5 py-2.5 pr-11 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-foreground transition-colors cursor-pointer"
            >
              {showNewPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3.5 py-2.5 pr-11 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-foreground transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-dark-800 flex justify-end">
          <button
            type="submit"
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isChangingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>

      <div className="pt-6 border-t border-dark-800/80">
        <h3 className="text-xs font-bold text-danger-400 uppercase tracking-wider mb-1">Danger Zone</h3>
        <p className="text-xs text-dark-400 mb-4">
          Permanently delete your account and all associated access rights.
        </p>
        <button
          type="button"
          className="px-4 py-2 bg-danger-500/10 text-danger-400 border border-danger-500/20 rounded-xl text-xs font-semibold hover:bg-danger-500/20 transition-colors cursor-pointer"
        >
          Delete Account
        </button>
      </div>
    </div>
  )
}
