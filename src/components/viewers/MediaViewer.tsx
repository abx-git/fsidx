import { ViewerShell } from './ViewerShell'

interface MediaViewerProps {
  fileName: string
  filePath: string
  objectUrl: string | null
  kind: 'audio' | 'video'
  loading: boolean
  error: string | null
  onClose: () => void
}

export function MediaViewer({
  fileName,
  filePath,
  objectUrl,
  kind,
  loading,
  error,
  onClose,
}: MediaViewerProps) {
  return (
    <ViewerShell title={fileName} subtitle={filePath} onClose={onClose} loading={loading} error={error}>
      {objectUrl && (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          {kind === 'video' ? (
            <video
              src={objectUrl}
              controls
              className="max-h-[70vh] max-w-full rounded-lg bg-black"
            />
          ) : (
            <audio src={objectUrl} controls className="w-full max-w-md" />
          )}
        </div>
      )}
    </ViewerShell>
  )
}