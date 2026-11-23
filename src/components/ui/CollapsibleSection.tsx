import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface CollapsibleSectionProps {
  summary: string
  children: ReactNode
  className?: string
  contentClassName?: string
}

/** Seltene Optionen — standardmäßig eingeklappt. */
export function CollapsibleSection({
  summary,
  children,
  className = '',
  contentClassName = 'pt-2',
}: CollapsibleSectionProps) {
  return (
    <details className={`group text-xs text-zinc-600 dark:text-zinc-400 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        {summary}
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  )
}