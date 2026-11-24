import { DrawioEmbed } from '../../drawio/DrawioEmbed'

interface DrawioDiagramProps {
  source: string
  className?: string
  /** Ohne Rahmen; Viewer ohne diagrams.net-Toolbars (immer im Viewer-Modus). */
  chromeless?: boolean
}

export function DrawioDiagram({ source, className = '', chromeless = false }: DrawioDiagramProps) {
  return (
    <div
      className={`diagram-drawio overflow-hidden ${
        chromeless
          ? 'h-full'
          : 'rounded-lg border border-zinc-200 dark:border-zinc-700'
      } ${className}`}
    >
      <DrawioEmbed
        xml={source}
        mode="viewer"
        className={chromeless ? 'h-full min-h-[50vh]' : 'min-h-[min(70vh,720px)]'}
      />
    </div>
  )
}