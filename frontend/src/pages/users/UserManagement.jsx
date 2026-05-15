import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import EmptyState from '../../components/common/EmptyState'

const ROLES = ['Admin','Supervisor','Agent','Customer']
const ROLE_COLORS = {
  Admin:      'bg-red-100 text-red-700',
  Supervisor: 'bg-purple-100 text-purple-700',
  Agent:      'bg-blue-100 text-blue-700',
  Customer:   'bg-green-100 text-green-700',
}

export default function UserManagement() {
  const [users, setUsers]       = useState([])
  const [pagination, setPagination] = useState({ total:0, page:1, pages:1, limit:15 })
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState({ role:'', search:'', page:1 })
  const [createModal, setCreateModal] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [showPass, setShowPass]       = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const fetchUsers = async (params = filters) => {
    setLoading(true)
    try {
      const clean = Object.fromEntries(Object.entries(params).filter(([,v]) => v !== ''))
      const { data } = await api.get('/users', { params: clean })
      setUsers(data.data.users)
      setPagination(data.data.pagination)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleFilter = (key, val) => {
    const updated = { ...filters, [key]: val, page: 1 }
    setFilters(updated)
    fetchUsers(updated)
  }

  const handleCreateUser = async (data) => {
    setSubmitting(true)
    try {
      await api.post('/users', data)
      toast.success('User created successfully')
      setCreateModal(false)
      reset()
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user')
    } finally { setSubmitting(false) }
  }

  const toggleActive = async (user) => {
    try {
      if (user.is_active) {
        await api.delete(`/users/${user.id}`)
        toast.success(`${user.name} deactivated`)
      } else {
        await api.put(`/users/${user.id}`, { is_active: true })
        toast.success(`${user.name} activated`)
      }
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total users</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search by name or email..." value={filters.search}
              onChange={e => handleFilter('search', e.target.value)}
              className="input-field pl-9 py-2 text-sm" />
          </div>
        </div>
        <select value={filters.role} onChange={e => handleFilter('role', e.target.value)}
          className="input-field py-2 text-sm w-40">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search or role filter." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Login</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => toggleActive(u)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100">
              <Pagination {...pagination} onPageChange={p => { const u = {...filters, page:p}; setFilters(u); fetchUsers(u); }} />
            </div>
          </>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={createModal} onClose={() => { setCreateModal(false); reset() }} title="Create New User">
        <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input className={`input-field ${errors.name ? 'input-error' : ''}`} placeholder="John Smith"
                {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" className={`input-field ${errors.email ? 'input-error' : ''}`} placeholder="user@example.com"
                {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select className="input-field" {...register('role', { required: true })}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input className="input-field" placeholder="+1-555-0000" {...register('phone')} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min 8 chars, uppercase, number"
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setCreateModal(false); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
