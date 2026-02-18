'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  getAdminUsers, changePlan, changeRole, suspendUser, unsuspendUser,
  banUser, unbanUser, extendTrial, resetUsage,
  type AdminUser,
} from '@/lib/admin-api'

type ModalAction = null | {
  type: 'changePlan' | 'changeRole' | 'suspend' | 'ban' | 'extendTrial'
  user: AdminUser
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

function statusBadge(u: AdminUser) {
  if (u.isBanned) return <Badge color="red">Banned</Badge>
  if (u.isSuspended) return <Badge color="yellow">Suspended</Badge>
  return <Badge color="green">Active</Badge>
}

function roleBadge(role: string) {
  if (role === 'SUPER_ADMIN') return <Badge color="red">{role}</Badge>
  if (role === 'ADMIN') return <Badge color="purple">{role}</Badge>
  return <Badge color="gray">{role}</Badge>
}

function planBadge(plan?: string) {
  if (plan === 'UNLIMITED') return <Badge color="red">{plan}</Badge>
  if (plan === 'ENTERPRISE') return <Badge color="purple">{plan}</Badge>
  if (plan === 'PRO') return <Badge color="blue">{plan}</Badge>
  return <Badge color="gray">{plan || 'N/A'}</Badge>
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [filters, setFilters] = useState({ plan: '', status: '', role: '', search: '' })
  const [modal, setModal] = useState<ModalAction>(null)
  const [modalInput, setModalInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await getAdminUsers({ ...filters, page, limit: pagination.limit })
      setUsers(res.users)
      setPagination(res.pagination)
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit])

  useEffect(() => { loadUsers() }, [loadUsers])

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  async function handleAction(action: () => Promise<any>, successMsg: string) {
    setActionLoading(true)
    try {
      await action()
      setFeedback({ type: 'success', msg: successMsg })
      setModal(null)
      setModalInput('')
      loadUsers(pagination.page)
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Action failed' })
    } finally {
      setActionLoading(false)
    }
  }

  async function quickUnsuspend(u: AdminUser) {
    await handleAction(() => unsuspendUser(u.id), `Unsuspended ${u.email}`)
  }

  async function quickUnban(u: AdminUser) {
    await handleAction(() => unbanUser(u.id), `Unbanned ${u.email}`)
  }

  async function quickResetUsage(u: AdminUser) {
    if (!confirm(`Reset all usage counters for ${u.email}?`)) return
    await handleAction(() => resetUsage(u.id), `Reset usage for ${u.email}`)
  }

  function confirmModal() {
    if (!modal) return
    const { type, user } = modal
    switch (type) {
      case 'changePlan':
        return handleAction(() => changePlan(user.id, modalInput), `Plan changed to ${modalInput}`)
      case 'changeRole':
        return handleAction(() => changeRole(user.id, modalInput), `Role changed to ${modalInput}`)
      case 'suspend':
        return handleAction(() => suspendUser(user.id, modalInput), `Suspended ${user.email}`)
      case 'ban':
        return handleAction(() => banUser(user.id, modalInput), `Banned ${user.email}`)
      case 'extendTrial':
        return handleAction(() => extendTrial(user.id, parseInt(modalInput) || 14), `Extended trial by ${modalInput || 14} days`)
    }
  }

  return (
    <div className="max-w-7xl space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>

      {/* Feedback toast */}
      {feedback && (
        <div className={`p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search email..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/40 w-60"
        />
        <select value={filters.plan} onChange={e => setFilters(f => ({ ...f, plan: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-gray-300">
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
          <option value="UNLIMITED">Unlimited</option>
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-gray-300">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-gray-300">
          <option value="">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-blue-900/20 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0d0d14] text-xs text-gray-400 uppercase tracking-wider">
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Plan Started</th>
              <th className="text-left p-3">Plan Ends</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center p-8 text-gray-500">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="text-center p-8 text-gray-500">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-t border-blue-900/10 hover:bg-blue-500/5 transition-colors">
                <td className="p-3 text-sm text-white font-medium">{u.email || '—'}</td>
                <td className="p-3 text-sm text-gray-300">{u.username || '—'}</td>
                <td className="p-3">{planBadge(u.tenant?.plan)}</td>
                <td className="p-3 text-xs text-gray-500">
                  {u.tenant?.createdAt ? new Date(u.tenant.createdAt).toLocaleDateString() : '—'}
                </td>
                <td className="p-3 text-xs text-gray-500">
                  {u.tenant?.trialEndsAt ? new Date(u.tenant.trialEndsAt).toLocaleDateString() : '—'}
                </td>
                <td className="p-3">{roleBadge(u.systemRole)}</td>
                <td className="p-3">{statusBadge(u)}</td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end flex-wrap">
                    <ActionBtn label="Plan" onClick={() => { setModal({ type: 'changePlan', user: u }); setModalInput(u.tenant?.plan || 'FREE') }} />
                    <ActionBtn label="Role" onClick={() => { setModal({ type: 'changeRole', user: u }); setModalInput(u.systemRole) }} />
                    {u.isSuspended ? (
                      <ActionBtn label="Unsuspend" color="green" onClick={() => quickUnsuspend(u)} />
                    ) : !u.isBanned ? (
                      <ActionBtn label="Suspend" color="yellow" onClick={() => { setModal({ type: 'suspend', user: u }); setModalInput('') }} />
                    ) : null}
                    {u.isBanned ? (
                      <ActionBtn label="Unban" color="green" onClick={() => quickUnban(u)} />
                    ) : (
                      <ActionBtn label="Ban" color="red" onClick={() => { setModal({ type: 'ban', user: u }); setModalInput('') }} />
                    )}
                    <ActionBtn label="Trial" onClick={() => { setModal({ type: 'extendTrial', user: u }); setModalInput('14') }} />
                    <ActionBtn label="Reset" color="yellow" onClick={() => quickResetUsage(u)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{pagination.total} users total</span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => loadUsers(pagination.page - 1)}
              className="px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadUsers(pagination.page + 1)}
              className="px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="bg-[#111118] border border-blue-900/20 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1 capitalize">{modal.type.replace(/([A-Z])/g, ' $1').trim()}</h3>
            <p className="text-gray-400 text-sm mb-4">User: {modal.user.email}</p>

            {modal.type === 'changePlan' && (
              <select value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0d0d14] border border-blue-900/20 text-white mb-4">
                <option value="UNLIMITED">UNLIMITED (Super Admin)</option>
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            )}

            {modal.type === 'changeRole' && (
              <select value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0d0d14] border border-blue-900/20 text-white mb-4">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            )}

            {modal.type === 'suspend' && (
              <input placeholder="Reason (optional)" value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0d0d14] border border-blue-900/20 text-white placeholder-gray-500 mb-4" />
            )}

            {modal.type === 'ban' && (
              <input placeholder="Reason (optional)" value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0d0d14] border border-blue-900/20 text-white placeholder-gray-500 mb-4" />
            )}

            {modal.type === 'extendTrial' && (
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1 block">Days to extend</label>
                <input type="number" value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0d0d14] border border-blue-900/20 text-white" />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button
                onClick={confirmModal}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, onClick, color = 'blue' }: { label: string; onClick: () => void; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 hover:bg-blue-500/10',
    green: 'text-green-400 hover:bg-green-500/10',
    red: 'text-red-400 hover:bg-red-500/10',
    yellow: 'text-yellow-400 hover:bg-yellow-500/10',
  }
  return (
    <button onClick={onClick} className={`px-2 py-0.5 rounded text-[10px] font-medium ${colors[color] || colors.blue} transition-colors`}>
      {label}
    </button>
  )
}
