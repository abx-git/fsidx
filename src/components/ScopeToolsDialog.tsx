import { useCallback, useState } from 'react'
import { ClipboardCopy, Terminal } from 'lucide-react'
import { copyTextToClipboard } from '../lib/clipboard'
import { readIdeWorkspaceAbsPath, writeIdeWorkspaceAbsPath } from '../lib/ide-workspace-path'
import {
  buildCursorOpenFile,
  buildCursorOpenFolder,
  buildDisplayRelativePath,
  buildGitLogSnippet,
  buildGitStatusSnippet,
  buildVscodeOpenFolder,
} from '../lib/scope-clipboard-snippets'
import {
  buildBashCdFromWorkspaceRoot,
  buildPowershellCdFromWorkspaceRoot,
  scopeDisplayLabel,
  scopeRelativePosix,
} from '../lib/scope-terminal-snippet'

interface ScopeToolsProps {
  workspaceRootName: string
  scopePath: string
  selectedFilePath?: string | null
}

export function ScopeCopyPathButton({ workspaceRootName, scopePath }: Omit<ScopeToolsProps, 'selectedFilePath'>) {
  const [copied, setCopied] = useState(false)
  const rel = buildDisplayRelativePath(workspaceRootName, scopePath)

  const onCopy = useCallback(() => {
    void (async () => {
      try {
        await copyTextToClipboard(rel)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        window.prompt('Pfad (manuell kopieren):', rel)
      }
    })()
  }, [rel])

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
      title="Relativen Pfad des aktuellen Scope kopieren"
    >
      <ClipboardCopy className="h-3 w-3" aria-hidden />
      {copied ? 'Kopiert' : 'Pfad'}
    </button>
  )
}

export function ScopeToolsButton({
  workspaceRootName,
  scopePath,
  selectedFilePath,
}: ScopeToolsProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [absPath, setAbsPath] = useState(() => readIdeWorkspaceAbsPath(workspaceRootName))

  const bash = buildBashCdFromWorkspaceRoot(scopePath)
  const ps = buildPowershellCdFromWorkspaceRoot(scopePath)
  const rel = scopeRelativePosix(scopePath)
  const atRoot = rel === '.'
  const displayRel = buildDisplayRelativePath(workspaceRootName, scopePath)
  const gitStatus = buildGitStatusSnippet(scopePath)
  const gitLog = buildGitLogSnippet(scopePath)
  const cursorFolder = absPath ? buildCursorOpenFolder(absPath, scopePath) : null
  const vscodeFolder = absPath ? buildVscodeOpenFolder(absPath, scopePath) : null
  const cursorFile =
    absPath && selectedFilePath ? buildCursorOpenFile(absPath, selectedFilePath) : null

  const copy = useCallback(async (label: string, text: string) => {
    await copyTextToClipboard(text)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 2000)
  }, [])

  const saveAbsPath = useCallback(() => {
    writeIdeWorkspaceAbsPath(workspaceRootName, absPath)
  }, [absPath, workspaceRootName])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbsPath(readIdeWorkspaceAbsPath(workspaceRootName))
          setOpen(true)
        }}
        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        title="Git-, Shell- und IDE-Befehle für diesen Scope"
      >
        <Terminal className="h-3 w-3" aria-hidden />
        Git & Shell
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="scope-tools-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[min(90vh,36rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h2 id="scope-tools-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Pfad, Git & Shell
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Befehle gelten im Ordner, den du fsidx beim Start gegeben hast. Relativer Pfad:{' '}
              <span className="font-mono text-zinc-800 dark:text-zinc-200">{displayRel}</span>
            </p>

            <SnippetRow
              label="Anzeige-Pfad"
              command={displayRel}
              onCopy={() => void copy('path', displayRel)}
              copied={copied === 'path'}
            />

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Git</p>
            <SnippetRow
              label="Status"
              command={gitStatus}
              onCopy={() => void copy('git-status', gitStatus)}
              copied={copied === 'git-status'}
            />
            <SnippetRow
              label="Log"
              command={gitLog}
              onCopy={() => void copy('git-log', gitLog)}
              copied={copied === 'git-log'}
            />

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Cursor / VS Code
            </p>
            <label className="mt-1 block text-[11px] text-zinc-600 dark:text-zinc-400">
              Absoluter Pfad zum Workspace-Stamm (lokal, nur in diesem Browser gespeichert):
              <input
                type="text"
                value={absPath}
                onChange={(e) => setAbsPath(e.target.value)}
                onBlur={saveAbsPath}
                placeholder="/home/user/projekt"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 font-mono text-[11px] dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            {absPath ? (
              <div className="mt-2 space-y-2">
                {cursorFolder && (
                  <SnippetRow
                    label="Cursor (Ordner)"
                    command={cursorFolder}
                    onCopy={() => void copy('cursor-dir', cursorFolder)}
                    copied={copied === 'cursor-dir'}
                  />
                )}
                {vscodeFolder && (
                  <SnippetRow
                    label="VS Code (Ordner)"
                    command={vscodeFolder}
                    onCopy={() => void copy('code-dir', vscodeFolder)}
                    copied={copied === 'code-dir'}
                  />
                )}
                {cursorFile && (
                  <SnippetRow
                    label="Cursor (ausgewählte Datei)"
                    command={cursorFile}
                    onCopy={() => void copy('cursor-file', cursorFile)}
                    copied={copied === 'cursor-file'}
                  />
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-500">
                Trage oben den Workspace-Pfad ein, dann erscheinen CLI-Befehle.
              </p>
            )}

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Shell</p>
            <p className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
              Scope: {scopeDisplayLabel(workspaceRootName, scopePath)}
            </p>
            {atRoot ? (
              <p className="mt-1 text-[11px] text-zinc-500">Stamm — kein zusätzliches cd nötig.</p>
            ) : (
              <div className="mt-2 space-y-2">
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

            <div className="mt-4 flex justify-end">
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
    <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
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