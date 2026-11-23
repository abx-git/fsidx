import { ChevronRight, Focus } from 'lucide-react'
import { scopeAncestorCrumbs } from '../lib/workspace-scope'

interface ScopeBarProps {
  workspaceRootName: string
  scopePath: string
  onSelectScope: (path: string) => void
  variant?: 'default' | 'compact'
}

export function ScopeBar({
  workspaceRootName,
  scopePath,
  onSelectScope,
  variant = 'default',
}: ScopeBarProps) {
  const crumbs = scopeAncestorCrumbs(scopePath, workspaceRootName)
  const isCompact = variant === 'compact'

  return (
    <div
      className={`flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40 ${
        isCompact ? 'text-xs' : 'text-sm'
      }`}
    >
      <Focus className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Scope</span>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-zinc-400" />}
            <button
              type="button"
              disabled={isLast}
              onClick={() => onSelectScope(crumb.path)}
              className={`rounded px-1 font-medium ${
                isLast
                  ? 'cursor-default text-emerald-800 dark:text-emerald-200'
                  : 'text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
              title={isLast ? 'Aktueller Scope' : `Scope auf „${crumb.label}“ setzen`}
            >
              {crumb.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}