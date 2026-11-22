import { Download } from 'lucide-react'
import { formatBytes } from '../../lib/format'
import { ViewerShell } from './ViewerShell'

interface BinaryViewerProps {
  fileName: string
  filePath: string
  blob: Blob | null
  size?: number
  loading: boolean
  error: string | null
  onClose: () => void
}

export function BinaryViewer({
  fileName,
  filePath,
  blob,
  size,
  loading,
  error,
  onClose,
}: BinaryViewerProps) {
  const download = () => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ViewerShell
      title={fileName}
      subtitle={filePath}
      onClose={onClose}
      loading={loading}
      error={error}
      toolbar={
        <button
          type="button"
          onClick={download}
          disabled={!blob}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      }
    >
      <dl className="mx-auto max-w-md space-y-3 p-8 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Pfad</dt>
          <dd className="font-mono text-xs break-all">{filePath}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Größe</dt>
          <dd>{formatBytes(blob?.size ?? size ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">MIME (Browser)</dt>
          <dd className="font-mono text-xs">{blob?.type || 'application/octet-stream'}</dd>
        </div>
        <p className="text-xs text-zinc-500">
          Für diesen Dateityp gibt es keine eingebaute Vorschau. Nutze Download oder einen spezialisierten Viewer
          aus dem Rechtsklick-Menü, falls verfügbar.
        </p>
      </dl>
    </ViewerShell>
  )
}