import type { FileViewerKind } from '../../lib/file-viewers'
import type { FileSourceStore } from '../../lib/file-sources'
import { useFileBlob, useFileText } from '../../hooks/useFileResource'
import { MarkdownEditor } from '../MarkdownEditor'
import type { MarkdownViewMode } from '../../hooks/useMarkdownDocument'
import { ImageViewer } from './ImageViewer'
import { TextViewer } from './TextViewer'
import { MediaViewer } from './MediaViewer'
import { PdfViewer } from './PdfViewer'
import { BinaryViewer } from './BinaryViewer'

export interface FileViewTarget {
  viewer: FileViewerKind
  path: string
  name: string
}

interface MarkdownSlice {
  content: string
  updateContent: (v: string) => void
  viewMode: MarkdownViewMode
  setViewMode: (m: MarkdownViewMode) => void
  toggleViewMode: () => void
  loading: boolean
  error: string | null
  dirty: boolean
}

interface FileViewerRouterProps {
  target: FileViewTarget
  fileSources: FileSourceStore | null
  onClose: () => void
  markdown?: MarkdownSlice | null
  size?: number
  /** Full center pane vs compact right sidebar (hides Zurück). */
  variant?: 'center' | 'sidebar'
}

export function FileViewerRouter({
  target,
  fileSources,
  onClose,
  markdown,
  size,
  variant = 'center',
}: FileViewerRouterProps) {
  const showBackButton = variant === 'center'
  const needsBlob = ['image', 'pdf', 'audio', 'video', 'binary'].includes(target.viewer)
  const blobState = useFileBlob(needsBlob ? target.path : null, fileSources)
  const textState = useFileText(
    target.viewer === 'text' || target.viewer === 'json' ? target.path : null,
    fileSources,
  )

  if (target.viewer === 'markdown' && markdown) {
    return (
      <MarkdownEditor
        fileName={target.name}
        filePath={target.path}
        content={markdown.content}
        onChange={markdown.updateContent}
        viewMode={markdown.viewMode}
        onViewModeChange={markdown.setViewMode}
        onToggleViewMode={markdown.toggleViewMode}
        loading={markdown.loading}
        error={markdown.error}
        dirty={markdown.dirty}
        onClose={onClose}
        showBackButton={showBackButton}
      />
    )
  }

  switch (target.viewer) {
    case 'image':
      return (
        <ImageViewer
          fileName={target.name}
          filePath={target.path}
          objectUrl={blobState.objectUrl}
          loading={blobState.loading}
          error={blobState.error}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
    case 'pdf':
      return (
        <PdfViewer
          fileName={target.name}
          filePath={target.path}
          objectUrl={blobState.objectUrl}
          loading={blobState.loading}
          error={blobState.error}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
    case 'audio':
      return (
        <MediaViewer
          fileName={target.name}
          filePath={target.path}
          objectUrl={blobState.objectUrl}
          kind="audio"
          loading={blobState.loading}
          error={blobState.error}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
    case 'video':
      return (
        <MediaViewer
          fileName={target.name}
          filePath={target.path}
          objectUrl={blobState.objectUrl}
          kind="video"
          loading={blobState.loading}
          error={blobState.error}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
    case 'json':
      return (
        <TextViewer
          fileName={target.name}
          filePath={target.path}
          text={textState.text}
          loading={textState.loading}
          error={textState.error}
          onClose={onClose}
          formattedJson
          showBackButton={showBackButton}
        />
      )
    case 'text':
      return (
        <TextViewer
          fileName={target.name}
          filePath={target.path}
          text={textState.text}
          loading={textState.loading}
          error={textState.error}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
    default:
      return (
        <BinaryViewer
          fileName={target.name}
          filePath={target.path}
          blob={blobState.blob}
          size={size}
          loading={blobState.loading}
          error={blobState.error}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
  }
}