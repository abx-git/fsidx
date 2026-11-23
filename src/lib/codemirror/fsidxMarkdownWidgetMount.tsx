import { createRoot, type Root } from 'react-dom/client'
import { MarkdownContent } from '../../components/markdown/MarkdownContent'
import { MarkdownLineContent } from '../../components/markdown/MarkdownLineContent'
import type { MarkdownWidgetContext } from './fsidxMarkdownWidgets'

export type MarkdownPreviewKind = 'line' | 'block'

const roots = new WeakMap<HTMLElement, Root>()
const scheduled = new WeakMap<HTMLElement, number>()

export function renderMarkdownInto(
  el: HTMLElement,
  content: string,
  ctx: MarkdownWidgetContext,
  kind: MarkdownPreviewKind = 'line',
) {
  const prior = scheduled.get(el)
  if (prior != null) cancelAnimationFrame(prior)

  const frame = requestAnimationFrame(() => {
    scheduled.delete(el)
    if (!el.isConnected) return

    let root = roots.get(el)
    if (!root) {
      root = createRoot(el)
      roots.set(el, root)
    }

    const wrapClass =
      kind === 'line'
        ? 'markdown-preview cm-md-line-render text-left text-inherit'
        : 'markdown-preview cm-md-block-render text-left text-inherit'

    root.render(
      <div className={wrapClass}>
        {kind === 'line' ? (
          <MarkdownLineContent
            content={content}
            docPath={ctx.docPath}
            fileSources={ctx.fileSources}
          />
        ) : (
          <MarkdownContent
            content={content}
            docPath={ctx.docPath}
            fileSources={ctx.fileSources}
          />
        )}
      </div>,
    )
  })
  scheduled.set(el, frame)
}

export function unmountMarkdown(el: HTMLElement) {
  const prior = scheduled.get(el)
  if (prior != null) cancelAnimationFrame(prior)
  scheduled.delete(el)

  const root = roots.get(el)
  if (root) {
    queueMicrotask(() => {
      root.unmount()
      roots.delete(el)
    })
  }
}