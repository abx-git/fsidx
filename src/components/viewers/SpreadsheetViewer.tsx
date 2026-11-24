import { useMemo, useState } from 'react'
import { useSpreadsheetPreview } from '../../hooks/useOfficePreview'
import type { FileSourceStore } from '../../lib/file-sources'
import { ViewerShell } from './ViewerShell'

interface SpreadsheetViewerProps {
  fileName: string
  filePath: string
  fileSources: FileSourceStore | null
  onClose: () => void
  showBackButton?: boolean
}

export function SpreadsheetViewer({
  fileName,
  filePath,
  fileSources,
  onClose,
  showBackButton,
}: SpreadsheetViewerProps) {
  const { data, loading, error } = useSpreadsheetPreview(filePath, fileSources)
  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  const sheetName = activeSheet ?? data?.sheetNames[0] ?? null

  const rows = useMemo(() => {
    if (!data || !sheetName) return []
    return data.sheets[sheetName] ?? []
  }, [data, sheetName])

  return (
    <ViewerShell
      title={fileName}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      loading={loading}
      error={error}
      toolbar={
        data && data.sheetNames.length > 1 ? (
          <div className="flex max-w-full flex-wrap gap-1">
            {data.sheetNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheet(name)}
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  name === sheetName
                    ? 'bg-emerald-600 text-white'
                    : 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {data && (
        <div className="p-4">
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Tabellen-Vorschau (ODS / Excel). Layout und Formeln können von LibreOffice abweichen.
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="office-preview-table w-full border-collapse text-sm">
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-zinc-500">Leeres Blatt.</td>
                  </tr>
                ) : (
                  rows.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? 'bg-zinc-50 dark:bg-zinc-900' : undefined}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="max-w-[280px] truncate border border-zinc-200 px-2 py-1 align-top dark:border-zinc-700"
                          title={cell}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ViewerShell>
  )
}