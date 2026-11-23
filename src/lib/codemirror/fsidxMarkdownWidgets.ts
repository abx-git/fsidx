import { WidgetType } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import { readBlobFromStore, type FileSourceStore } from '../file-sources'
import { resolveAssetPathCandidates } from '../markdown-assets'
import { isMermaidSource, isPlantUmlSource } from '../plantuml'
import { activateFromPreviewClick, dispatchSelection } from './fsidxMarkdownClick'
import {
  renderMarkdownInto,
  unmountMarkdown,
  type MarkdownPreviewKind,
} from './fsidxMarkdownWidgetMount'

export interface MarkdownWidgetContext {
  docPath: string
  fileSources: FileSourceStore | null
}

export class MarkdownPreviewWidget extends WidgetType {
  readonly content: string
  readonly blockFrom: number
  readonly blockTo: number
  readonly ctx: MarkdownWidgetContext
  readonly kind: MarkdownPreviewKind

  constructor(
    content: string,
    blockFrom: number,
    blockTo: number,
    ctx: MarkdownWidgetContext,
    kind: MarkdownPreviewKind = 'line',
  ) {
    super()
    this.content = content
    this.blockFrom = blockFrom
    this.blockTo = blockTo
    this.ctx = ctx
    this.kind = kind
  }

  eq(other: MarkdownPreviewWidget) {
    return (
      other.content === this.content &&
      other.blockFrom === this.blockFrom &&
      other.blockTo === this.blockTo &&
      other.kind === this.kind &&
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
    wrap.className =
      this.kind === 'line'
        ? 'cm-md-rendered-chunk cm-md-rendered-line cursor-text'
        : 'cm-md-rendered-chunk cm-md-rendered-block cursor-text'
    wrap.title = 'Klicken zum Bearbeiten'
    wrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      activateFromPreviewClick(view, e, this.blockFrom, this.blockTo)
    })
    renderMarkdownInto(wrap, this.content, this.ctx, this.kind)
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
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      dispatchSelection(view, this.focusAt)
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
  readonly blockFrom: number
  readonly blockTo: number

  constructor(code: string, lang: string, blockFrom: number, blockTo: number) {
    super()
    this.code = code
    this.lang = lang
    this.blockFrom = blockFrom
    this.blockTo = blockTo
  }

  eq(other: FencedCodePreviewWidget) {
    return (
      other.code === this.code &&
      other.lang === this.lang &&
      other.blockFrom === this.blockFrom &&
      other.blockTo === this.blockTo
    )
  }

  ignoreEvent() {
    return false
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('div')
    wrap.className = 'cm-md-fenced-preview'
    wrap.title = 'Klicken zum Bearbeiten'
    wrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      activateFromPreviewClick(view, e, this.blockFrom, this.blockTo)
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