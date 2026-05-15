import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import clsx from 'clsx'

const TYPE_ICON = {
  complaint_created:  { bg: 'bg-blue-100',   text: 'text-blue-600',   emoji: '📋' },
  complaint_assigned: { bg: 'bg-violet-100', text: 'text-violet-600', emoji: '👤' },
  status_updated:     { bg: 'bg-amber-100',  text: 'text-amber-600',  emoji: '🔄' },
  escalation:         { bg: 'bg-red-100',    text: 'text-red-600',    emoji: '🚨' },
  resolution:         { bg: 'bg-green-100',  text: 'text-green-600',  emoji: '✅' },
  sla_breach:         { bg: 'bg-red-100',    text: 'text-red-600',    emoji: '⚠️' },
  feedback:           { bg: 'bg-yellow-100', text: 'text-yellow-600', emoji: '⭐' },
}

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationPanel() {
  const [open, setOpen]             = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const panelRef = useRef(null)

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.data.notifications)
      setUnreadCount(data.data.unreadCount)
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await api.put('/notifications/read-all')
    fetchNotifications()
  }

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-slide-up overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const icon = TYPE_ICON[n.type] || TYPE_ICON.status_updated
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    className={clsx(
                      'flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
                      !n.is_read && 'bg-primary-50/40'
                    )}
                  >
                    <div className={clsx('h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm', icon.bg)}>
                      {icon.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm leading-tight', !n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
