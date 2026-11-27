import { ChevronRight, Focus, Lock, RefreshCw, Shield } from 'lucide-react'
import { ScopeCopyPathButton, ScopeToolsButton } from './ScopeToolsDialog'
import { scopeAncestorCrumbs } from '../lib/workspace-scope'
import { scopeVaultRoot } from '../lib/vault/vault-paths'
import { isVaultUnlocked } from '../lib/vault/vault-session'

interface ScopeBarProps {
  workspaceRootName: string
  scopePath: string
  onSelectScope: (path: string) => void
  variant?: 'default' | 'compact'
  vaultRoots?: string[]
  onRefreshScope?: () => void
  refreshingScope?: boolean
  selectedFilePath?: string | null
}

export function ScopeBar({
  workspaceRootName,
  scopePath,
  onSelectScope,
  variant = 'default',
  vaultRoots = [],
  onRefreshScope,
  refreshingScope = false,
  selectedFilePath = null,
}: ScopeBarProps) {
  const crumbs = scopeAncestorCrumbs(scopePath, workspaceRootName)
  const isCompact = variant === 'compact'
  const activeVaultRoot = scopeVaultRoot(scopePath, vaultRoots)
  const inVaultScope = vaultRoots.includes('') || activeVaultRoot !== null
  const vaultRootKey = vaultRoots.includes('') ? '' : activeVaultRoot ?? ''
  const vaultLocked = inVaultScope && !isVaultUnlocked(vaultRootKey)

  return (
    <div
      className={`flex flex-wrap items-center gap-1 border-b px-3 py-2 ${
        vaultLocked
          ? 'border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/35'
          : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40'
      } ${isCompact ? 'text-xs' : 'text-sm'}`}
    >
      <Focus className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Scope</span>
      {vaultLocked && (
        <span className="mr-1 inline-flex items-center gap-1 rounded bg-blue-200/90 px-1.5 py-0.5 text-[10px] font-semibold text-blue-950 dark:bg-blue-900 dark:text-blue-100">
          <Shield className="h-3 w-3" aria-hidden />
          <Lock className="h-3 w-3" aria-hidden />
          Tresor
        </span>
      )}
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        const crumbIsVault = vaultRoots.includes(crumb.path)
        return (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-zinc-400" />}
            <button
              type="button"
              disabled={isLast}
              onClick={() => onSelectScope(crumb.path)}
              className={`rounded px-1 font-medium ${
                crumbIsVault ? 'inline-flex items-center gap-0.5' : ''
              } ${
                isLast
                  ? 'cursor-default text-emerald-800 dark:text-emerald-200'
                  : 'text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
              title={isLast ? 'Aktueller Scope' : `Scope auf „${crumb.label}“ setzen`}
            >
              {crumbIsVault && <Shield className="h-3 w-3 text-blue-800" aria-hidden />}
              {crumb.label}
            </button>
          </span>
        )
      })}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <ScopeCopyPathButton workspaceRootName={workspaceRootName} scopePath={scopePath} />
        <ScopeToolsButton
          workspaceRootName={workspaceRootName}
          scopePath={scopePath}
          selectedFilePath={selectedFilePath}
        />
        {onRefreshScope && (
          <button
            type="button"
            disabled={refreshingScope}
            onClick={onRefreshScope}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            title="Diesen Ordner mit dem Dateisystem abgleichen (neue/gelöschte Dateien)"
          >
            <RefreshCw className={`h-3 w-3 ${refreshingScope ? 'animate-spin' : ''}`} aria-hidden />
            Aktualisieren
          </button>
        )}
      </div>
    </div>
  )
}