import { useOpenDocumentPreview } from '../../hooks/useOfficePreview'
import type { FileSourceStore } from '../../lib/file-sources'
import { ViewerShell } from './ViewerShell'

interface OpenDocumentViewerProps {
  fileName: string
  filePath: string
  fileSources: FileSourceStore | null
  onClose: () => void
  showBackButton?: boolean
}

function headingClass(level: number | undefined): string {
  const l = Math.min(6, Math.max(1, level ?? 1))
  const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm'] as const
  return `font-semibold text-zinc-900 dark:text-zinc-100 ${sizes[l - 1]}`
}

export function OpenDocumentViewer({
  fileName,
  filePath,
  fileSources,
  onClose,
  showBackButton,
}: OpenDocumentViewerProps) {
  const { data, loading, error } = useOpenDocumentPreview(filePath, fileSources)

  return (
    <ViewerShell
      title={fileName}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      loading={loading}
      error={error}
    >
      {data && (
        <div className="mx-auto max-w-3xl px-4 py-6 text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100">
          {data.note && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {data.note}
            </p>
          )}

          {data.format === 'odp' && data.slides && <SlideList slides={data.slides} />}

          {data.format === 'odt' && data.blocks && (
            <div className="space-y-3">
              {data.blocks.length === 0 ? (
                <p className="text-sm text-zinc-500">Kein Fließtext gefunden.</p>
              ) : (
                data.blocks.map((block, i) =>
                  block.kind === 'heading' ? (
                    <p key={i} className={headingClass(block.level)}>
                      {block.text}
                    </p>
                  ) : (
                    <p key={i} className="text-zinc-800 dark:text-zinc-200">
                      {block.text}
                    </p>
                  ),
                )
              )}
            </div>
          )}

          {data.format === 'other' && !data.blocks?.length && !data.slides?.length && (
            <p className="text-sm text-zinc-500">Für diesen OpenDocument-Typ gibt es noch keine Inhaltsvorschau.</p>
          )}
        </div>
      )}
    </ViewerShell>
  )
}

function SlideList({ slides }: { slides: NonNullable<import('../../lib/open-document-preview').OpenDocumentPreview['slides']> }) {
  return (
    <ol className="space-y-6">
      {slides.map((slide) => (
        <li
          key={slide.index}
          className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
        >
          <h2 className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Folie {slide.index}
            {slide.title !== `Folie ${slide.index}` ? ` — ${slide.title}` : ''}
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
            {slide.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}