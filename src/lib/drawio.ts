/** draw.io / diagrams.net (XML mit mxfile oder mxGraphModel). */
export function isDrawioPath(path: string): boolean {
  const p = path.replace(/\\/g, '/').toLowerCase()
  return p.endsWith('.drawio') || p.endsWith('.dio') || p.endsWith('.drawio.xml')
}

export function isDrawioSource(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed.startsWith('<')) return false
  return (
    trimmed.includes('<mxfile') ||
    trimmed.includes('<mxGraphModel') ||
    trimmed.includes('xmlns="http://www.w3.org/1999/xhtml"') && trimmed.includes('mxCell')
  )
}