import { createRoot, type Root } from 'react-dom/client'
import { MarkdownContent } from '../../components/markdown/MarkdownContent'
import type { MarkdownWidgetContext } from './fsidxMarkdownWidgets'
import { markdownToPreviewHtml } from './fsidxMarkdownHtmlPreview'

export type MarkdownPreviewKind = 'line' | 'block'

const roots = new WeakMap<HTMLElement, Root>()

/** Bilder / Mermaid: weiter React, sonst HTML. */
function needsRichPreview(content: string): boolean {
  return (
    /!\[/.test(content) ||
    /```mermaid/.test(content) ||
    /@startuml/i.test(content)
  )
}

export function renderMarkdownInto(
  el: HTMLElement,
  content: string,
  ctx: MarkdownWidgetContext,
  kind: MarkdownPreviewKind = 'line',
) {
  const wrapClass =
    kind === 'line'
      ? 'markdown-preview cm-md-line-render text-left text-inherit'
      : 'markdown-preview cm-md-block-render text-left text-inherit'

  let inner = el.querySelector<HTMLElement>(':scope > .fsidx-md-preview-inner')
  if (!inner) {
    inner = document.createElement('div')
    inner.className = `fsidx-md-preview-inner ${wrapClass}`
    el.replaceChildren(inner)
  } else {
    inner.className = `fsidx-md-preview-inner ${wrapClass}`
  }

  if (needsRichPreview(content)) {
    let root = roots.get(inner)
    if (!root) {
      root = createRoot(inner)
      roots.set(inner, root)
    }
    root.render(
      <MarkdownContent
        content={content}
        docPath={ctx.docPath}
        fileSources={ctx.fileSources}
        className="cm-md-compact"
      />,
    )
    el.dataset.fsidxMdMode = 'react'
    return
  }

  const existing = roots.get(inner)
  if (existing) {
    queueMicrotask(() => {
      existing.unmount()
      roots.delete(inner)
    })
  }

  el.dataset.fsidxMdMode = 'html'
  inner.innerHTML = markdownToPreviewHtml(content)
}

export function unmountMarkdown(el: HTMLElement) {
  const inner = el.querySelector<HTMLElement>(':scope > .fsidx-md-preview-inner')
  if (el.dataset.fsidxMdMode === 'react' && inner) {
    const root = roots.get(inner)
    if (root) {
      queueMicrotask(() => {
        root.unmount()
        roots.delete(inner)
      })
    }
  }
  delete el.dataset.fsidxMdMode
}