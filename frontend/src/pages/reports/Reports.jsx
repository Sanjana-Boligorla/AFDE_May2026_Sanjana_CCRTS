import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts'
import api from '../../api/axios'

const PRIORITY_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#22c55e' }
const MONTH_SHORT = m => {
  const [y, mo] = m.split('-')
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1] + ' ' + y.slice(2)
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${accent} p-5`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active ? 'bg-primary-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'
      }`}>
      {label}
    </button>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function Reports() {
  const [activeTab, setActiveTab]   = useState('summary')
  const [summary,   setSummary]     = useState(null)
  const [sla,       setSla]         = useState(null)
  const [categories, setCategories] = useState(null)
  const [agents,    setAgents]      = useState(null)
  const [trends,    setTrends]      = useState(null)
  const [loading,   setLoading]     = useState(true)
  const [error,     setError]       = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/sla'),
      api.get('/analytics/categories'),
      api.get('/analytics/agents'),
      api.get('/analytics/resolution-trends'),
    ])
      .then(([s, sl, cat, ag, tr]) => {
        setSummary(s.data.data)
        setSla(sl.data.data)
        setCategories(cat.data.data)
        setAgents(ag.data.data)
        setTrends(tr.data.data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="h-10 w-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-40 text-center">
      <p className="text-4xl mb-3">⚠️</p>
      <p className="text-lg font-semibold text-gray-700">Analytics data not available</p>
      <p className="text-sm text-gray-400 mt-2">
        Run the ETL pipeline first:
      </p>
      <code className="mt-2 bg-gray-100 px-3 py-1.5 rounded-lg text-xs text-gray-600">
        cd etl &amp;&amp; python etl_pipeline.py
      </code>
    </div>
  )

  const tot = summary?.totals || {}
  const monthly = (summary?.monthly || []).map(m => ({
    ...m,
    month: MONTH_SHORT(m.report_month),
    total_resolved: Number(m.resolved_count) + Number(m.closed_count),
  }))

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500 mt-1 text-sm">ETL-powered analytics from complaint dataset</p>
        </div>
        {trends?.etlRuns?.[0] && (
          <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            Last ETL run: <span className="font-medium text-gray-600">
              {new Date(trends.etlRuns[0].run_at).toLocaleString()}
            </span>
            {' · '}
            <span className="text-green-600 font-medium">{trends.etlRuns[0].records_loaded} records</span>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Complaints"  value={tot.total_complaints?.toLocaleString()} sub="across all months"          accent="border-blue-500"   />
        <StatCard label="Resolved"           value={tot.resolved_count?.toLocaleString()}   sub={`${Math.round(tot.resolved_count/tot.total_complaints*100)}% resolution rate`} accent="border-green-500"  />
        <StatCard label="SLA Compliance"     value={`${tot.avg_sla_compliance}%`}            sub={`${tot.sla_breach_count} total breaches`}              accent="border-purple-500" />
        <StatCard label="Avg Resolution"     value={`${tot.avg_resolution_hours}h`}          sub="average across all complaints"                           accent="border-amber-500"  />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1 w-fit flex-wrap">
        {[
          { id: 'summary',    label: 'Monthly Trends'    },
          { id: 'sla',        label: 'SLA Report'        },
          { id: 'categories', label: 'Categories'        },
          { id: 'agents',     label: 'Agent Performance' },
        ].map(t => (
          <Tab key={t.id} label={t.label} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
        ))}
      </div>

      {/* ── TAB: Monthly Trends ─────────────────────────── */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Monthly Complaint Volume</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="total_complaints" name="Total"    stroke="#6366f1" fill="url(#gradTotal)"    strokeWidth={2} dot={{ r: 4 }} />
                <Area type="monotone" dataKey="total_resolved"   name="Resolved" stroke="#22c55e" fill="url(#gradResolved)" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">SLA Compliance % by Month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="sla_compliance_rate" name="SLA %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 5, fill: '#8b5cf6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Avg Resolution Time (hours)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg_resolution_hours" name="Avg Hours" fill="#f59e0b" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Monthly Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Month','Total','Resolved','Breaches','SLA %','Avg Resolution','Avg Rating'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthly.map(m => (
                    <tr key={m.report_month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-700">{m.month}</td>
                      <td className="px-4 py-3 text-gray-600">{m.total_complaints}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{m.total_resolved}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">{m.sla_breach_count}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${parseFloat(m.sla_compliance_rate) >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                          {parseFloat(m.sla_compliance_rate).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.avg_resolution_hours ? `${parseFloat(m.avg_resolution_hours).toFixed(1)}h` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{m.avg_satisfaction ? `⭐ ${parseFloat(m.avg_satisfaction).toFixed(1)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SLA Report ─────────────────────────────── */}
      {activeTab === 'sla' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Analysed"  value={sla?.stats?.total_complaints}                                          accent="border-blue-500"   />
            <StatCard label="SLA Breaches"    value={sla?.stats?.total_breaches}                                            accent="border-red-500"    />
            <StatCard label="Compliance Rate" value={`${sla?.stats?.compliance_rate ?? 0}%`}                               accent="border-green-500"  />
            <StatCard label="Avg Breach Time" value={sla?.stats?.avg_breach_hours ? `${sla.stats.avg_breach_hours}h` : '—'} accent="border-orange-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">SLA Breaches by Priority</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sla?.byPriority || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="priority" tick={{ fontSize: 12, fill: '#4b5563' }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="total"    name="Total"    fill="#e0e7ff" radius={[0,4,4,0]} />
                  <Bar dataKey="breaches" name="Breaches" fill="#ef4444" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Avg Resolution by Priority</h3>
              <div className="space-y-4 mt-2">
                {(trends?.byPriority || []).map(p => (
                  <div key={p.priority}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: PRIORITY_COLORS[p.priority] }}>{p.priority}</span>
                      <span className="text-gray-500">{p.avg_resolution_hours}h avg · {p.total} complaints</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((p.avg_resolution_hours / 80) * 100, 100)}%`, backgroundColor: PRIORITY_COLORS[p.priority] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Breached Complaints</h3>
              <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">
                {sla?.pagination?.total} total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-red-50">
                  <tr>
                    {['Complaint #','Category','Priority','Status','Agent','Resolution Time','Hours Over SLA','Rating'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(sla?.breachedComplaints || []).map(b => (
                    <tr key={b.complaint_number} className="hover:bg-red-50/40">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          {b.complaint_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.category}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: PRIORITY_COLORS[b.priority] + '20', color: PRIORITY_COLORS[b.priority] }}>
                          {b.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{b.status}</td>
                      <td className="px-4 py-3 text-gray-500">{b.assigned_agent || <span className="text-red-400">Unassigned</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{b.resolution_hours ? `${parseFloat(b.resolution_hours).toFixed(1)}h` : '—'}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{b.breach_hours ? `+${parseFloat(b.breach_hours).toFixed(1)}h` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{b.satisfaction_rating ? `⭐ ${b.satisfaction_rating}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Categories ─────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Total Complaints by Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categories?.byCategory || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#4b5563' }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total_complaints" name="Total" fill="#6366f1" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Resolved vs SLA Breaches</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categories?.byCategory || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#4b5563' }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="resolved_count"   name="Resolved" fill="#22c55e" radius={[0,6,6,0]} />
                  <Bar dataKey="sla_breach_count" name="Breaches" fill="#ef4444" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Category Performance Detail</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Category','Total','Resolved','Open','Escalated','SLA Breaches','Avg Resolution','Avg Rating'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(categories?.byCategory || []).map(c => (
                    <tr key={c.category} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-700">{c.category}</td>
                      <td className="px-4 py-3 text-gray-600">{c.total_complaints}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{c.resolved_count}</td>
                      <td className="px-4 py-3 text-blue-600">{c.open_count}</td>
                      <td className="px-4 py-3 text-orange-500">{c.escalated_count}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">{c.sla_breach_count}</td>
                      <td className="px-4 py-3 text-gray-600">{c.avg_resolution_hours ? `${c.avg_resolution_hours}h` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.avg_satisfaction ? `⭐ ${parseFloat(c.avg_satisfaction).toFixed(1)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Agent Performance ──────────────────────── */}
      {activeTab === 'agents' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Agent Resolved vs Assigned</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={agents?.agents || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="agent_name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="total_assigned" name="Assigned" fill="#e0e7ff" radius={[4,4,0,0]} />
                <Bar dataKey="total_resolved" name="Resolved" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(agents?.agents || []).map(a => {
              const resRate = parseFloat(a.resolution_rate || 0)
              const slaRate = parseFloat(a.sla_compliance_rate || 0)
              return (
                <div key={a.agent_name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                      {a.agent_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{a.agent_name}</p>
                      <p className="text-xs text-gray-400">{a.total_assigned} total assigned</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Resolution Rate</span>
                        <span className="font-semibold text-green-600">{resRate}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${resRate}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">SLA Compliance</span>
                        <span className={`font-semibold ${slaRate >= 70 ? 'text-purple-600' : 'text-red-500'}`}>{slaRate}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${slaRate >= 70 ? 'bg-purple-500' : 'bg-red-400'}`} style={{ width: `${slaRate}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400">Avg Time</p>
                      <p className="text-sm font-bold text-gray-700">{a.avg_resolution_hours ? `${a.avg_resolution_hours}h` : '—'}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-xs text-red-400">Escalated</p>
                      <p className="text-sm font-bold text-red-600">{a.total_escalated}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2">
                      <p className="text-xs text-yellow-500">Avg Rating</p>
                      <p className="text-sm font-bold text-yellow-600">{a.avg_satisfaction ? `⭐${parseFloat(a.avg_satisfaction).toFixed(1)}` : '—'}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Full Agent Statistics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Agent','Assigned','Resolved','Escalated','SLA Met','Breaches','Resolution %','SLA %','Avg Time','Rating'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(agents?.agents || []).map(a => (
                    <tr key={a.agent_name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-700">{a.agent_name}</td>
                      <td className="px-4 py-3 text-gray-600">{a.total_assigned}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{a.total_resolved}</td>
                      <td className="px-4 py-3 text-orange-500">{a.total_escalated}</td>
                      <td className="px-4 py-3 text-purple-600">{a.sla_met_count}</td>
                      <td className="px-4 py-3 text-red-500">{a.sla_breached_count}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">{parseFloat(a.resolution_rate).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-semibold text-purple-600">{parseFloat(a.sla_compliance_rate).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-gray-600">{a.avg_resolution_hours ? `${a.avg_resolution_hours}h` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{a.avg_satisfaction ? `⭐ ${parseFloat(a.avg_satisfaction).toFixed(1)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
