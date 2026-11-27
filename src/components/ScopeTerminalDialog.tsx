import { useCallback, useState } from 'react'
import { Terminal } from 'lucide-react'
import { copyTextToClipboard } from '../lib/clipboard'
import {
  buildBashCdFromWorkspaceRoot,
  buildPowershellCdFromWorkspaceRoot,
  scopeDisplayLabel,
  scopeRelativePosix,
} from '../lib/scope-terminal-snippet'

interface ScopeTerminalButtonProps {
  workspaceRootName: string
  scopePath: string
}

export function ScopeTerminalButton({ workspaceRootName, scopePath }: ScopeTerminalButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const bash = buildBashCdFromWorkspaceRoot(scopePath)
  const ps = buildPowershellCdFromWorkspaceRoot(scopePath)
  const rel = scopeRelativePosix(scopePath)
  const atRoot = rel === '.'

  const copy = useCallback(async (label: string, text: string) => {
    await copyTextToClipboard(text)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 2000)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        title="Shell-Befehl für diesen Scope kopieren (Terminal öffnet die Web-App nicht direkt)"
        aria-label="Terminal-Befehl für aktuellen Ordner"
      >
        <Terminal className="h-3 w-3" aria-hidden />
        Terminal
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="scope-terminal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[min(90vh,32rem)] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h2 id="scope-terminal-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Shell im aktuellen Scope
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Aus Sicherheitsgründen kann fsidx als Web-App kein lokales Terminal öffnen und kennt
              keinen absoluten Pfad auf deiner Festplatte. Öffne ein Terminal im Ordner, den du beim
              Start von fsidx gewählt hast (
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{workspaceRootName}</span>
              ), und führe dort einen der Befehle aus.
            </p>

            <p className="mt-3 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
              Scope: {scopeDisplayLabel(workspaceRootName, scopePath)}
              {!atRoot && (
                <span className="mt-1 block text-zinc-500">relativ: {rel}</span>
              )}
            </p>

            {atRoot ? (
              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                Du bist im Stamm des geöffneten Workspace — dort ist kein zusätzlicher{' '}
                <code className="text-[10px]">cd</code>-Schritt nötig.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {bash && (
                  <SnippetRow
                    label="bash / zsh"
                    command={bash}
                    onCopy={() => void copy('bash', bash)}
                    copied={copied === 'bash'}
                  />
                )}
                {ps && (
                  <SnippetRow
                    label="PowerShell"
                    command={ps}
                    onCopy={() => void copy('ps', ps)}
                    copied={copied === 'ps'}
                  />
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SnippetRow({
  label,
  command,
  onCopy,
  copied,
}: {
  label: string
  command: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
        >
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>
      <pre className="overflow-x-auto font-mono text-[11px] text-zinc-800 dark:text-zinc-200">{command}</pre>
    </div>
  )
}