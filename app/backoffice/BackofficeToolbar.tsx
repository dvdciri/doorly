import type { ReactNode } from 'react'

export function BackofficeToolbar({
  title,
  subtitle,
  left,
  right,
}: {
  title: ReactNode
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 mb-6">
      <div className="justify-self-start min-w-0">{left}</div>
      <div className="text-center px-2 min-w-0 max-w-md sm:max-w-lg">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-50 leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 leading-snug">{subtitle}</p>
        ) : null}
      </div>
      <div className="justify-self-end min-w-0">{right}</div>
    </div>
  )
}
