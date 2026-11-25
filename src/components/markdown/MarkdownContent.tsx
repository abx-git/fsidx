import { useMemo, type ReactNode } from 'react'
import type { Element as HastElement } from 'hast'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { FileSourceStore } from '../../lib/file-sources'
import { mdBlockDataAttrs } from '../../lib/markdown-view-click'
import { preprocessObsidianEmbeds } from '../../lib/markdown-assets'
import { isMermaidSource, isPlantUmlSource } from '../../lib/plantuml'
import { isDrawioSource } from '../../lib/drawio'
import { DrawioDiagram } from './diagrams/DrawioDiagram'
import { MermaidDiagram } from './diagrams/MermaidDiagram'
import { PlantUmlDiagram } from './diagrams/PlantUmlDiagram'
import { hljsCodeClass, highlightMarkdownCode } from '../../lib/markdown-highlight'
import { reactNodeToPlainText } from '../../lib/markdown-react-children'
import { MarkdownAssetImage } from './MarkdownAssetImage'
import {
  getBlockSourceSlice,
  isDiagramFenceBlockText,
  type BlockEditSession,
} from '../../lib/markdown-block-edit'
import { MarkdownInlineBlockField } from './MarkdownInlineBlockField'

function blockAttrs(
  node: HastElement | undefined,
  extras?: { noInlineEdit?: boolean },
): Record<string, string> | undefined {
  const start = node?.position?.start?.line
  const end = node?.position?.end?.line ?? start
  return mdBlockDataAttrs({ startLine: start, endLine: end, ...extras })
}

type BlockEditHandlers = {
  sessions: readonly BlockEditSession[]
  onBlockChange: (id: string, text: string) => void
  onBlockSplit: (id: string, cursor: number) => void
  onBlockDismiss: (id: string) => void
  canWrite: boolean
}

function sessionForNode(
  node: HastElement | undefined,
  sessions: readonly BlockEditSession[],
): BlockEditSession | undefined {
  const start = node?.position?.start?.line
  const end = node?.position?.end?.line ?? start
  if (!start || !end) return undefined
  return sessions.find((s) => s.startLine === start && s.endLine === end)
}

function inlineBlockWrap(
  node: HastElement | undefined,
  blockEdit: BlockEditHandlers | undefined,
  className: string | undefined,
  defaultChild: ReactNode,
  tagClass?: string,
  variant: 'prose' | 'code' = 'prose',
) {
  const session = blockEdit ? sessionForNode(node, blockEdit.sessions) : undefined
  const attrs = blockAttrs(node)
  if (session && blockEdit?.canWrite) {
    return (
      <div className={className} {...attrs}>
        <MarkdownInlineBlockField
          className="md-inline-block-field"
          variant={variant}
          value={session.text}
          onChange={(text) => blockEdit.onBlockChange(session.id, text)}
          onEnterSplit={(cursor) => blockEdit.onBlockSplit(session.id, cursor)}
          onDismiss={() => blockEdit.onBlockDismiss(session.id)}
        />
      </div>
    )
  }
  return (
    <div className={[className, tagClass].filter(Boolean).join(' ') || undefined} {...attrs}>
      {defaultChild}
    </div>
  )
}

function buildMdComponents(
  docPath: string | undefined,
  fileSources: FileSourceStore | null,
  compact: boolean,
  highlightSourceLine: number | null | undefined,
  source: string,
  blockEdit?: BlockEditHandlers,
): Components {
  const pClass = compact ? 'cm-md-flow my-0' : undefined
  const focus = (node: HastElement | undefined) => blockClassForLine(node, highlightSourceLine)

  return {
  p({ node, children, ...props }) {
    return inlineBlockWrap(
      node,
      blockEdit,
      [pClass, focus(node)].filter(Boolean).join(' ') || undefined,
      <p className={pClass} {...props}>{children}</p>,
    )
  },
  h1: ({ node, children, ...props }) =>
    inlineBlockWrap(node, blockEdit, focus(node), <h1 {...props}>{children}</h1>),
  h2: ({ node, children, ...props }) =>
    inlineBlockWrap(node, blockEdit, focus(node), <h2 {...props}>{children}</h2>),
  h3: ({ node, children, ...props }) =>
    inlineBlockWrap(node, blockEdit, focus(node), <h3 {...props}>{children}</h3>),
  h4: ({ node, children, ...props }) =>
    inlineBlockWrap(node, blockEdit, focus(node), <h4 {...props}>{children}</h4>),
  h5: ({ node, children, ...props }) =>
    inlineBlockWrap(node, blockEdit, focus(node), <h5 {...props}>{children}</h5>),
  h6: ({ node, children, ...props }) =>
    inlineBlockWrap(node, blockEdit, focus(node), <h6 {...props}>{children}</h6>),
  ul({ node, children, className, ...props }) {
    const taskList = className?.includes('contains-task-list')
    const listClass = taskList ? 'list-none pl-1' : 'list-disc pl-6'
    return (
      <ul
        className={[listClass, focus(node), className].filter(Boolean).join(' ')}
        {...props}
        {...blockAttrs(node)}
      >
        {children}
      </ul>
    )
  },
  ol({ node, children, className, ...props }) {
    const taskList = className?.includes('contains-task-list')
    const listClass = taskList ? 'list-none pl-1' : 'list-decimal pl-6'
    return (
      <ol
        className={[listClass, focus(node), className].filter(Boolean).join(' ')}
        {...props}
        {...blockAttrs(node)}
      >
        {children}
      </ol>
    )
  },
  li: ({ node, children, className, ...props }) => {
    const session = blockEdit ? sessionForNode(node, blockEdit.sessions) : undefined
    const liClass =
      [focus(node), className, className?.includes('task-list-item') ? 'list-none' : undefined]
        .filter(Boolean)
        .join(' ') || undefined
    if (session && blockEdit?.canWrite) {
      return (
        <li className={liClass} {...props} {...blockAttrs(node)}>
          <MarkdownInlineBlockField
            className="md-inline-block-field"
            variant="prose"
            value={session.text}
            onChange={(text) => blockEdit.onBlockChange(session.id, text)}
            onEnterSplit={(cursor) => blockEdit.onBlockSplit(session.id, cursor)}
            onDismiss={() => blockEdit.onBlockDismiss(session.id)}
          />
        </li>
      )
    }
    return (
      <li className={liClass} {...props} {...blockAttrs(node)}>
        {children}
      </li>
    )
  },
  blockquote: ({ node, children, ...props }) =>
    inlineBlockWrap(node, blockEdit, focus(node), <blockquote {...props}>{children}</blockquote>),
  pre: ({ node, children, ...props }) => {
    const start = node?.position?.start?.line
    const end = node?.position?.end?.line ?? start
    const slice =
      start && end ? getBlockSourceSlice(source, start, end) : ''
    const diagram = slice ? isDiagramFenceBlockText(slice) : false
    const wrapClass = ['markdown-pre-host', focus(node)].filter(Boolean).join(' ')
    if (diagram) {
      return (
        <div className={wrapClass} {...blockAttrs(node, { noInlineEdit: true })}>
          <pre className="markdown-pre" {...props}>
            {children}
          </pre>
        </div>
      )
    }
    return inlineBlockWrap(
      node,
      blockEdit,
      wrapClass,
      <pre className="markdown-pre" {...props}>{children}</pre>,
      undefined,
      'code',
    )
  },
  code({ className, children, ...props }) {
    const match = /language-([\w-]+)/.exec(className ?? '')
    const lang = match?.[1]?.toLowerCase()
    const text = reactNodeToPlainText(children)
    const isFence = Boolean(lang) || text.includes('\n')

    if (isFence) {
      if (lang === 'mermaid' || (!lang && isMermaidSource(text))) {
        return <MermaidDiagram source={text} />
      }
      if (lang === 'plantuml' || lang === 'puml' || (!lang && isPlantUmlSource(text))) {
        return <PlantUmlDiagram source={text} />
      }
      if (lang === 'drawio' || (!lang && isDrawioSource(text))) {
        return <DrawioDiagram source={text} />
      }

      const { html, hlLanguage } = highlightMarkdownCode(text, lang)
      return (
        <code
          className={[hljsCodeClass(hlLanguage), className].filter(Boolean).join(' ')}
          {...props}
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
  'md-preview-line-focus rounded-sm bg-blue-700/10 shadow-[inset_3px_0_0] shadow-blue-700 dark:bg-blue-400/10'

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
  blockEdits?: readonly BlockEditSession[]
  onBlockChange?: (id: string, text: string) => void
  onBlockSplit?: (id: string, cursor: number) => void
  onBlockDismiss?: (id: string) => void
  canWrite?: boolean
}

export function MarkdownContent({
  content,
  className,
  docPath,
  fileSources = null,
  highlightSourceLine = null,
  blockEdits = [],
  onBlockChange,
  onBlockSplit,
  onBlockDismiss,
  canWrite = false,
}: MarkdownContentProps) {
  const compact = className?.includes('cm-md-compact') ?? false
  const display = useMemo(() => preprocessObsidianEmbeds(content), [content])
  const blockEditHandlers = useMemo((): BlockEditHandlers | undefined => {
    if (!canWrite || !onBlockChange || !onBlockSplit || !onBlockDismiss || blockEdits.length === 0) {
      return undefined
    }
    return {
      sessions: blockEdits,
      onBlockChange,
      onBlockSplit,
      onBlockDismiss,
      canWrite,
    }
  }, [blockEdits, canWrite, onBlockChange, onBlockDismiss, onBlockSplit])
  const components = useMemo(
    () =>
      buildMdComponents(
        docPath,
        fileSources ?? null,
        compact,
        highlightSourceLine,
        content,
        blockEditHandlers,
      ),
    [docPath, fileSources, compact, highlightSourceLine, content, blockEditHandlers],
  )

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {display}
      </ReactMarkdown>
    </div>
  )
}