import { ViewerShell } from './ViewerShell'
import { MermaidDiagram } from '../markdown/diagrams/MermaidDiagram'
import { PlantUmlDiagram } from '../markdown/diagrams/PlantUmlDiagram'
import { isMermaidSource, isPlantUmlSource } from '../../lib/plantuml'
import { fileExtension } from '../../lib/file-viewers'

export type DiagramViewerKind = 'mermaid' | 'plantuml' | 'auto'

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

function resolveKind(path: string, text: string, kind: DiagramViewerKind): 'mermaid' | 'plantuml' {
  if (kind !== 'auto') return kind
  const ext = fileExtension(path)
  if (ext === 'puml' || ext === 'plantuml' || ext === 'iuml' || ext === 'wsd') return 'plantuml'
  if (ext === 'mmd' || ext === 'mermaid') return 'mermaid'
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

  return (
    <ViewerShell
      title={fileName}
      subtitle={filePath}
      onClose={onClose}
      showBackButton={showBackButton}
      loading={loading}
      error={error}
    >
      <div className="min-h-[50vh] p-4">
        {resolved === 'plantuml' ? (
          <PlantUmlDiagram source={text} />
        ) : (
          <MermaidDiagram source={text} />
        )}
      </div>
    </ViewerShell>
  )
}