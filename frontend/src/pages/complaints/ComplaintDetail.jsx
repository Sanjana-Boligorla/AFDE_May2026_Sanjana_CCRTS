import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge, PriorityBadge } from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'

const STATUSES = ['Open','Assigned','In Progress','Pending Customer Response','Escalated','Resolved','Closed']

const timeAgo = (date) => {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}

export default function ComplaintDetail() {
  const { id }    = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [agents, setAgents]       = useState([])
  const [statusModal, setStatusModal]   = useState(false)
  const [assignModal, setAssignModal]   = useState(false)
  const [feedbackModal, setFeedbackModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating]       = useState(5)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const assignForm = useForm()
  const feedbackForm = useForm()

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/complaints/${id}`)
      setData(res.data.data)
    } catch { toast.error('Complaint not found'); navigate(-1) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchDetail()
    if (['Admin','Supervisor'].includes(user.role)) {
      api.get('/users/agents').then(r => setAgents(r.data.data.agents)).catch(() => {})
    }
  }, [id])

  const handleStatusUpdate = async (formData) => {
    setSubmitting(true)
    try {
      await api.put(`/complaints/${id}/status`, formData)
      toast.success('Status updated successfully')
      setStatusModal(false)
      reset()
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally { setSubmitting(false) }
  }

  const handleAssign = async (formData) => {
    setSubmitting(true)
    try {
      await api.put(`/complaints/${id}/assign`, { agent_id: formData.agent_id })
      toast.success('Complaint assigned successfully')
      setAssignModal(false)
      assignForm.reset()
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed')
    } finally { setSubmitting(false) }
  }

  const handleFeedback = async (formData) => {
    setSubmitting(true)
    try {
      await api.post(`/complaints/${id}/feedback`, { ...formData, rating })
      toast.success('Feedback submitted! Complaint closed.')
      setFeedbackModal(false)
      feedbackForm.reset()
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Feedback failed')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="h-10 w-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  if (!data) return null
  const { complaint, history, attachments, feedback } = data

  return (
    <div className="animate-fade-in space-y-5 max-w-5xl">
      {/* Back + Header */}
      <div>
        <Link to="/complaints" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to complaints
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-lg">
                {complaint.complaint_number}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              {complaint.sla_breach && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                  ⚠ SLA Breached
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-2">{complaint.title}</h1>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {['Admin','Supervisor'].includes(user.role) && complaint.status !== 'Closed' && (
              <>
                <button onClick={() => setAssignModal(true)} className="btn-secondary text-sm py-2">
                  Assign Agent
                </button>
                <button onClick={() => setStatusModal(true)} className="btn-primary text-sm py-2">
                  Update Status
                </button>
              </>
            )}
            {user.role === 'Agent' && !['Resolved','Closed'].includes(complaint.status) && (
              <button onClick={() => setStatusModal(true)} className="btn-primary text-sm py-2">
                Update Status
              </button>
            )}
            {user.role === 'Customer' && complaint.status === 'Resolved' && !feedback && (
              <button onClick={() => setFeedbackModal(true)} className="btn-primary text-sm py-2">
                ⭐ Submit Feedback
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{complaint.description}</p>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Attachments ({attachments.length})</h3>
              <div className="space-y-2">
                {attachments.map(a => (
                  <a key={a.id} href={`/uploads/${a.file_name}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                    <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-primary-600">{a.original_name}</p>
                      <p className="text-xs text-gray-400">{(a.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Activity History */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity History</h3>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-5">
                {history.map((h, i) => (
                  <div key={h.id} className="flex gap-4 relative">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 ${i === history.length - 1 ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${i === history.length - 1 ? 'bg-primary-600' : 'bg-gray-400'}`} />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{h.updated_by_name}</span>
                        {h.old_status && (
                          <span className="text-xs text-gray-400">
                            changed status from <strong>{h.old_status}</strong> to <strong>{h.new_status}</strong>
                          </span>
                        )}
                        {!h.old_status && <span className="text-xs text-gray-400">created this complaint</span>}
                        <span className="text-xs text-gray-400 ml-auto">{timeAgo(h.created_at)}</span>
                      </div>
                      {h.comment && (
                        <div className="mt-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-gray-200">
                          {h.comment}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="card p-5 border-l-4 border-green-400">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Feedback</h3>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map(n => (
                  <svg key={n} className={`h-5 w-5 ${n <= feedback.rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-sm font-semibold text-gray-700 ml-1">{feedback.rating}/5</span>
              </div>
              {feedback.comments && <p className="text-sm text-gray-600">{feedback.comments}</p>}
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Category</dt>
                <dd className="font-medium text-gray-800">{complaint.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Priority</dt>
                <dd><PriorityBadge priority={complaint.priority} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Status</dt>
                <dd><StatusBadge status={complaint.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Created</dt>
                <dd className="text-gray-600">{new Date(complaint.created_at).toLocaleString()}</dd>
              </div>
              {complaint.resolved_at && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Resolved</dt>
                  <dd className="text-gray-600">{new Date(complaint.resolved_at).toLocaleString()}</dd>
                </div>
              )}
              {complaint.sla_due_at && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">SLA Due</dt>
                  <dd className={`font-medium ${new Date(complaint.sla_due_at) < new Date() ? 'text-red-600' : 'text-gray-600'}`}>
                    {new Date(complaint.sla_due_at).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                {complaint.customer_name?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{complaint.customer_name}</p>
                <p className="text-xs text-gray-500">{complaint.customer_email}</p>
              </div>
            </div>
          </div>

          {complaint.agent_name && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned Agent</h3>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm">
                  {complaint.agent_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{complaint.agent_name}</p>
                  <p className="text-xs text-gray-500">{complaint.agent_email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal isOpen={statusModal} onClose={() => setStatusModal(false)} title="Update Complaint Status">
        <form onSubmit={handleSubmit(handleStatusUpdate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Status</label>
            <select className="input-field" {...register('status', { required: 'Status is required' })}>
              <option value="">Select status...</option>
              {STATUSES.filter(s => s !== complaint.status).map(s => <option key={s}>{s}</option>)}
            </select>
            {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment (optional)</label>
            <textarea rows={3} className="input-field resize-none" placeholder="Add a note..." {...register('comment')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStatusModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={assignModal} onClose={() => setAssignModal(false)} title="Assign to Agent">
        <form onSubmit={assignForm.handleSubmit(handleAssign)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Agent</label>
            <select className="input-field" {...assignForm.register('agent_id', { required: true })}>
              <option value="">Choose an agent...</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.active_complaints} active)
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAssignModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Feedback Modal */}
      <Modal isOpen={feedbackModal} onClose={() => setFeedbackModal(false)} title="Rate Your Experience">
        <form onSubmit={feedbackForm.handleSubmit(handleFeedback)} className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">How satisfied were you with the resolution?</p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <svg className={`h-10 w-10 transition-colors ${n <= rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">{['','Poor','Fair','Good','Very Good','Excellent'][rating]}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Comments (optional)</label>
            <textarea rows={3} className="input-field resize-none" placeholder="Tell us more..." {...feedbackForm.register('comments')} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setFeedbackModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
