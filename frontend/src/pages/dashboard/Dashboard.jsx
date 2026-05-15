import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'

const STATUS_COLORS = {
  'Open':'#3b82f6','Assigned':'#8b5cf6','In Progress':'#f59e0b',
  'Pending Customer Response':'#f97316','Escalated':'#ef4444','Resolved':'#10b981','Closed':'#6b7280',
}

// Animated donut that fills up slice by slice on mount
const COLORS_LIST = ['#3b82f6','#8b5cf6','#f59e0b','#f97316','#ef4444','#10b981','#6b7280']

function AnimatedDonut({ data }) {
  const [progress, setProgress] = useState(0)
  const size = 180
  const strokeWidth = 22
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.value, 0)

  useEffect(() => {
    setProgress(0)
    const start = Date.now()
    const duration = 1600
    const animate = () => {
      const elapsed = Date.now() - start
      const p = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3)
      setProgress(eased)
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [data.length])

  let offset = 0
  const slices = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0
    const dashLen = circumference * pct * progress
    const gapLen  = circumference - dashLen
    const rotate  = offset * 360 - 90
    offset += pct
    return { dashLen, gapLen, rotate, color: STATUS_COLORS[d.name] || COLORS_LIST[i % COLORS_LIST.length], name: d.name, value: d.value }
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {/* Slices */}
          {slices.map((s, i) => (
            <circle key={i} cx={size/2} cy={size/2} r={radius} fill="none"
              stroke={s.color} strokeWidth={strokeWidth}
              strokeDasharray={`${s.dashLen} ${s.gapLen}`}
              strokeDashoffset={0}
              transform={`rotate(${s.rotate} ${size/2} ${size/2})`}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.05s linear' }}
            />
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-gray-900">{total}</p>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</p>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.name] || COLORS_LIST[i % COLORS_LIST.length] }} />
            <span className="text-[10px] text-gray-500 truncate">{d.name}</span>
            <span className="text-[10px] font-bold text-gray-700 ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const StatCard = ({ label, value, sub, icon, iconBg, iconText, accent }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-md transition-all duration-200 overflow-hidden`}>
    <div className={`h-0.5 w-full ${accent}`} />
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-black text-gray-900 leading-none">{value ?? '—'}</p>
        </div>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <svg className={`h-4 w-4 ${iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {icon}
          </svg>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">{sub}</p>
    </div>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="h-10 w-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  const t       = data?.totals || {}
  const pieData = (data?.byStatus || []).map(s => ({ name: s.status, value: Number(s.count) }))
  const catData = (data?.byCategory || []).map(c => ({ name: c.category, complaints: Number(c.count) }))
  const trend   = (data?.monthlyTrend || []).map(m => ({
    month: m.month.split(' ')[0],
    Total: Number(m.total),
    Resolved: Number(m.resolved),
  }))

  const statCards = [
    {
      label: 'Total Complaints', value: t.total, sub: 'All time',
      accent: 'bg-primary-500', iconBg: 'bg-primary-50', iconText: 'text-primary-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    },
    {
      label: 'Open', value: t.open, sub: 'Awaiting action',
      accent: 'bg-blue-500', iconBg: 'bg-blue-50', iconText: 'text-blue-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />,
    },
    {
      label: 'Resolved', value: t.resolved, sub: 'Successfully closed',
      accent: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      label: 'Escalated', value: t.escalated, sub: 'Needs attention',
      accent: 'bg-red-400', iconBg: 'bg-red-50', iconText: 'text-red-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />,
    },
    {
      label: 'In Progress', value: t.in_progress, sub: 'Being worked on',
      accent: 'bg-amber-400', iconBg: 'bg-amber-50', iconText: 'text-amber-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />,
    },
    {
      label: 'SLA Breaches', value: t.sla_breaches, sub: 'Overdue',
      accent: 'bg-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      label: 'SLA Compliance', value: `${data?.slaCompliance ?? 100}%`, sub: 'Within SLA',
      accent: 'bg-teal-500', iconBg: 'bg-teal-50', iconText: 'text-teal-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
    },
    {
      label: 'Avg Resolution', value: data?.avgResolutionHours ? `${data.avgResolutionHours}h` : 'N/A', sub: 'Average time',
      accent: 'bg-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Here's what's happening with your complaints today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400 bg-white px-4 py-2 rounded-xl shadow-card border border-gray-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card, i) => <StatCard key={i} {...card} />)}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Monthly Complaint Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months overview</p>
            </div>
          </div>
          {trend.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-gray-300">
              <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              <p className="text-sm">No data yet — submit some complaints!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Area type="monotone" dataKey="Total"    stroke="#6366f1" strokeWidth={2.5} fill="url(#totalGrad)"    dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" />
                <Area type="monotone" dataKey="Resolved" stroke="#10b981" strokeWidth={2.5} fill="url(#resolvedGrad)" dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1800} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900">Status Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">Current distribution</p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300 text-sm">No data yet</div>
          ) : (
            <AnimatedDonut data={pieData} />
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By Category */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900">Complaints by Category</h3>
            <p className="text-xs text-gray-400 mt-0.5">Top complaint types</p>
          </div>
          {catData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={115} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="complaints" fill="#6366f1" radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Agent Performance */}
        {['Admin','Supervisor'].includes(user?.role) ? (
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-gray-900">Agent Performance</h3>
              <p className="text-xs text-gray-400 mt-0.5">Resolution rate per agent</p>
            </div>
            {!data?.agentPerformance?.length ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No agent data yet</div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-56 pr-1">
                {data.agentPerformance.map((agent, i) => {
                  const rate = agent.total_assigned > 0 ? Math.round((agent.resolved / agent.total_assigned) * 100) : 0
                  const color = rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm shrink-0 border-2 border-primary-100">
                        {agent.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">{agent.name}</span>
                          <span className="text-xs text-gray-500 ml-2 shrink-0">{agent.resolved}/{agent.total_assigned}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {rate}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Need help?</h3>
              <p className="text-primary-200 text-sm">Submit a complaint and our support team will get back to you quickly.</p>
            </div>
            <div className="space-y-3 mt-6">
              <Link to="/new-complaint" className="flex items-center justify-center gap-2 w-full bg-white text-primary-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-primary-50 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Submit New Complaint
              </Link>
              <Link to="/my-complaints" className="flex items-center justify-center gap-2 w-full bg-primary-500/30 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-primary-500/40 transition-colors">
                View My Complaints
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Recent Complaints */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Recent Complaints</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest submitted complaints</p>
          </div>
          <Link to={user?.role === 'Customer' ? '/my-complaints' : '/complaints'}
            className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors bg-primary-50 px-3 py-1.5 rounded-lg">
            View all →
          </Link>
        </div>
        {!data?.recentComplaints?.length ? (
          <div className="text-center py-12">
            <svg className="h-12 w-12 mx-auto text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-medium text-gray-400">No complaints yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentComplaints.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`${user?.role === 'Customer' ? '/my-complaints' : '/complaints'}/${c.id}`}
                        className="font-mono text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 px-2 py-0.5 rounded-md">
                        {c.complaint_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-gray-800 font-medium truncate">{c.title}</p>
                      {user?.role !== 'Customer' && <p className="text-xs text-gray-400 mt-0.5">{c.customer_name}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{c.category}</td>
                    <td className="px-5 py-3.5"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </td>
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
