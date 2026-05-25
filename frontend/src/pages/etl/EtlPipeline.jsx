import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'

const STATUS_STYLES = {
  success: 'bg-green-100 text-green-700 border border-green-200',
  failed:  'bg-red-100  text-red-700  border border-red-200',
  partial: 'bg-amber-100 text-amber-700 border border-amber-200',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
      {status ?? 'unknown'}
    </span>
  )
}

function StatCard({ label, value, accent, icon }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${accent} p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function duration(sec) {
  if (!sec) return '—'
  return `${parseFloat(sec).toFixed(2)}s`
}

export default function EtlPipeline() {
  const [runs,      setRuns]      = useState([])
  const [datasets,  setDatasets]  = useState([])
  const [selected,  setSelected]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const [running,   setRunning]   = useState(false)
  const [output,    setOutput]    = useState(null)   // last run result
  const [error,     setError]     = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [runsRes, dsRes] = await Promise.all([
        api.get('/etl/runs'),
        api.get('/etl/datasets'),
      ])
      setRuns(runsRes.data.data || [])
      const ds = dsRes.data.data || []
      setDatasets(ds)
      if (ds.length && !selected) setSelected(ds[0].name)
    } catch (e) {
      setError('Could not load ETL data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => { loadData() }, [])   // eslint-disable-line

  const handleRun = async () => {
    setRunning(true)
    setOutput(null)
    setError(null)
    try {
      const res = await api.post('/etl/run', { filename: selected || undefined })
      setOutput(res.data)
      await loadData()
    } catch (e) {
      const msg = e.response?.data?.message || e.message
      setError(msg)
      setOutput(e.response?.data || null)
    } finally {
      setRunning(false)
    }
  }

  // Summary stats from run history
  const totalRuns      = runs.length
  const successRuns    = runs.filter(r => r.status === 'success').length
  const totalLoaded    = runs.reduce((s, r) => s + (r.records_loaded || 0), 0)
  const lastRun        = runs[0] || null

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ETL Pipeline</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Extract · Transform · Load — import complaint datasets into the analytics tables
          </p>
        </div>
        {lastRun && (
          <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            Last run: <span className="font-medium text-gray-600">{fmt(lastRun.run_at)}</span>
            {' · '}
            <StatusBadge status={lastRun.status} />
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Runs"     value={totalRuns}                                  accent="border-indigo-500" icon="🔄" />
        <StatCard label="Successful"     value={successRuns}                                accent="border-green-500"  icon="✅" />
        <StatCard label="Records Loaded" value={totalLoaded.toLocaleString()}               accent="border-blue-500"   icon="📦" />
        <StatCard label="Datasets Found" value={datasets.length}                            accent="border-amber-500"  icon="📄" />
      </div>

      {/* Run panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">Run ETL Pipeline</h2>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Dataset picker */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Dataset file
            </label>
            {datasets.length > 0 ? (
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {datasets.map(d => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({(d.size / 1024).toFixed(1)} KB)
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
                No datasets found in <code className="text-xs">/datasets</code> folder
              </div>
            )}
          </div>

          {/* Run button */}
          <div className="flex items-end">
            <button
              onClick={handleRun}
              disabled={running || datasets.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow transition-all"
            >
              {running ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                  </svg>
                  Running…
                </>
              ) : (
                <>▶ Run Pipeline</>
              )}
            </button>
          </div>
        </div>

        {/* Pipeline diagram */}
        <div className="flex items-center gap-2 py-3 px-4 bg-gray-50 rounded-xl border border-gray-100 text-xs font-medium text-gray-500 flex-wrap">
          {['📂 Extract CSV', '→', '🔄 Transform & Validate', '→', '🗄️ Load to MySQL', '→', '📊 Analytics Ready'].map((s, i) => (
            <span key={i} className={s === '→' ? 'text-gray-300' : 'bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 shadow-sm'}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Output panel */}
      {output && (
        <div className={`rounded-xl border p-5 space-y-3 ${output.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-sm ${output.success ? 'text-green-800' : 'text-red-800'}`}>
              {output.success ? '✅ Pipeline completed successfully' : '❌ Pipeline failed'}
            </h3>
            {output.data?.duration && (
              <span className="text-xs text-gray-400">Completed in {output.data.duration}s</span>
            )}
          </div>
          {output.data?.run && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Extracted',    value: output.data.run.records_extracted },
                { label: 'Transformed',  value: output.data.run.records_transformed },
                { label: 'Loaded',       value: output.data.run.records_loaded },
                { label: 'Duration',     value: duration(output.data.run.duration_seconds) },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                  <p className="text-gray-400 uppercase tracking-wide">{s.label}</p>
                  <p className="font-bold text-gray-800 text-base mt-0.5">{s.value ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
          {output.data?.output && (
            <pre className="text-xs bg-gray-900 text-green-300 rounded-lg p-4 overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
              {output.data.output}
            </pre>
          )}
          {output.data?.error && (
            <pre className="text-xs bg-gray-900 text-red-300 rounded-lg p-4 overflow-x-auto max-h-32 overflow-y-auto leading-relaxed">
              {output.data.error}
            </pre>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && !output && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="font-semibold">Error: </span>{error}
        </div>
      )}

      {/* Run history table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Run History</h3>
          <span className="text-xs text-gray-400">{runs.length} runs total</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-3">🗃️</p>
            <p className="font-medium text-gray-600">No ETL runs yet</p>
            <p className="text-sm mt-1">Click <strong>Run Pipeline</strong> above to start your first import</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Run At', 'Source File', 'Extracted', 'Transformed', 'Loaded', 'Duration', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{r.id}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(r.run_at)}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.source_file || '—'}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{r.records_extracted ?? '—'}</td>
                    <td className="px-4 py-3 text-indigo-600 font-medium">{r.records_transformed ?? '—'}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{r.records_loaded ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{duration(r.duration_seconds)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Datasets info */}
      {datasets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Available Datasets</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {datasets.map(d => (
              <div key={d.name} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📄</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{d.name}</p>
                    <p className="text-xs text-gray-400">{(d.size / 1024).toFixed(1)} KB · Last modified {fmt(d.modified)}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelected(d.name); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    selected === d.name
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {selected === d.name ? '✓ Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
