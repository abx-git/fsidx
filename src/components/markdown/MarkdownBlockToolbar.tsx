import type { ReactNode } from 'react'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
} from 'lucide-react'
import type { TextareaEditResult } from '../../lib/markdown-textarea-edit'
import {
  insertImage,
  insertLink,
  prefixLinesInRange,
  setHeadingAtCursor,
  wrapSelection,
  insertAtCursor,
} from '../../lib/markdown-textarea-edit'

export type MarkdownToolbarAction =
  | 'bold'
  | 'italic'
  | 'code'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'link'
  | 'image'
  | 'ul'
  | 'ol'
  | 'quote'
  | 'fence'
  | 'hr'

interface MarkdownBlockToolbarProps {
  textarea: HTMLTextAreaElement | null
  onApply: (result: TextareaEditResult) => void
  disabled?: boolean
  className?: string
}

function readSelection(textarea: HTMLTextAreaElement | null): {
  value: string
  start: number
  end: number
} | null {
  if (!textarea) return null
  return {
    value: textarea.value,
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  }
}

function runAction(
  textarea: HTMLTextAreaElement | null,
  action: MarkdownToolbarAction,
): TextareaEditResult | null {
  const ctx = readSelection(textarea)
  if (!ctx) return null
  const { value, start, end } = ctx

  switch (action) {
    case 'bold':
      return wrapSelection(value, start, end, '**', '**', 'Text')
    case 'italic':
      return wrapSelection(value, start, end, '*', '*', 'Text')
    case 'code':
      return wrapSelection(value, start, end, '`', '`', 'code')
    case 'h1':
      return setHeadingAtCursor(value, start, 1)
    case 'h2':
      return setHeadingAtCursor(value, start, 2)
    case 'h3':
      return setHeadingAtCursor(value, start, 3)
    case 'link': {
      const url = window.prompt('Link-URL', 'https://')
      if (url === null || !url.trim()) return null
      return insertLink(value, start, end, url.trim())
    }
    case 'image': {
      const path = window.prompt(
        'Bilddatei (relativ, standardmäßig im gleichen Ordner wie die Datei)',
        'bild.png',
      )
      if (path === null || !path.trim()) return null
      return insertImage(value, start, end, path.trim())
    }
    case 'ul':
      return prefixLinesInRange(value, start, end, '- ')
    case 'ol':
      return prefixLinesInRange(value, start, end, '', true)
    case 'quote':
      return prefixLinesInRange(value, start, end, '> ')
    case 'fence':
      return wrapSelection(value, start, end, '```\n', '\n```', 'code')
    case 'hr':
      return insertAtCursor(value, start, end, '\n\n---\n\n')
    default:
      return null
  }
}

function ToolbarButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200/80 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
    >
      {children}
    </button>
  )
}

export function MarkdownBlockToolbar({
  textarea,
  onApply,
  disabled,
  className = '',
}: MarkdownBlockToolbarProps) {
  const fire = (action: MarkdownToolbarAction) => {
    const result = runAction(textarea, action)
    if (result) onApply(result)
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-0.5 border-b border-violet-200/80 bg-white/95 px-2 py-1 backdrop-blur-sm dark:border-violet-900/50 dark:bg-zinc-950/95 ${className}`}
      role="toolbar"
      aria-label="Markdown formatieren"
    >
      <ToolbarButton title="Fett" disabled={disabled} onClick={() => fire('bold')}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Kursiv" disabled={disabled} onClick={() => fire('italic')}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Inline-Code" disabled={disabled} onClick={() => fire('code')}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-0.5 w-px self-stretch bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <ToolbarButton title="Überschrift 1" disabled={disabled} onClick={() => fire('h1')}>
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Überschrift 2" disabled={disabled} onClick={() => fire('h2')}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Überschrift 3" disabled={disabled} onClick={() => fire('h3')}>
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-0.5 w-px self-stretch bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <ToolbarButton title="Link" disabled={disabled} onClick={() => fire('link')}>
        <Link className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Bild" disabled={disabled} onClick={() => fire('image')}>
        <Image className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-0.5 w-px self-stretch bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      <ToolbarButton title="Aufzählung" disabled={disabled} onClick={() => fire('ul')}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Nummerierte Liste" disabled={disabled} onClick={() => fire('ol')}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Zitat" disabled={disabled} onClick={() => fire('quote')}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Codeblock" disabled={disabled} onClick={() => fire('fence')}>
        <Code className="h-3.5 w-3.5 opacity-80" />
      </ToolbarButton>
      <ToolbarButton title="Trennlinie" disabled={disabled} onClick={() => fire('hr')}>
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  )
}