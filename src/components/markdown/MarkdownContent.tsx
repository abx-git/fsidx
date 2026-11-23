import { useMemo } from 'react'
import type { Element as HastElement } from 'hast'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { FileSourceStore } from '../../lib/file-sources'
import { mdBlockDataAttrs } from '../../lib/markdown-view-click'
import { preprocessObsidianEmbeds } from '../../lib/markdown-assets'
import { isMermaidSource, isPlantUmlSource } from '../../lib/plantuml'
import { MermaidDiagram } from './diagrams/MermaidDiagram'
import { PlantUmlDiagram } from './diagrams/PlantUmlDiagram'
import { MarkdownAssetImage } from './MarkdownAssetImage'

function blockAttrs(node: HastElement | undefined): Record<string, string> | undefined {
  const start = node?.position?.start?.line
  const end = node?.position?.end?.line ?? start
  return mdBlockDataAttrs({ startLine: start, endLine: end })
}

function buildMdComponents(
  docPath: string | undefined,
  fileSources: FileSourceStore | null,
  compact: boolean,
  highlightSourceLine: number | null | undefined,
): Components {
  const pClass = compact ? 'cm-md-flow my-0' : undefined
  const focus = (node: HastElement | undefined) => blockClassForLine(node, highlightSourceLine)

  return {
  p({ node, children, ...props }) {
    return (
      <p className={[pClass, focus(node)].filter(Boolean).join(' ') || undefined} {...props} {...blockAttrs(node)}>
        {children}
      </p>
    )
  },
  h1: ({ node, children, ...props }) => (
    <h1 className={focus(node)} {...props} {...blockAttrs(node)}>{children}</h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2 className={focus(node)} {...props} {...blockAttrs(node)}>{children}</h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3 className={focus(node)} {...props} {...blockAttrs(node)}>{children}</h3>
  ),
  h4: ({ node, children, ...props }) => (
    <h4 className={focus(node)} {...props} {...blockAttrs(node)}>{children}</h4>
  ),
  h5: ({ node, children, ...props }) => (
    <h5 className={focus(node)} {...props} {...blockAttrs(node)}>{children}</h5>
  ),
  h6: ({ node, children, ...props }) => (
    <h6 className={focus(node)} {...props} {...blockAttrs(node)}>{children}</h6>
  ),
  li: ({ node, children, ...props }) => (
    <li className={focus(node)} {...props} {...blockAttrs(node)}>{children}</li>
  ),
  blockquote: ({ node, children, ...props }) => (
    <blockquote className={focus(node)} {...props} {...blockAttrs(node)}>{children}</blockquote>
  ),
  pre: ({ node, children, ...props }) => (
    <pre className={['markdown-pre', focus(node)].filter(Boolean).join(' ')} {...props} {...blockAttrs(node)}>{children}</pre>
  ),
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '')
    const lang = match?.[1]?.toLowerCase()
    const text = String(children).replace(/\n$/, '')

    if (lang === 'mermaid' || (!lang && isMermaidSource(text))) {
      return <MermaidDiagram source={text} />
    }
    if (lang === 'plantuml' || lang === 'puml' || (!lang && isPlantUmlSource(text))) {
      return <PlantUmlDiagram source={text} />
    }

    if (match) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
    img({ src, alt, title }) {
      if (docPath && fileSources && src && !/^(https?:|data:|blob:)/i.test(src)) {
        return (
          <MarkdownAssetImage
            src={src}
            alt={alt ?? undefined}
            title={title ?? undefined}
            docPath={docPath}
            fileSources={fileSources}
          />
        )
      }
      const lower = (src ?? '').toLowerCase()
      const isSvg = lower.endsWith('.svg') || lower.startsWith('data:image/svg')
      return (
        <img
          src={src}
          alt={alt ?? ''}
          title={title ?? undefined}
          className={isSvg ? 'diagram-svg-img max-w-full' : undefined}
        />
      )
    },
  }
}

const lineFocusClass =
  'md-preview-line-focus rounded-sm bg-violet-500/10 shadow-[inset_3px_0_0] shadow-violet-500 dark:bg-violet-400/10'

function blockClassForLine(
  node: HastElement | undefined,
  highlightSourceLine: number | null | undefined,
): string | undefined {
  if (!highlightSourceLine) return undefined
  const start = node?.position?.start?.line
  const end = node?.position?.end?.line ?? start
  if (!start) return undefined
  return highlightSourceLine >= start && highlightSourceLine <= (end ?? start)
    ? lineFocusClass
    : undefined
}

export interface MarkdownContentProps {
  content: string
  className?: string
  docPath?: string
  fileSources?: FileSourceStore | null
  /** Zeile im Quelltext, die in der Vorschau hervorgehoben wird. */
  highlightSourceLine?: number | null
}

export function MarkdownContent({
  content,
  className,
  docPath,
  fileSources = null,
  highlightSourceLine = null,
}: MarkdownContentProps) {
  const compact = className?.includes('cm-md-compact') ?? false
  const display = useMemo(() => preprocessObsidianEmbeds(content), [content])
  const components = useMemo(
    () => buildMdComponents(docPath, fileSources ?? null, compact, highlightSourceLine),
    [docPath, fileSources, compact, highlightSourceLine],
  )

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {display}
      </ReactMarkdown>
    </div>
  )
}