import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export const useComplaints = (filters = {}) => {
  const [complaints, setComplaints] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 })
  const [loading, setLoading] = useState(true)

  const fetchComplaints = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const { data } = await api.get('/complaints', { params: { ...filters, ...params } })
      setComplaints(data.data.complaints)
      setPagination(data.data.pagination)
    } catch (err) {
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchComplaints() }, [fetchComplaints])

  return { complaints, pagination, loading, refetch: fetchComplaints }
}

export const useComplaintStats = () => {
  const [stats, setStats] = useState(null)
  const [recentComplaints, setRecentComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/complaints/stats')
      .then(({ data }) => {
        setStats(data.data.stats)
        setRecentComplaints(data.data.recentComplaints)
      })
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  return { stats, recentComplaints, loading }
}
