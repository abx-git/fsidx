import { ViewerShell } from './ViewerShell'

interface PdfViewerProps {
  fileName: string
  filePath: string
  objectUrl: string | null
  loading: boolean
  error: string | null
  onClose: () => void
}

export function PdfViewer({
  fileName,
  filePath,
  objectUrl,
  loading,
  error,
  onClose,
}: PdfViewerProps) {
  return (
    <ViewerShell title={fileName} subtitle={filePath} onClose={onClose} loading={loading} error={error}>
      {objectUrl && (
        <iframe
          title={fileName}
          src={objectUrl}
          className="h-[min(80vh,900px)] w-full border-0"
        />
      )}
    </ViewerShell>
  )
}