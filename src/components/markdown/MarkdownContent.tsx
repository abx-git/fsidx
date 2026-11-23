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

function buildMdComponents(
  docPath: string | undefined,
  fileSources: FileSourceStore | null,
  compact: boolean,
): Components {
  return {
  ...(compact
    ? {
        p: ({ children }: { children?: React.ReactNode }) => (
          <p className="cm-md-flow my-0">{children}</p>
        ),
      }
    : {}),
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
  pre({ children }) {
    return <pre className="markdown-pre">{children}</pre>
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

export interface MarkdownContentProps {
  content: string
  className?: string
  docPath?: string
  fileSources?: FileSourceStore | null
}

export function MarkdownContent({
  content,
  className,
  docPath,
  fileSources = null,
}: MarkdownContentProps) {
  const compact = className?.includes('cm-md-compact') ?? false
  const display = useMemo(() => preprocessObsidianEmbeds(content), [content])
  const components = useMemo(
    () => buildMdComponents(docPath, fileSources ?? null, compact),
    [docPath, fileSources, compact],
  )

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {display}
      </ReactMarkdown>
    </div>
  )
}