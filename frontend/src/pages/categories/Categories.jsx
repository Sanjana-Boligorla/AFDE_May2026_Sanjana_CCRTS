import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Modal from '../../components/common/Modal'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/categories')
      setCategories(data.data.categories)
    } catch { toast.error('Failed to load categories') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCategories() }, [])

  const handleCreate = async (data) => {
    setSubmitting(true)
    try {
      await api.post('/categories', data)
      toast.success('Category created')
      setModal(false)
      reset()
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category')
    } finally { setSubmitting(false) }
  }

  const toggleCategory = async (cat) => {
    try {
      await api.put(`/categories/${cat.id}`, { is_active: !cat.is_active })
      toast.success(`Category ${cat.is_active ? 'deactivated' : 'activated'}`)
      fetchCategories()
    } catch { toast.error('Action failed') }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage complaint categories</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Category
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className={`card p-5 transition-all ${!cat.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {cat.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mt-3 mb-1">{cat.name}</h3>
              {cat.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{cat.description}</p>}
              <button onClick={() => toggleCategory(cat)}
                className={`text-xs font-medium transition-colors mt-1 ${cat.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                {cat.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); reset() }} title="New Category" size="sm">
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input className={`input-field ${errors.name ? 'input-error' : ''}`} placeholder="e.g. Billing Issues"
              {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={2} className="input-field resize-none" placeholder="Brief description..."
              {...register('description')} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setModal(false); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
