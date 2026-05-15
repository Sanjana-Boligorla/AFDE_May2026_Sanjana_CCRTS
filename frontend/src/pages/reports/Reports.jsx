import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../../api/axios'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'

export default function Reports() {
  const [data, setData]         = useState(null)
  const [breaches, setBreaches] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/sla-breaches'),
    ]).then(([stats, sla]) => {
      setData(stats.data.data)
      setBreaches(sla.data.data.breaches)
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="h-10 w-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  const t = data?.totals || {}
  const resolutionRate = t.total > 0 ? Math.round(((Number(t.resolved) + Number(t.closed)) / t.total) * 100) : 0
  const priorityData = (data?.byPriority || []).map(p => ({ name: p.priority, count: Number(p.count) }))
  const agentData = (data?.agentPerformance || []).map(a => ({
    name: a.name.split(' ')[0],
    Resolved: Number(a.resolved),
    Assigned: Number(a.total_assigned),
  }))

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1 text-sm">Comprehensive overview of complaint management performance.</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Complaints',   value: t.total,            color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Resolution Rate',    value: `${resolutionRate}%`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'SLA Compliance',     value: `${data?.slaCompliance ?? 100}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Avg Resolution',     value: data?.avgResolutionHours ? `${data.avgResolutionHours}h` : 'N/A', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => (
          <div key={k.label} className={`card p-5 ${k.bg}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Agent Performance */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Performance</h3>
          {agentData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No agent data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="Assigned" fill="#e0e7ff" radius={[4,4,0,0]} />
                <Bar dataKey="Resolved" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Priority */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Complaints by Priority</h3>
          {priorityData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[6,6,0,0]}
                  fill="#f59e0b"
                  label={{ position: 'top', fontSize: 11, fill: '#6b7280' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SLA Breaches Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">SLA Breaches</h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${breaches.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {breaches.length} active {breaches.length === 1 ? 'breach' : 'breaches'}
          </span>
        </div>

        {breaches.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm font-medium text-gray-600">No SLA breaches!</p>
            <p className="text-xs text-gray-400 mt-1">All complaints are within their SLA timelines.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-red-50/50">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Hours Overdue</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {breaches.map(b => (
                  <tr key={b.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        {b.complaint_number}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      <p className="text-gray-800 font-medium truncate">{b.title}</p>
                    </td>
                    <td className="px-3 py-3"><PriorityBadge priority={b.priority} /></td>
                    <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-3 py-3 text-gray-500">{b.agent_name || <span className="text-red-400 font-medium">Unassigned</span>}</td>
                    <td className="px-3 py-3">
                      <span className="text-red-600 font-semibold">{b.hours_overdue}h overdue</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{b.customer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
