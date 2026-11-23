import { useState } from 'react'
import { plantUmlSvgUrl } from '../../../lib/plantuml'

interface PlantUmlDiagramProps {
  source: string
  className?: string
}

export function PlantUmlDiagram({ source, className = '' }: PlantUmlDiagramProps) {
  const [failed, setFailed] = useState(false)
  const url = plantUmlSvgUrl(source)

  if (failed) {
    return (
      <span className={`block ${className}`}>
        <p className="text-xs text-amber-800 dark:text-amber-200">
          PlantUML-Vorschau benötigt Netzwerk (plantuml.com). Rendering fehlgeschlagen.
        </p>
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">
          Diagramm im Browser öffnen
        </a>
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-zinc-100 p-2 font-mono text-[10px] dark:bg-zinc-800">
          {source}
        </pre>
      </span>
    )
  }

  return (
    <span
      className={`diagram-plantuml block overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
    >
      <img
        src={url}
        alt="PlantUML-Diagramm"
        className="mx-auto max-w-full"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  )
}