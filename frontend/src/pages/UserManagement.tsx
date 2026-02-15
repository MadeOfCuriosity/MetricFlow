import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  FolderIcon,
  KeyIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useRoom } from '../context/RoomContext'
import { useToast } from '../context/ToastContext'
import { usersService, UserWithRooms, InviteUserData } from '../services/users'
import { UserRole } from '../services/auth'

export function UserManagement() {
  const { user: currentUser, isAdmin } = useAuth()
  const { rooms } = useRoom()

  // Only show top-level rooms (not sub-rooms) for assignment
  const topLevelRooms = rooms.filter((room) => room.parent_room_id === null)
  const { success, error: showError } = useToast()

  const [users, setUsers] = useState<UserWithRooms[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRooms | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Invite form state
  const [inviteForm, setInviteForm] = useState<InviteUserData>({
    email: '',
    name: '',
    role: 'room_admin',
    role_label: '',
    room_ids: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  // Reset password state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserWithRooms | null>(null)
  const [resetPassword, setResetPassword] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await usersService.getUsers()
      setUsers(response.users)
    } catch (err) {
      showError('Failed to load users', 'Please try again later')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    try {
      const response = await usersService.inviteUser(inviteForm)
      setTempPassword(response.temporary_password)
      // Reload users list to get full data including assigned_rooms
      await loadUsers()
      success('User invited', `${response.user.name} has been invited to the organization`)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setFormError(error.response?.data?.detail || 'Failed to invite user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRooms = async () => {
    if (!selectedUser) return

    setFormError(null)
    setIsSubmitting(true)

    try {
      const updated = await usersService.updateUserRooms(selectedUser.id, {
        room_ids: inviteForm.room_ids || [],
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      )
      success('Rooms updated', `Room assignments for ${updated.name} have been updated`)
      setIsEditModalOpen(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setFormError(error.response?.data?.detail || 'Failed to update room assignments')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    setIsDeleting(userId)
    try {
      await usersService.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      success('User deleted', 'The user has been removed from the organization')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError('Failed to delete user', error.response?.data?.detail || 'Please try again')
    } finally {
      setIsDeleting(null)
    }
  }

  const openEditModal = (user: UserWithRooms) => {
    setSelectedUser(user)
    setInviteForm({
      email: user.email,
      name: user.name,
      role: user.role,
      role_label: user.role_label,
      room_ids: user.assigned_rooms.map((r) => r.id),
    })
    setFormError(null)
    setIsEditModalOpen(true)
  }

  const closeInviteModal = () => {
    setIsInviteModalOpen(false)
    setInviteForm({
      email: '',
      name: '',
      role: 'room_admin',
      role_label: '',
      room_ids: [],
    })
    setFormError(null)
    setTempPassword(null)
  }

  const handleResetPassword = async (user: UserWithRooms) => {
    setResetUser(user)
    setResetPassword(null)
    setCopied(false)
    setIsResetModalOpen(true)
  }

  const confirmResetPassword = async () => {
    if (!resetUser) return

    setIsResetting(true)
    try {
      const response = await usersService.resetPassword(resetUser.id)
      setResetPassword(response.temporary_password)
      success('Password reset', `Password for ${resetUser.name} has been reset`)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      showError('Failed to reset password', error.response?.data?.detail || 'Please try again')
      setIsResetModalOpen(false)
    } finally {
      setIsResetting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleRoomSelection = (roomId: string) => {
    setInviteForm((prev) => ({
      ...prev,
      room_ids: prev.room_ids?.includes(roomId)
        ? prev.room_ids.filter((id) => id !== roomId)
        : [...(prev.room_ids || []), roomId],
    }))
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheckIcon className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <p className="text-dark-300">Admin access required to view this page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-dark-300 mt-1">Manage team members and their access</p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
        >
          <UserPlusIcon className="w-5 h-5" />
          Invite User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-dark-300">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-dark-300">
            <UserCircleIcon className="w-12 h-12 mx-auto mb-4 text-dark-500" />
            <p>No users found. Invite your first team member!</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Assigned Rooms
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-dark-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-foreground font-medium">
                          {user.name}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-dark-400">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-dark-300">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-primary-500/20 text-primary-400'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Room Admin'}
                      </span>
                      <span className="text-sm text-dark-400">{user.role_label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'admin' ? (
                      <span className="text-sm text-dark-400">All rooms</span>
                    ) : user.assigned_rooms.length === 0 ? (
                      <span className="text-sm text-danger-400">No rooms assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.assigned_rooms.slice(0, 3).map((room) => (
                          <span
                            key={room.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-600 text-dark-200 rounded text-xs"
                          >
                            <FolderIcon className="w-3 h-3" />
                            {room.name}
                          </span>
                        ))}
                        {user.assigned_rooms.length > 3 && (
                          <span className="text-xs text-dark-400">
                            +{user.assigned_rooms.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.id !== currentUser?.id && (
                      <div className="flex items-center justify-end gap-2">
                        {user.role === 'room_admin' && (
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-600 rounded-lg transition-colors"
                            title="Edit room assignments"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="p-2 text-dark-300 hover:text-warning-400 hover:bg-warning-500/10 rounded-lg transition-colors"
                          title="Reset password"
                        >
                          <KeyIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isDeleting === user.id}
                          className="p-2 text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete user"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite User Modal */}
      <Transition appear show={isInviteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeInviteModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-dark-800 p-6 shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      {tempPassword ? 'User Invited' : 'Invite New User'}
                    </Dialog.Title>
                    <button
                      onClick={closeInviteModal}
                      className="text-dark-300 hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {tempPassword ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-success-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-success-400 text-sm mb-2">
                          User has been invited successfully!
                        </p>
                        <p className="text-dark-300 text-sm">
                          Share this temporary password with them:
                        </p>
                        <div className="mt-2 p-3 bg-dark-900 rounded-lg flex items-center justify-between">
                          <code className="text-foreground font-mono text-lg">{tempPassword}</code>
                          <button
                            onClick={() => copyToClipboard(tempPassword)}
                            className="p-1.5 text-dark-300 hover:text-foreground hover:bg-dark-700 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            <ClipboardDocumentIcon className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-xs text-dark-400 mt-2">
                          They should change this password after first login.
                        </p>
                      </div>
                      <button
                        onClick={closeInviteModal}
                        className="w-full px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                      {formError && (
                        <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-sm">
                          {formError}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) =>
                            setInviteForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={inviteForm.name}
                          onChange={(e) =>
                            setInviteForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">
                          Role *
                        </label>
                        <select
                          value={inviteForm.role}
                          onChange={(e) =>
                            setInviteForm((prev) => ({
                              ...prev,
                              role: e.target.value as UserRole,
                              room_ids: e.target.value === 'admin' ? [] : prev.room_ids,
                            }))
                          }
                          className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="room_admin">Room Admin</option>
                          <option value="admin">Admin</option>
                        </select>
                        <p className="mt-1 text-xs text-dark-400">
                          {inviteForm.role === 'admin'
                            ? 'Admins have full access to all rooms and settings'
                            : 'Room Admins can only access assigned rooms'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">
                          Title/Position *
                        </label>
                        <input
                          type="text"
                          value={inviteForm.role_label}
                          onChange={(e) =>
                            setInviteForm((prev) => ({ ...prev, role_label: e.target.value }))
                          }
                          placeholder="e.g., Sales Head, Marketing Lead"
                          className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-foreground placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>

                      {inviteForm.role === 'room_admin' && (
                        <div>
                          <label className="block text-sm font-medium text-dark-200 mb-2">
                            Assign Rooms *
                          </label>
                          {topLevelRooms.length === 0 ? (
                            <p className="text-sm text-dark-400">
                              No rooms available. Create a room first.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {topLevelRooms.map((room) => (
                                <label
                                  key={room.id}
                                  className="flex items-center gap-3 p-2 bg-dark-600/50 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={inviteForm.room_ids?.includes(room.id) || false}
                                    onChange={() => toggleRoomSelection(room.id)}
                                    className="w-4 h-4 rounded border-dark-500 text-primary-500 focus:ring-primary-500 bg-dark-500"
                                  />
                                  <FolderIcon className="w-4 h-4 text-dark-300" />
                                  <span className="text-foreground text-sm">{room.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          type="button"
                          onClick={closeInviteModal}
                          className="px-4 py-2 text-sm font-medium text-dark-200 hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={
                            isSubmitting ||
                            !inviteForm.email ||
                            !inviteForm.name ||
                            !inviteForm.role_label ||
                            (inviteForm.role === 'room_admin' &&
                              (!inviteForm.room_ids || inviteForm.room_ids.length === 0))
                          }
                          className="px-4 py-2 text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmitting ? 'Inviting...' : 'Invite User'}
                        </button>
                      </div>
                    </form>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Edit Room Assignments Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedUser(null)
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-dark-800 p-6 shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      Edit Room Assignments
                    </Dialog.Title>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setSelectedUser(null)
                      }}
                      className="text-dark-300 hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {selectedUser && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-dark-600/50 rounded-lg">
                        <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{selectedUser.name}</p>
                          <p className="text-sm text-dark-300">{selectedUser.email}</p>
                        </div>
                      </div>

                      {formError && (
                        <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-sm">
                          {formError}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-2">
                          Assigned Rooms
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {topLevelRooms.map((room) => (
                            <label
                              key={room.id}
                              className="flex items-center gap-3 p-2 bg-dark-600/50 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={inviteForm.room_ids?.includes(room.id) || false}
                                onChange={() => toggleRoomSelection(room.id)}
                                className="w-4 h-4 rounded border-dark-500 text-primary-500 focus:ring-primary-500 bg-dark-500"
                              />
                              <FolderIcon className="w-4 h-4 text-dark-300" />
                              <span className="text-foreground text-sm">{room.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditModalOpen(false)
                            setSelectedUser(null)
                          }}
                          className="px-4 py-2 text-sm font-medium text-dark-200 hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateRooms}
                          disabled={isSubmitting}
                          className="px-4 py-2 text-sm font-medium text-foreground border border-primary-500 bg-transparent hover:bg-primary-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Reset Password Modal */}
      <Transition appear show={isResetModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            setIsResetModalOpen(false)
            setResetUser(null)
            setResetPassword(null)
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-dark-800 p-6 shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      {resetPassword ? 'Password Reset' : 'Reset Password'}
                    </Dialog.Title>
                    <button
                      onClick={() => {
                        setIsResetModalOpen(false)
                        setResetUser(null)
                        setResetPassword(null)
                      }}
                      className="text-dark-300 hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {resetPassword ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-success-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-success-400 text-sm mb-2">
                          Password has been reset for {resetUser?.name}
                        </p>
                        <p className="text-dark-300 text-sm">
                          New temporary password:
                        </p>
                        <div className="mt-2 p-3 bg-dark-900 rounded-lg flex items-center justify-between">
                          <code className="text-foreground font-mono text-lg">{resetPassword}</code>
                          <button
                            onClick={() => copyToClipboard(resetPassword)}
                            className="p-1.5 text-dark-300 hover:text-foreground hover:bg-dark-700 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            {copied ? (
                              <span className="text-success-400 text-xs font-medium">Copied!</span>
                            ) : (
                              <ClipboardDocumentIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-dark-400 mt-2">
                          Share this password securely. They can change it in Settings.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsResetModalOpen(false)
                          setResetUser(null)
                          setResetPassword(null)
                        }}
                        className="w-full px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {resetUser && (
                        <div className="flex items-center gap-3 p-3 bg-dark-600/50 rounded-lg">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                            {resetUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-foreground font-medium">{resetUser.name}</p>
                            <p className="text-sm text-dark-300">{resetUser.email}</p>
                          </div>
                        </div>
                      )}

                      <p className="text-dark-300 text-sm">
                        This will generate a new temporary password for this user. Their current password will stop working immediately.
                      </p>

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetModalOpen(false)
                            setResetUser(null)
                          }}
                          className="px-4 py-2 text-sm font-medium text-dark-200 hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmResetPassword}
                          disabled={isResetting}
                          className="px-4 py-2 text-sm font-medium text-white bg-warning-500 hover:bg-warning-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isResetting ? 'Resetting...' : 'Reset Password'}
                        </button>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
