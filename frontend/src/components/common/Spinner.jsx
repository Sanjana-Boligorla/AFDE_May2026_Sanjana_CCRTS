import clsx from 'clsx'

const Spinner = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-4',
  }
  return (
    <div
      className={clsx(
        'rounded-full border-primary-200 border-t-primary-600 animate-spin',
        sizes[size],
        className
      )}
    />
  )
}

export default Spinner
