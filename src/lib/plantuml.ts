import { encode } from 'plantuml-encoder'

export function normalizePlantUmlSource(source: string): string {
  const trimmed = source.trim()
  if (/^@start/i.test(trimmed)) return trimmed
  return `@startuml\n${trimmed}\n@enduml`
}

/** Public PlantUML-SVG endpoint (works offline only with cached render). */
export function plantUmlSvgUrl(source: string): string {
  const deflated = encode(normalizePlantUmlSource(source))
  return `https://www.plantuml.com/plantuml/svg/${deflated}`
}

export function isPlantUmlSource(source: string): boolean {
  const t = source.trim()
  return /^@start(uml|dot|ditaa|salt|gantt|mindmap|board|yaml|json|math)/i.test(t)
}

export function isMermaidSource(source: string): boolean {
  const t = source.trim()
  return /^(graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie\s|gitGraph|mindmap|timeline|C4Context|sankey-beta)/i.test(
    t,
  )
}