import { useMemo } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { FileSourceStore } from '../../lib/file-sources'
import { preprocessObsidianEmbeds } from '../../lib/markdown-assets'
import { isMermaidSource, isPlantUmlSource } from '../../lib/plantuml'
import { MermaidDiagram } from './diagrams/MermaidDiagram'
import { PlantUmlDiagram } from './diagrams/PlantUmlDiagram'
import { MarkdownAssetImage } from './MarkdownAssetImage'

function buildCompactLineComponents(
  docPath: string | undefined,
  fileSources: FileSourceStore | null,
): Components {
  return {
    p: ({ children }) => <span className="cm-md-flow">{children}</span>,
    h1: ({ children }) => <span className="cm-md-flow cm-md-heading cm-md-h1-line">{children}</span>,
    h2: ({ children }) => <span className="cm-md-flow cm-md-heading cm-md-h2-line">{children}</span>,
    h3: ({ children }) => <span className="cm-md-flow cm-md-heading cm-md-h3-line">{children}</span>,
    h4: ({ children }) => <span className="cm-md-flow cm-md-heading">{children}</span>,
    h5: ({ children }) => <span className="cm-md-flow cm-md-heading">{children}</span>,
    h6: ({ children }) => <span className="cm-md-flow cm-md-heading">{children}</span>,
    ul: ({ children }) => <span className="cm-md-flow cm-md-list">{children}</span>,
    ol: ({ children }) => <span className="cm-md-flow cm-md-list">{children}</span>,
    li: ({ children }) => <span className="cm-md-flow">{children}</span>,
    blockquote: ({ children }) => (
      <span className="cm-md-flow cm-md-blockquote-line">{children}</span>
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

      return (
        <code className={className ?? 'cm-md-inline-code'} {...props}>
          {children}
        </code>
      )
    },
    pre({ children }) {
      return <pre className="markdown-pre my-0">{children}</pre>
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
            className="my-0"
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
          className={isSvg ? 'diagram-svg-img max-w-full my-0' : 'my-0'}
        />
      )
    },
  }
}

interface MarkdownLineContentProps {
  content: string
  docPath?: string
  fileSources?: FileSourceStore | null
}

/** Eine Quellzeile — ohne Absatz-Abstände zwischen Zeilen. */
export function MarkdownLineContent({
  content,
  docPath,
  fileSources = null,
}: MarkdownLineContentProps) {
  const display = useMemo(() => preprocessObsidianEmbeds(content), [content])
  const components = useMemo(
    () => buildCompactLineComponents(docPath, fileSources),
    [docPath, fileSources],
  )

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {display}
    </ReactMarkdown>
  )
}