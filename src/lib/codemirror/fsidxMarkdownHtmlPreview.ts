import { marked } from 'marked'
import { preprocessObsidianEmbeds } from '../markdown-assets'

marked.setOptions({
  gfm: true,
  breaks: true,
})

/** Synchrone Vorschau ohne React — kein Layout-Flattern beim Zeilenwechsel. */
export function markdownToPreviewHtml(source: string): string {
  const display = preprocessObsidianEmbeds(source.trimEnd())
  if (!display.trim()) return ''
  return marked.parse(display, { async: false })
}