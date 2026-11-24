import { ViewerShell } from './ViewerShell'
import { MermaidDiagram } from '../markdown/diagrams/MermaidDiagram'
import { PlantUmlDiagram } from '../markdown/diagrams/PlantUmlDiagram'
import { isMermaidSource, isPlantUmlSource } from '../../lib/plantuml'
import { isDrawioPath, isDrawioSource } from '../../lib/drawio'
import { fileExtension } from '../../lib/file-viewers'
import { DrawioDiagram } from '../markdown/diagrams/DrawioDiagram'

export type DiagramViewerKind = 'mermaid' | 'plantuml' | 'drawio' | 'auto'

interface DiagramViewerProps {
  fileName: string
  filePath: string
  text: string
  loading: boolean
  error: string | null
  onClose: () => void
  showBackButton?: boolean
  kind?: DiagramViewerKind
}

function resolveKind(
  path: string,
  text: string,
  kind: DiagramViewerKind,
): 'mermaid' | 'plantuml' | 'drawio' {
  if (kind !== 'auto') return kind
  if (isDrawioPath(path)) return 'drawio'
  const ext = fileExtension(path)
  if (ext === 'puml' || ext === 'plantuml' || ext === 'iuml' || ext === 'wsd') return 'plantuml'
  if (ext === 'mmd' || ext === 'mermaid') return 'mermaid'
  if (isDrawioSource(text)) return 'drawio'
  if (isPlantUmlSource(text)) return 'plantuml'
  if (isMermaidSource(text)) return 'mermaid'
  return 'mermaid'
}

export function DiagramViewer({
  fileName,
  filePath,
  text,
  loading,
  error,
  onClose,
  showBackButton,
  kind = 'auto',
}: DiagramViewerProps) {
  const resolved = resolveKind(filePath, text, kind)
  const drawioChromeless = resolved === 'drawio'

  return (
    <ViewerShell
      title={fileName}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      hideHeader={drawioChromeless && !showBackButton}
      loading={loading}
      error={error}
    >
      <div
        className={
          drawioChromeless
            ? 'flex h-full min-h-[50vh] flex-col'
            : 'min-h-[50vh] p-4'
        }
      >
        {resolved === 'plantuml' ? (
          <PlantUmlDiagram source={text} />
        ) : resolved === 'drawio' ? (
          <DrawioDiagram source={text} chromeless className="min-h-0 flex-1" />
        ) : (
          <MermaidDiagram source={text} />
        )}
      </div>
    </ViewerShell>
  )
}