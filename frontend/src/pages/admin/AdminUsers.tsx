import { useState, useEffect, Fragment, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  UserCircleIcon,
  FolderIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useRoom } from '../../context/RoomContext'
import { useToast } from '../../context/ToastContext'
import { usersService, UserWithRooms, InviteUserData } from '../../services/users'
import { UserRole } from '../../services/auth'

export function AdminUsers() {
  const { user: currentUser } = useAuth()
  const { rooms } = useRoom()
  const topLevelRooms = rooms.filter((room) => room.parent_room_id === null)
  const { success, error: showError } = useToast()

  const [users, setUsers] = useState<UserWithRooms[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRooms | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'room_admin'>('all')

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
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await usersService.getUsers()
      setUsers(response.users)
    } catch {
      showError('Failed to load users', 'Please try again later')
    } finally {
      setIsLoading(false)
    }
  }

  const totalUsersCount = users.length
  const adminUsersCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users])
  const roomAdminUsersCount = totalUsersCount - adminUsersCount

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchQuery ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.role_label && u.role_label.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)
    try {
      const response = await usersService.inviteUser(inviteForm)
      setTempPassword(response.temporary_password)
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
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
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
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.'))
      return
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
    setInviteForm({ email: '', name: '', role: 'room_admin', role_label: '', room_ids: [] })
    setFormError(null)
    setTempPassword(null)
  }

  const handleResetPassword = (user: UserWithRooms) => {
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
      showError(
        'Failed to reset password',
        error.response?.data?.detail || 'Please try again'
      )
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

  return (
    <div className="space-y-6">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <UsersIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Total Users:</span>
          <span className="font-semibold text-foreground">{totalUsersCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-purple-400 stroke-[1.8]" />
          <span className="text-dark-400">Admins:</span>
          <span className="font-semibold text-foreground">{adminUsersCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          <span className="text-dark-400">Room Admins:</span>
          <span className="font-semibold text-foreground">{roomAdminUsersCount}</span>
        </div>
      </div>

      {/* Toolbar: Search + Filter + Invite */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search by name, email, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 justify-between sm:justify-end">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-xs text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="room_admin">Room Admins</option>
          </select>

          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <UserPlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Invite User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-dark-400">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-dark-400">
            <UserCircleIcon className="w-12 h-12 mx-auto mb-3 text-dark-500 stroke-[1.5]" />
            <p className="text-sm font-semibold text-foreground">
              {searchQuery || roleFilter !== 'all' ? 'No users match your filters' : 'No team members yet'}
            </p>
            <p className="text-xs text-dark-400 mt-1">Invite your first team member or room admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-950/40 text-[11px] font-semibold text-dark-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role & Title</th>
                  <th className="px-4 py-3.5 hidden md:table-cell">Assigned Rooms</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-dark-800/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-dark-800 border border-dark-700 rounded-xl flex items-center justify-center text-foreground font-semibold text-sm flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary-400 transition-colors">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-[10px] text-dark-400 font-normal">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-dark-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                            user.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                          }`}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Room Admin'}
                        </span>
                        {user.role_label && (
                          <span className="text-xs text-dark-300 font-medium">
                            {user.role_label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {user.role === 'admin' ? (
                        <span className="text-xs text-dark-400">All Rooms (Global)</span>
                      ) : user.assigned_rooms.length === 0 ? (
                        <span className="text-xs text-amber-400/80">No rooms assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {user.assigned_rooms.slice(0, 3).map((room) => (
                            <span
                              key={room.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-950 border border-dark-800 text-dark-300 rounded-md text-xs font-medium"
                            >
                              <FolderIcon className="w-3 h-3 text-dark-400" />
                              {room.name}
                            </span>
                          ))}
                          {user.assigned_rooms.length > 3 && (
                            <span className="text-xs text-dark-400 font-medium self-center">
                              +{user.assigned_rooms.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {user.id !== currentUser?.id && (
                        <div className="flex items-center justify-end gap-1">
                          {user.role === 'room_admin' && (
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit room assignments"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            className="p-1.5 text-dark-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Reset password"
                          >
                            <KeyIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isDeleting === user.id}
                            className="p-1.5 text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
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
          </div>
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 p-6 shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-base font-bold text-foreground tracking-tight">
                      {tempPassword ? 'User Invited' : 'Invite New Team Member'}
                    </Dialog.Title>
                    <button
                      onClick={closeInviteModal}
                      className="text-dark-400 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {tempPassword ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <p className="text-emerald-400 text-xs font-semibold mb-1">
                          User has been invited successfully!
                        </p>
                        <p className="text-dark-300 text-xs">
                          Share this temporary credentials with them:
                        </p>
                        <div className="mt-2.5 p-3 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-between">
                          <code className="text-foreground font-mono text-base font-semibold">
                            {tempPassword}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(tempPassword)}
                            className="p-1.5 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                            title="Copy to clipboard"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-dark-400 mt-2">
                          They will be prompted to change their password upon first sign in.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeInviteModal}
                        className="w-full px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                      {formError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                          {formError}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) =>
                            setInviteForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder="colleague@company.com"
                          className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={inviteForm.name}
                          onChange={(e) =>
                            setInviteForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Jane Doe"
                          className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-dark-300 mb-1.5">
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
                          className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground focus:outline-none focus:border-dark-500 transition-colors cursor-pointer"
                        >
                          <option value="room_admin">Room Admin</option>
                          <option value="admin">Organization Admin</option>
                        </select>
                        <p className="mt-1 text-[11px] text-dark-400">
                          {inviteForm.role === 'admin'
                            ? 'Admins have full access across all rooms and settings.'
                            : 'Room Admins only have access to assigned rooms.'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                          Title / Position *
                        </label>
                        <input
                          type="text"
                          value={inviteForm.role_label}
                          onChange={(e) =>
                            setInviteForm((prev) => ({ ...prev, role_label: e.target.value }))
                          }
                          placeholder="e.g., Head of Sales, Marketing Lead"
                          className="w-full px-3.5 py-2.5 bg-dark-950/50 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
                          required
                        />
                      </div>
                      {inviteForm.role === 'room_admin' && (
                        <div>
                          <label className="block text-xs font-semibold text-dark-300 mb-2">
                            Assign Rooms *
                          </label>
                          {topLevelRooms.length === 0 ? (
                            <p className="text-xs text-dark-400">
                              No rooms available. Create a room first.
                            </p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {topLevelRooms.map((room) => (
                                <label
                                  key={room.id}
                                  className="flex items-center gap-2.5 p-2 bg-dark-950/40 border border-dark-800 rounded-xl cursor-pointer hover:bg-dark-800/40 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={inviteForm.room_ids?.includes(room.id) || false}
                                    onChange={() => toggleRoomSelection(room.id)}
                                    className="w-4 h-4 rounded border-dark-700 text-primary-500 focus:ring-primary-500 bg-dark-900"
                                  />
                                  <FolderIcon className="w-3.5 h-3.5 text-dark-400" />
                                  <span className="text-foreground text-xs font-medium">{room.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-800">
                        <button
                          type="button"
                          onClick={closeInviteModal}
                          className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground transition-colors cursor-pointer"
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
                          className="px-4 py-2 text-xs font-semibold text-dark-950 bg-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm cursor-pointer"
                        >
                          {isSubmitting ? 'Inviting...' : 'Send Invitation'}
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 p-6 shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-base font-bold text-foreground tracking-tight">
                      Edit Room Assignments
                    </Dialog.Title>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setSelectedUser(null)
                      }}
                      className="text-dark-400 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {selectedUser && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-dark-950/50 border border-dark-800 rounded-xl">
                        <div className="w-9 h-9 bg-dark-800 border border-dark-700 rounded-xl flex items-center justify-center text-foreground font-semibold text-sm">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{selectedUser.name}</p>
                          <p className="text-xs text-dark-400">{selectedUser.email}</p>
                        </div>
                      </div>
                      {formError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                          {formError}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-dark-300 mb-2">
                          Assigned Rooms
                        </label>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {topLevelRooms.map((room) => (
                            <label
                              key={room.id}
                              className="flex items-center gap-2.5 p-2 bg-dark-950/40 border border-dark-800 rounded-xl cursor-pointer hover:bg-dark-800/40 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={inviteForm.room_ids?.includes(room.id) || false}
                                onChange={() => toggleRoomSelection(room.id)}
                                className="w-4 h-4 rounded border-dark-700 text-primary-500 focus:ring-primary-500 bg-dark-900"
                              />
                              <FolderIcon className="w-3.5 h-3.5 text-dark-400" />
                              <span className="text-foreground text-xs font-medium">{room.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditModalOpen(false)
                            setSelectedUser(null)
                          }}
                          className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateRooms}
                          disabled={isSubmitting}
                          className="px-4 py-2 text-xs font-semibold text-dark-950 bg-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm cursor-pointer"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Assignments'}
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 p-6 shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-base font-bold text-foreground tracking-tight">
                      {resetPassword ? 'Password Reset' : 'Reset User Password'}
                    </Dialog.Title>
                    <button
                      onClick={() => {
                        setIsResetModalOpen(false)
                        setResetUser(null)
                        setResetPassword(null)
                      }}
                      className="text-dark-400 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {resetPassword ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <p className="text-emerald-400 text-xs font-semibold mb-1">
                          Password has been reset for {resetUser?.name}
                        </p>
                        <p className="text-dark-300 text-xs">New temporary password:</p>
                        <div className="mt-2.5 p-3 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-between">
                          <code className="text-foreground font-mono text-base font-semibold">
                            {resetPassword}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(resetPassword)}
                            className="p-1.5 text-dark-300 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                            title="Copy to clipboard"
                          >
                            {copied ? (
                              <span className="text-emerald-400 text-xs font-medium">Copied!</span>
                            ) : (
                              <ClipboardDocumentIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-dark-400 mt-2">
                          Share this password securely with the user.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetModalOpen(false)
                          setResetUser(null)
                          setResetPassword(null)
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {resetUser && (
                        <div className="flex items-center gap-3 p-3 bg-dark-950/50 border border-dark-800 rounded-xl">
                          <div className="w-9 h-9 bg-dark-800 border border-dark-700 rounded-xl flex items-center justify-center text-foreground font-semibold text-sm">
                            {resetUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{resetUser.name}</p>
                            <p className="text-xs text-dark-400">{resetUser.email}</p>
                          </div>
                        </div>
                      )}
                      <p className="text-dark-300 text-xs leading-relaxed">
                        This will generate a new temporary password for this user. Their current password will stop working immediately.
                      </p>
                      <div className="flex justify-end gap-2.5 pt-4 border-t border-dark-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetModalOpen(false)
                            setResetUser(null)
                          }}
                          className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-foreground transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmResetPassword}
                          disabled={isResetting}
                          className="px-4 py-2 text-xs font-semibold text-dark-950 bg-foreground hover:opacity-90 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm cursor-pointer"
                        >
                          {isResetting ? 'Resetting...' : 'Generate New Password'}
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
