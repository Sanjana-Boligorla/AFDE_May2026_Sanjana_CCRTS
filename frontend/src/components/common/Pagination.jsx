import clsx from 'clsx'

export default function Pagination({ page, pages, total, limit, onPageChange }) {
  if (pages <= 1) return null
  const start = (page - 1) * limit + 1
  const end   = Math.min(page * limit, total)

  const getPages = () => {
    const arr = []
    if (pages <= 7) { for (let i = 1; i <= pages; i++) arr.push(i); return arr }
    if (page <= 4) return [1,2,3,4,5,'...',pages]
    if (page >= pages - 3) return [1,'...',pages-4,pages-3,pages-2,pages-1,pages]
    return [1,'...',page-1,page,page+1,'...',pages]
  }

  return (
    <div className="flex items-center justify-between px-1 mt-4">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        {getPages().map((p, i) =>
          p === '...'
            ? <span key={i} className="px-2 text-gray-400">…</span>
            : <button
                key={p}
                onClick={() => onPageChange(p)}
                className={clsx(
                  'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                  p === page ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >{p}</button>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
