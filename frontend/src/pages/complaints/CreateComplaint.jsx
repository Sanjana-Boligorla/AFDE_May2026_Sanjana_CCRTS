import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function CreateComplaint() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [files, setFiles]           = useState([])
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { priority: 'Medium' }
  })

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data.categories)).catch(() => {})
  }, [])

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => formData.append(k, v))
      files.forEach(f => formData.append('attachments', f))

      const res = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Complaint ${res.data.data.complaintNumber} registered!`)
      navigate('/my-complaints')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files)
    if (selected.length + files.length > 5) {
      toast.error('Maximum 5 attachments allowed')
      return
    }
    setFiles(prev => [...prev, ...selected])
  }

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx))

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <Link to="/my-complaints" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Register a Complaint</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details below and we'll get back to you shortly.</p>
      </div>

      <div className="card p-6 shadow-card-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Complaint Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Brief summary of your issue"
              className={`input-field ${errors.title ? 'input-error' : ''}`}
              {...register('title', { required: 'Title is required', maxLength: { value: 255, message: 'Max 255 characters' } })}
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className={`input-field ${errors.category_id ? 'input-error' : ''}`}
                {...register('category_id', { required: 'Category is required' })}
              >
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category_id && <p className="text-xs text-red-600 mt-1">{errors.category_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select className="input-field" {...register('priority')}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="Please describe your issue in detail — include any relevant dates, order numbers, or reference IDs..."
              className={`input-field resize-none ${errors.description ? 'input-error' : ''}`}
              {...register('description', { required: 'Description is required', minLength: { value: 20, message: 'At least 20 characters required' } })}
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Attachments <span className="text-gray-400 font-normal">(optional, max 5 files, 5MB each)</span>
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group">
              <svg className="h-8 w-8 text-gray-300 group-hover:text-primary-400 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-sm text-gray-400 group-hover:text-primary-600 transition-colors">Click to upload files</span>
              <span className="text-xs text-gray-300 mt-0.5">Images, PDF, DOC, TXT</span>
              <input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFiles} />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="text-sm text-gray-700 truncate max-w-xs">{f.name}</span>
                      <span className="text-xs text-gray-400">({(f.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 border border-blue-100">
            <p className="font-semibold mb-1">📋 What happens next?</p>
            <p>Your complaint will be assigned a unique ID and reviewed by our support team. You'll receive email notifications as the status updates.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link to="/my-complaints" className="btn-secondary flex-1 text-center">Cancel</Link>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
