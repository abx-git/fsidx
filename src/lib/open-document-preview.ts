import JSZip from 'jszip'
import * as XLSX from 'xlsx'

export const SPREADSHEET_EXTENSIONS = new Set(['ods', 'xlsx', 'xls', 'xlsm', 'xlsb'])
export const OPENDOC_TEXT_EXTENSIONS = new Set(['odt', 'odp', 'odg', 'fodt', 'fodp'])
export const OPENDOC_DATABASE_EXTENSIONS = new Set(['odb', 'fodb'])

export function isSpreadsheetExtension(ext: string): boolean {
  return SPREADSHEET_EXTENSIONS.has(ext.toLowerCase())
}

export function isOpenDocumentTextExtension(ext: string): boolean {
  const e = ext.toLowerCase()
  return OPENDOC_TEXT_EXTENSIONS.has(e) || OPENDOC_DATABASE_EXTENSIONS.has(e)
}

export interface SpreadsheetPreview {
  sheetNames: string[]
  sheets: Record<string, string[][]>
}

export interface OpenDocumentBlock {
  kind: 'heading' | 'paragraph'
  text: string
  level?: number
}

export interface PresentationSlidePreview {
  index: number
  title: string
  lines: string[]
}

export interface OpenDocumentPreview {
  format: 'odt' | 'odp' | 'other'
  blocks?: OpenDocumentBlock[]
  slides?: PresentationSlidePreview[]
  note?: string
}

export function parseSpreadsheetBuffer(data: ArrayBuffer): SpreadsheetPreview {
  const wb = XLSX.read(data, { type: 'array', cellDates: true })
  const sheets: Record<string, string[][]> = {}
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][]
    sheets[name] = rows.map((row) =>
      row.map((cell) => {
        if (cell == null) return ''
        if (cell instanceof Date) return cell.toISOString().slice(0, 10)
        return String(cell)
      }),
    )
  }
  return { sheetNames: wb.SheetNames, sheets }
}

async function readZipEntryText(blob: Blob, entryPath: string): Promise<string> {
  const zip = await JSZip.loadAsync(blob)
  const file = zip.file(entryPath)
  if (!file) throw new Error(`Eintrag „${entryPath}“ fehlt in der OpenDocument-Datei.`)
  return file.async('string')
}

function textBlocksFromContainer(root: Element): OpenDocumentBlock[] {
  const blocks: OpenDocumentBlock[] = []
  const walk = (el: Element) => {
    const ln = el.localName
    if (ln === 'h') {
      const text = el.textContent?.replace(/\s+/g, ' ').trim()
      if (text) {
        const level = Number.parseInt(el.getAttribute('text:outline-level') ?? '1', 10)
        blocks.push({ kind: 'heading', text, level: Number.isFinite(level) ? level : 1 })
      }
      return
    }
    if (ln === 'p') {
      const text = el.textContent?.replace(/\s+/g, ' ').trim()
      if (text) blocks.push({ kind: 'paragraph', text })
      return
    }
    for (const child of el.children) walk(child)
  }
  walk(root)
  return blocks
}

function slidesFromContentXml(contentXml: string): PresentationSlidePreview[] {
  const doc = new DOMParser().parseFromString(contentXml, 'application/xml')
  const pages = [...doc.getElementsByTagName('*')].filter((el) => el.localName === 'page')
  return pages.map((page, index) => {
    const lines: string[] = []
    for (const el of page.getElementsByTagName('*')) {
      if (el.localName === 'p' || el.localName === 'h') {
        const text = el.textContent?.replace(/\s+/g, ' ').trim()
        if (text) lines.push(text)
      }
    }
    const title = lines[0] ?? `Folie ${index + 1}`
    return { index: index + 1, title, lines }
  })
}

export async function parseOpenDocumentBlob(blob: Blob, extension: string): Promise<OpenDocumentPreview> {
  const ext = extension.toLowerCase()
  const contentXml = await readZipEntryText(blob, 'content.xml')

  if (ext === 'odp' || ext === 'fodp') {
    const slides = slidesFromContentXml(contentXml)
    return {
      format: 'odp',
      slides,
      note:
        slides.length === 0
          ? 'Kein Text in den Folien gefunden (evtl. nur Grafiken).'
          : 'Vereinfachte Textvorschau — kein Layout wie in LibreOffice.',
    }
  }

  if (ext === 'odb' || ext === 'fodb') {
    return {
      format: 'other',
      blocks: [],
      note: 'OpenDocument-Datenbank (.odb): Inhalte werden hier nicht gerendert. Datei in LibreOffice öffnen.',
    }
  }

  const doc = new DOMParser().parseFromString(contentXml, 'application/xml')
  const body = [...doc.getElementsByTagName('*')].find((el) => el.localName === 'body')
  const blocks = body ? textBlocksFromContainer(body) : textBlocksFromContainer(doc.documentElement)

  return {
    format: 'odt',
    blocks,
    note: 'Vereinfachte Textvorschau — Formatierung und Bilder können abweichen.',
  }
}