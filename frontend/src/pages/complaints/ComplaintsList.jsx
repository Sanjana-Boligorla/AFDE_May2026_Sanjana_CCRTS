import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import Pagination from '../../components/common/Pagination'
import EmptyState from '../../components/common/EmptyState'

const STATUSES  = ['Open','Assigned','In Progress','Pending Customer Response','Escalated','Resolved','Closed']
const PRIORITIES = ['Low','Medium','High','Critical']

export default function ComplaintsList() {
  const { user } = useAuth()
  const [complaints, setComplaints]   = useState([])
  const [pagination, setPagination]   = useState({ total:0, page:1, pages:1, limit:10 })
  const [loading, setLoading]         = useState(true)
  const [filters, setFilters]         = useState({ status:'', priority:'', search:'', page:1 })

  const fetchComplaints = async (params = filters) => {
    setLoading(true)
    try {
      const clean = Object.fromEntries(Object.entries(params).filter(([,v]) => v !== ''))
      const { data } = await api.get('/complaints', { params: clean })
      setComplaints(data.data.complaints)
      setPagination(data.data.pagination)
    } catch { toast.error('Failed to load complaints') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchComplaints() }, [])

  const handleFilter = (key, val) => {
    const updated = { ...filters, [key]: val, page: 1 }
    setFilters(updated)
    fetchComplaints(updated)
  }

  const handlePage = (p) => {
    const updated = { ...filters, page: p }
    setFilters(updated)
    fetchComplaints(updated)
  }

  const clearFilters = () => {
    const reset = { status:'', priority:'', search:'', page:1 }
    setFilters(reset)
    fetchComplaints(reset)
  }

  const title = user.role === 'Agent' ? 'My Assigned Complaints' : 'All Complaints'

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total complaints</p>
        </div>
        {(user.role === 'Admin' || user.role === 'Customer') && (
          <Link to="/new-complaint" className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Complaint
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search complaints..."
              value={filters.search}
              onChange={e => handleFilter('search', e.target.value)}
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
        </div>
        <select value={filters.status} onChange={e => handleFilter('status', e.target.value)}
          className="input-field py-2 text-sm w-44">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={e => handleFilter('priority', e.target.value)}
          className="input-field py-2 text-sm w-36">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        {(filters.status || filters.priority || filters.search) && (
          <button onClick={clearFilters} className="btn-secondary py-2 text-sm">
            Clear
          </button>
        )}
        <button onClick={() => fetchComplaints()} className="btn-secondary py-2 text-sm ml-auto">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : complaints.length === 0 ? (
          <EmptyState
            title="No complaints found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    {user.role !== 'Customer' && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    )}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    {user.role !== 'Customer' && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                    )}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {complaints.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                          {c.complaint_number}
                        </span>
                        {c.sla_breach && (
                          <span className="ml-1 text-xs text-red-600 font-medium">⚠ SLA</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{c.title}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">{c.category}</td>
                      {user.role !== 'Customer' && (
                        <td className="px-4 py-3.5 text-gray-700">{c.customer_name}</td>
                      )}
                      <td className="px-4 py-3.5"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                      {user.role !== 'Customer' && (
                        <td className="px-4 py-3.5 text-gray-500">{c.agent_name || <span className="text-gray-300">Unassigned</span>}</td>
                      )}
                      <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link to={`/complaints/${c.id}`} className="text-primary-600 hover:text-primary-800 font-medium text-xs transition-colors">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <Pagination {...pagination} onPageChange={handlePage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
