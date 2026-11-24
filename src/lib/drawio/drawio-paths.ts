import { isDrawioPath } from '../drawio'

export { isDrawioPath }

export function drawioFileName(baseLabel: string, attempt = 0): string {
  const safe = baseLabel.trim().replace(/[/\\:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || 'Diagramm'
  const stem = attempt === 0 ? safe : `${safe}-${attempt + 1}`
  return `${stem}.drawio`
}

export function defaultNewDrawioPath(dirPath: string, attempt = 0): string {
  const name = drawioFileName('Diagramm', attempt)
  return dirPath ? `${dirPath}/${name}` : name
}

export function pickNewDrawioPath(dirPath: string, indexedPaths: string[]): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = defaultNewDrawioPath(dirPath, attempt)
    if (!indexedPaths.includes(candidate)) return candidate
  }
  return defaultNewDrawioPath(dirPath, Date.now() % 1000)
}