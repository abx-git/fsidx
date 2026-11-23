import { createRoot, type Root } from 'react-dom/client'
import { MarkdownContent } from '../../components/markdown/MarkdownContent'
import type { MarkdownWidgetContext } from './fsidxMarkdownWidgets'

const roots = new WeakMap<HTMLElement, Root>()
const scheduled = new WeakMap<HTMLElement, number>()

export function renderMarkdownInto(
  el: HTMLElement,
  content: string,
  ctx: MarkdownWidgetContext,
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
    root.render(
      <div className="markdown-preview cm-md-chunk-render -my-0.5 text-left text-inherit">
        <MarkdownContent content={content} docPath={ctx.docPath} fileSources={ctx.fileSources} />
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