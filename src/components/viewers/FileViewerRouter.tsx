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
import { DiagramViewer } from './DiagramViewer'
import { SpreadsheetViewer } from './SpreadsheetViewer'
import { OpenDocumentViewer } from './OpenDocumentViewer'
import { LinkViewer } from './LinkViewer'
import { E2BoardViewer, type E2BoardViewerSlice } from './E2BoardViewer'
import { parseLinkFile } from '../../lib/link/link-file'
import { useMemo } from 'react'

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
  loading: boolean
  error: string | null
  canWrite?: boolean
  saving?: boolean
  saveError?: string | null
}

interface FileViewerRouterProps {
  target: FileViewTarget
  fileSources: FileSourceStore | null
  onClose: () => void
  markdown?: MarkdownSlice | null
  e2Board?: E2BoardViewerSlice | null
  size?: number
  /** Full center pane vs compact right sidebar (hides Zurück). */
  variant?: 'center' | 'sidebar'
}

export function FileViewerRouter({
  target,
  fileSources,
  onClose,
  markdown,
  e2Board,
  size,
  variant = 'center',
}: FileViewerRouterProps) {
  const showBackButton = variant === 'center'
  const needsBlob = ['image', 'pdf', 'audio', 'video', 'binary'].includes(target.viewer)
  const blobState = useFileBlob(needsBlob ? target.path : null, fileSources)
  const textState = useFileText(
    target.viewer === 'text' ||
      target.viewer === 'json' ||
      target.viewer === 'diagram' ||
      target.viewer === 'link'
      ? target.path
      : null,
    fileSources,
  )

  const linkDoc = useMemo(() => {
    if (target.viewer !== 'link' || !textState.text) return null
    try {
      return parseLinkFile(textState.text)
    } catch {
      return null
    }
  }, [target.viewer, textState.text])

  const linkParseError =
    target.viewer === 'link' && textState.text && !linkDoc
      ? 'Link-Datei ungültig (fsidx-link-v1).'
      : null

  if (target.viewer === 'e2-board' && e2Board) {
    return (
      <E2BoardViewer
        fileName={target.name}
        filePath={target.path}
        onClose={onClose}
        showBackButton={showBackButton}
        e2={e2Board}
      />
    )
  }

  if (target.viewer === 'markdown' && markdown) {
    return (
      <MarkdownEditor
        fileName={target.name}
        filePath={target.path}
        content={markdown.content}
        onChange={markdown.updateContent}
        viewMode={markdown.viewMode}
        onViewModeChange={markdown.setViewMode}
        loading={markdown.loading}
        error={markdown.error}
        onClose={onClose}
        showBackButton={showBackButton}
        canWrite={markdown.canWrite}
        saving={markdown.saving}
        saveError={markdown.saveError}
        fileSources={fileSources}
      />
    )
  }

  switch (target.viewer) {
    case 'diagram':
      return (
        <DiagramViewer
          fileName={target.name}
          filePath={target.path}
          text={textState.text}
          loading={textState.loading}
          error={textState.error}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
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
    case 'link':
      return (
        <LinkViewer
          fileName={target.name}
          filePath={target.path}
          title={linkDoc?.title ?? target.name}
          url={linkDoc?.url ?? ''}
          loading={textState.loading}
          error={textState.error ?? linkParseError}
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
    case 'spreadsheet':
      return (
        <SpreadsheetViewer
          fileName={target.name}
          filePath={target.path}
          fileSources={fileSources}
          onClose={onClose}
          showBackButton={showBackButton}
        />
      )
    case 'opendocument':
      return (
        <OpenDocumentViewer
          fileName={target.name}
          filePath={target.path}
          fileSources={fileSources}
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