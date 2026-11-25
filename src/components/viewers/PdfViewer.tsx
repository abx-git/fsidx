import { ViewerShell } from './ViewerShell'

interface PdfViewerProps {
  fileName: string
  filePath: string
  objectUrl: string | null
  loading: boolean
  error: string | null
  onClose: () => void
  showBackButton?: boolean
  fillHeight?: boolean
}

export function PdfViewer({
  fileName,
  filePath,
  objectUrl,
  loading,
  error,
  onClose,
  showBackButton,
  fillHeight = false,
}: PdfViewerProps) {
  return (
    <ViewerShell
      title={fileName}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      fillHeight={fillHeight}
      loading={loading}
      error={error}
    >
      {objectUrl && (
        <iframe
          title={fileName}
          src={objectUrl}
          className={
            fillHeight ? 'h-full min-h-0 w-full flex-1 border-0' : 'h-[min(80vh,900px)] w-full border-0'
          }
        />
      )}
    </ViewerShell>
  )
}