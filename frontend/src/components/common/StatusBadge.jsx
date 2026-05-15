import clsx from 'clsx'

const STATUS_STYLES = {
  'Open':                       'bg-blue-100 text-blue-700',
  'Assigned':                   'bg-violet-100 text-violet-700',
  'In Progress':                'bg-amber-100 text-amber-700',
  'Pending Customer Response':  'bg-orange-100 text-orange-700',
  'Escalated':                  'bg-red-100 text-red-700',
  'Resolved':                   'bg-green-100 text-green-700',
  'Closed':                     'bg-gray-100 text-gray-600',
}

const PRIORITY_STYLES = {
  Low:      'bg-slate-100 text-slate-600',
  Medium:   'bg-yellow-100 text-yellow-700',
  High:     'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

const STATUS_DOTS = {
  'Open':      'bg-blue-500',
  'Assigned':  'bg-violet-500',
  'In Progress':'bg-amber-500',
  'Pending Customer Response': 'bg-orange-500',
  'Escalated': 'bg-red-500',
  'Resolved':  'bg-green-500',
  'Closed':    'bg-gray-400',
}

export const StatusBadge = ({ status }) => (
  <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status] || 'bg-gray-100 text-gray-600')}>
    <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_DOTS[status] || 'bg-gray-400')} />
    {status}
  </span>
)

export const PriorityBadge = ({ priority }) => (
  <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_STYLES[priority] || 'bg-gray-100 text-gray-600')}>
    {priority}
  </span>
)
