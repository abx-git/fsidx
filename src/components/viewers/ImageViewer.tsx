import { ViewerShell } from './ViewerShell'

interface ImageViewerProps {
  fileName: string
  filePath: string
  objectUrl: string | null
  loading: boolean
  error: string | null
  onClose: () => void
}

export function ImageViewer({
  fileName,
  filePath,
  objectUrl,
  loading,
  error,
  onClose,
}: ImageViewerProps) {
  return (
    <ViewerShell title={fileName} subtitle={filePath} onClose={onClose} loading={loading} error={error}>
      {objectUrl && (
        <div className="flex min-h-[50vh] items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-900">
          <img
            src={objectUrl}
            alt={fileName}
            className="max-h-[min(70vh,800px)] max-w-full rounded-lg object-contain shadow-md"
          />
        </div>
      )}
    </ViewerShell>
  )
}