import { ViewerShell } from './ViewerShell'

interface PdfViewerProps {
  fileName: string
  filePath: string
  objectUrl: string | null
  loading: boolean
  error: string | null
  onClose: () => void
  showBackButton?: boolean
}

export function PdfViewer({
  fileName,
  filePath,
  objectUrl,
  loading,
  error,
  onClose,
  showBackButton,
}: PdfViewerProps) {
  return (
    <ViewerShell
      title={fileName}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      loading={loading}
      error={error}
    >
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