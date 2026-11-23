import { WidgetType } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import type { FileSourceStore } from '../file-sources'
import { isMermaidSource, isPlantUmlSource } from '../plantuml'
import { activateFromPreviewClick } from './fsidxMarkdownClick'
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
    const shell = document.createElement('div')
    shell.className =
      this.kind === 'line'
        ? 'cm-md-rendered-chunk cm-md-rendered-line cursor-text'
        : 'cm-md-rendered-chunk cm-md-rendered-block cursor-text'
    shell.title = 'Klicken zum Bearbeiten'
    shell.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      activateFromPreviewClick(view, e, this.blockFrom, this.blockTo)
    })
    renderMarkdownInto(shell, this.content, this.ctx, this.kind)
    return shell
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