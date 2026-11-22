const EXT_HINTS: Record<string, string> = {
  json: 'application/json',
  md: 'text/markdown',
  txt: 'text/plain',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  js: 'text/javascript',
  jsx: 'text/javascript',
  css: 'text/css',
  html: 'text/html',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  csv: 'text/csv',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  zip: 'application/zip',
}

export function extensionFromName(name: string): string | undefined {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return undefined
  return name.slice(dot + 1).toLowerCase()
}

export function mimeHintForExtension(ext: string | undefined): string | undefined {
  if (!ext) return undefined
  return EXT_HINTS[ext] ?? `application/octet-stream`
}