import { fileExtension } from '../../lib/file-viewers'
import { ViewerShell } from './ViewerShell'

interface ImageViewerProps {
  fileName: string
  filePath: string
  objectUrl: string | null
  loading: boolean
  error: string | null
  onClose: () => void
  showBackButton?: boolean
  fillHeight?: boolean
}

export function ImageViewer({
  fileName,
  filePath,
  objectUrl,
  loading,
  error,
  onClose,
  showBackButton,
  fillHeight = false,
}: ImageViewerProps) {
  const isSvg = fileExtension(filePath) === 'svg'

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
        <div
          className={`flex items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-900 ${
            fillHeight ? 'h-full min-h-0 flex-1' : 'min-h-[50vh]'
          }`}
        >
          {isSvg ? (
            <object
              data={objectUrl}
              type="image/svg+xml"
              aria-label={fileName}
              className="diagram-svg-object max-h-[min(70vh,800px)] max-w-full rounded-lg shadow-md"
            >
              <img
                src={objectUrl}
                alt={fileName}
                className="max-h-[min(70vh,800px)] max-w-full rounded-lg object-contain shadow-md"
              />
            </object>
          ) : (
            <img
              src={objectUrl}
              alt={fileName}
              className="max-h-[min(70vh,800px)] max-w-full rounded-lg object-contain shadow-md"
            />
          )}
        </div>
      )}
    </ViewerShell>
  )
}