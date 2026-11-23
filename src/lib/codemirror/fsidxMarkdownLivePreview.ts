import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import type { SyntaxNodeRef } from '@lezer/common'
import {
  FencedCodePreviewWidget,
  ImagePreviewWidget,
  type MarkdownWidgetContext,
} from './fsidxMarkdownWidgets'

const SYNTAX_MARKS = new Set([
  'HeaderMark',
  'EmphasisMark',
  'CodeMark',
  'LinkMark',
  'URL',
  'ListMark',
  'QuoteMark',
  'HardBreak',
  'StrikethroughMark',
])

const HEADING_NAMES: Record<string, string> = {
  ATXHeading1: 'cm-md-h1',
  ATXHeading2: 'cm-md-h2',
  ATXHeading3: 'cm-md-h3',
  ATXHeading4: 'cm-md-h4',
  ATXHeading5: 'cm-md-h5',
  ATXHeading6: 'cm-md-h6',
  SetextHeading1: 'cm-md-h1',
  SetextHeading2: 'cm-md-h2',
}

const WIKI_EMBED = /!\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g

function cursorInRange(cursor: number, from: number, to: number): boolean {
  return cursor >= from && cursor <= to
}

function cursorInNode(cursor: number, node: SyntaxNodeRef): boolean {
  return cursor >= node.from && cursor <= node.to
}

function shouldRevealSyntax(cursor: number, markNode: SyntaxNodeRef): boolean {
  let n = markNode.node.parent
  while (n) {
    if (cursorInNode(cursor, n)) return true
    n = n?.parent ?? null
  }
  return false
}

function fencedCodeMeta(state: EditorState, node: SyntaxNodeRef): { lang: string; code: string } {
  const text = state.sliceDoc(node.from, node.to)
  const lines = text.split('\n')
  if (lines.length < 2) return { lang: '', code: text }
  const info =
    lines[0].replace(/^(`{3,}|~{3,})\s*/, '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  const body = lines.slice(1)
  while (body.length && /^(`{3,}|~{3,})\s*$/.test(body[body.length - 1])) {
    body.pop()
  }
  return { lang: info, code: body.join('\n') }
}

function parseImageNode(state: EditorState, node: SyntaxNodeRef): { alt: string; src: string } | null {
  const text = state.sliceDoc(node.from, node.to)
  const m = text.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/)
  if (!m) return null
  return { alt: m[1], src: m[2] }
}

function buildDecorations(state: EditorState, ctx: MarkdownWidgetContext): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const cursor = state.selection.main.head
  const replaced: Array<[number, number]> = []

  const isReplaced = (from: number, to: number) =>
    replaced.some(([a, b]) => from >= a && to <= b)

  syntaxTree(state).iterate({
    enter(node) {
      const name = node.type.name

      if (name === 'FencedCode' && !cursorInNode(cursor, node)) {
        const { lang, code } = fencedCodeMeta(state, node)
        builder.add(
          node.from,
          node.to,
          Decoration.replace({
            widget: new FencedCodePreviewWidget(code, lang, node.from),
            block: true,
          }),
        )
        replaced.push([node.from, node.to])
        return false
      }

      if (name === 'Image' && !cursorInNode(cursor, node) && !isReplaced(node.from, node.to)) {
        const img = parseImageNode(state, node)
        if (img) {
          builder.add(
            node.from,
            node.to,
            Decoration.replace({
              widget: new ImagePreviewWidget(img.alt, img.src, ctx, node.from),
              block: true,
            }),
          )
          replaced.push([node.from, node.to])
          return false
        }
      }

      if (HEADING_NAMES[name] && !isReplaced(node.from, node.to)) {
        const deco = cursorInNode(cursor, node)
          ? null
          : Decoration.line({ class: HEADING_NAMES[name] })
        if (deco) builder.add(node.from, node.from, deco)
      }

      if ((name === 'Blockquote' || name === 'Quote') && !isReplaced(node.from, node.to)) {
        if (!cursorInNode(cursor, node)) {
          builder.add(node.from, node.from, Decoration.line({ class: 'cm-md-blockquote-line' }))
        }
      }

      if (name === 'StrongEmphasis' && !cursorInNode(cursor, node) && !isReplaced(node.from, node.to)) {
        builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-strong' }))
      }

      if (name === 'Emphasis' && node.node.parent?.type.name !== 'StrongEmphasis') {
        if (!cursorInNode(cursor, node) && !isReplaced(node.from, node.to)) {
          builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-emphasis' }))
        }
      }

      if (name === 'Strikethrough' && !cursorInNode(cursor, node) && !isReplaced(node.from, node.to)) {
        builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-strikethrough' }))
      }

      if (name === 'InlineCode' && !isReplaced(node.from, node.to)) {
        const showSyntax = cursorInNode(cursor, node)
        if (!showSyntax) {
          builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-inline-code' }))
        }
      }

      if (name === 'Link' && !cursorInNode(cursor, node) && !isReplaced(node.from, node.to)) {
        builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-link' }))
      }

      if (SYNTAX_MARKS.has(name) && !isReplaced(node.from, node.to)) {
        const reveal = shouldRevealSyntax(cursor, node)
        builder.add(
          node.from,
          node.to,
          Decoration.mark({ class: reveal ? 'cm-md-syntax' : 'cm-md-hidden' }),
        )
      }
    },
  })

  const doc = state.doc.toString()
  let m: RegExpExecArray | null
  WIKI_EMBED.lastIndex = 0
  while ((m = WIKI_EMBED.exec(doc)) !== null) {
    const from = m.index
    const to = from + m[0].length
    if (cursorInRange(cursor, from, to) || isReplaced(from, to)) continue
    const path = m[1].trim()
    const alt = (m[2] ?? path.split('/').pop() ?? 'image').trim()
    let src = path
    if (src && !src.includes('/') && !src.startsWith('./')) src = `./${src}`
    builder.add(
      from,
      to,
      Decoration.replace({
        widget: new ImagePreviewWidget(alt, src, ctx, from),
        block: true,
      }),
    )
    replaced.push([from, to])
  }

  return builder.finish()
}

export function markdownLivePreviewPlugin(ctx: MarkdownWidgetContext) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view.state, ctx)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildDecorations(update.state, ctx)
        }
      }
    },
    { decorations: (v) => v.decorations },
  )
}