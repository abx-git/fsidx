import { createRoot, type Root } from 'react-dom/client'
import { MarkdownContent } from '../../components/markdown/MarkdownContent'
import type { MarkdownWidgetContext } from './fsidxMarkdownWidgets'

const roots = new WeakMap<HTMLElement, Root>()

export function renderMarkdownInto(
  el: HTMLElement,
  content: string,
  ctx: MarkdownWidgetContext,
) {
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
}

export function unmountMarkdown(el: HTMLElement) {
  const root = roots.get(el)
  if (root) {
    root.unmount()
    roots.delete(el)
  }
}