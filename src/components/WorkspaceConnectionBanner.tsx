import { FolderOpen, Lock, PenLine } from 'lucide-react'
import type { WorkspaceConnectionState } from '../lib/workspace-connection'

interface WorkspaceConnectionBannerProps {
  state: WorkspaceConnectionState
  rootName?: string
  supportsFsPicker: boolean
  onConnect: () => void
}

export function WorkspaceConnectionBanner({
  state,
  rootName,
  supportsFsPicker,
  onConnect,
}: WorkspaceConnectionBannerProps) {
  if (state === 'write') return null

  const isDisconnected = state === 'disconnected'

  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm ${
        isDisconnected
          ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
          : 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        {isDisconnected ? (
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p className="text-sm leading-snug">
          {isDisconnected ? (
            <>
              <strong className="font-medium">Schritt 1:</strong> Ordner
              {rootName ? ` „${rootName}"` : ''} verbinden, damit Aufgaben und Dateien gespeichert werden
              können.
            </>
          ) : (
            <>
              <strong className="font-medium">Nur Lesen.</strong> Zum Anlegen und Speichern den Ordner in Chrome
              oder Edge erneut öffnen und <em>Schreibzugriff</em> erlauben.
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onConnect}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
          isDisconnected ? 'bg-amber-600 hover:bg-amber-500' : 'bg-sky-600 hover:bg-sky-500'
        }`}
      >
        {isDisconnected ? <FolderOpen className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
        {supportsFsPicker ? 'Ordner verbinden' : 'Ordner wählen'}
      </button>
    </div>
  )
}