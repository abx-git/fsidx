import { WidgetType } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import { readBlobFromStore, type FileSourceStore } from '../file-sources'
import { resolveAssetPathCandidates } from '../markdown-assets'
import { isMermaidSource, isPlantUmlSource } from '../plantuml'
import { renderMarkdownInto, unmountMarkdown } from './fsidxMarkdownWidgetMount'

export interface MarkdownWidgetContext {
  docPath: string
  fileSources: FileSourceStore | null
}

function focusRange(view: EditorView, from: number) {
  view.dispatch({
    selection: { anchor: from },
    scrollIntoView: true,
  })
  view.focus()
}

export class MarkdownPreviewWidget extends WidgetType {
  readonly content: string
  readonly focusAt: number
  readonly ctx: MarkdownWidgetContext

  constructor(content: string, focusAt: number, ctx: MarkdownWidgetContext) {
    super()
    this.content = content
    this.focusAt = focusAt
    this.ctx = ctx
  }

  eq(other: MarkdownPreviewWidget) {
    return (
      other.content === this.content &&
      other.focusAt === this.focusAt &&
      other.ctx.docPath === this.ctx.docPath
    )
  }

  ignoreEvent() {
    return false
  }

  destroy(dom: HTMLElement) {
    unmountMarkdown(dom)
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('div')
    wrap.className = 'cm-md-rendered-chunk cursor-text'
    wrap.title = 'Klicken zum Bearbeiten'
    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault()
      focusRange(view, this.focusAt)
    })
    renderMarkdownInto(wrap, this.content, this.ctx)
    return wrap
  }
}

async function loadWorkspaceImageBlob(
  docPath: string,
  src: string,
  fileSources: FileSourceStore | null,
): Promise<string | null> {
  if (/^(https?:|data:|blob:)/i.test(src)) return src
  if (!fileSources) return null
  const candidates = resolveAssetPathCandidates(docPath, src)
  for (const resolved of candidates) {
    try {
      const blob = await readBlobFromStore(fileSources, resolved)
      return URL.createObjectURL(blob)
    } catch {
      /* try next */
    }
  }
  return null
}

export class ImagePreviewWidget extends WidgetType {
  private objectUrl: string | null = null
  readonly alt: string
  readonly src: string
  readonly ctx: MarkdownWidgetContext
  readonly focusAt: number

  constructor(alt: string, src: string, ctx: MarkdownWidgetContext, focusAt: number) {
    super()
    this.alt = alt
    this.src = src
    this.ctx = ctx
    this.focusAt = focusAt
  }

  eq(other: ImagePreviewWidget) {
    return other.src === this.src && other.alt === this.alt && other.focusAt === this.focusAt
  }

  ignoreEvent() {
    return false
  }

  destroy() {
    if (this.objectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.objectUrl)
    }
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('figure')
    wrap.className = 'cm-md-image-wrap'
    wrap.title = 'Klicken zum Bearbeiten'
    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault()
      focusRange(view, this.focusAt)
    })

    const img = document.createElement('img')
    img.alt = this.alt
    img.loading = 'lazy'
    wrap.appendChild(img)

    void loadWorkspaceImageBlob(this.ctx.docPath, this.src, this.ctx.fileSources).then((url) => {
      if (!url) {
        wrap.replaceChildren()
        const err = document.createElement('span')
        err.className =
          'inline-flex max-w-full items-center gap-1 rounded border border-dashed border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-500'
        err.textContent = `Bild nicht gefunden: ${this.alt || this.src}`
        wrap.appendChild(err)
        return
      }
      this.objectUrl = url
      img.src = url
    })

    return wrap
  }
}

export class FencedCodePreviewWidget extends WidgetType {
  readonly code: string
  readonly lang: string
  readonly focusAt: number

  constructor(code: string, lang: string, focusAt: number) {
    super()
    this.code = code
    this.lang = lang
    this.focusAt = focusAt
  }

  eq(other: FencedCodePreviewWidget) {
    return other.code === this.code && other.lang === this.lang && other.focusAt === this.focusAt
  }

  ignoreEvent() {
    return false
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('div')
    wrap.className = 'cm-md-fenced-preview'
    wrap.title = 'Klicken zum Bearbeiten'
    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault()
      focusRange(view, this.focusAt)
    })

    const trimmed = this.code.trim()
    if (this.lang === 'mermaid' || isMermaidSource(trimmed)) {
      const inner = document.createElement('div')
      inner.className = 'cm-md-mermaid'
      wrap.appendChild(inner)
      void import('mermaid').then((mod) => {
        const mermaid = mod.default
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' })
        const id = `cm-fc-${Math.random().toString(36).slice(2, 11)}`
        return mermaid.render(id, trimmed)
      }).then(
        (r) => {
          if (r?.svg) inner.innerHTML = r.svg
        },
        () => {
          inner.textContent = trimmed
        },
      )
      return wrap
    }

    if (this.lang === 'plantuml' || this.lang === 'puml' || isPlantUmlSource(trimmed)) {
      wrap.innerHTML = `<pre class="text-xs text-zinc-500">PlantUML (Klick zum Bearbeiten)</pre>`
      return wrap
    }

    const pre = document.createElement('pre')
    pre.className = 'markdown-pre text-sm overflow-x-auto'
    pre.textContent = trimmed
    wrap.appendChild(pre)
    return wrap
  }
}