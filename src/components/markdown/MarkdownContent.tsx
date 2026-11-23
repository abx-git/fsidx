import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isMermaidSource, isPlantUmlSource } from '../../lib/plantuml'
import { MermaidDiagram } from './diagrams/MermaidDiagram'
import { PlantUmlDiagram } from './diagrams/PlantUmlDiagram'

const mdComponents: Components = {
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
  img({ src, alt, ...props }) {
    const lower = (src ?? '').toLowerCase()
    const isSvg = lower.endsWith('.svg') || lower.startsWith('data:image/svg')
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className={isSvg ? 'diagram-svg-img max-w-full' : undefined}
        {...props}
      />
    )
  },
}

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}