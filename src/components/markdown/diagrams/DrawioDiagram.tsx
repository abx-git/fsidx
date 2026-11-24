import { DrawioEmbed } from '../../drawio/DrawioEmbed'

interface DrawioDiagramProps {
  source: string
  className?: string
}

export function DrawioDiagram({ source, className = '' }: DrawioDiagramProps) {
  return (
    <div
      className={`diagram-drawio overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 ${className}`}
    >
      <DrawioEmbed xml={source} mode="viewer" className="min-h-[min(70vh,720px)]" />
    </div>
  )
}