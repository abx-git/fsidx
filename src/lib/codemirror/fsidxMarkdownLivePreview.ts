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
  activeEditRegion,
  eachLineInRange,
  findTableRanges,
  rangesOverlap,
} from './fsidxMarkdownRegions'
import {
  FencedCodePreviewWidget,
  MarkdownPreviewWidget,
  type MarkdownWidgetContext,
} from './fsidxMarkdownWidgets'

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

function buildDecorations(state: EditorState, ctx: MarkdownWidgetContext): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const active = activeEditRegion(state)
  const hiddenLines = new Set<number>()

  const markHiddenLines = (from: number, to: number) => {
    eachLineInRange(state, { from, to }, (lineNo) => {
      hiddenLines.add(lineNo)
    })
  }

  eachLineInRange(state, active, (_lineNo, from) => {
    builder.add(from, from, Decoration.line({ class: 'cm-md-edit-line' }))
  })

  syntaxTree(state).iterate({
    enter(node: SyntaxNodeRef) {
      if (node.type.name !== 'FencedCode') return
      if (rangesOverlap({ from: node.from, to: node.to }, active)) return
      const meta = fencedCodeMeta(state, node)
      builder.add(
        node.from,
        node.to,
        Decoration.replace({
          widget: new FencedCodePreviewWidget(meta.code, meta.lang, node.from),
          block: true,
        }),
      )
      markHiddenLines(node.from, node.to)
    },
  })

  for (const table of findTableRanges(state)) {
    if (rangesOverlap(table, active)) continue
    const text = state.sliceDoc(table.from, table.to)
    builder.add(
      table.from,
      table.to,
      Decoration.replace({
        widget: new MarkdownPreviewWidget(text, table.from, ctx),
        block: true,
      }),
    )
    markHiddenLines(table.from, table.to)
  }

  for (let lineNo = 1; lineNo <= state.doc.lines; lineNo++) {
    if (hiddenLines.has(lineNo)) continue
    const line = state.doc.line(lineNo)
    if (rangesOverlap({ from: line.from, to: line.to }, active)) continue

    const text = line.text
    const slice = text.trim() ? text : '\u00a0'
    builder.add(
      line.from,
      line.to,
      Decoration.replace({
        widget: new MarkdownPreviewWidget(slice, line.from, ctx),
        block: true,
      }),
    )
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