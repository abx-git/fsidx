import { syntaxTree } from '@codemirror/language'
import type { EditorState, Extension } from '@codemirror/state'
import { RangeSetBuilder, StateField } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
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

type PendingDeco = { from: number; to: number; deco: Decoration }

function addDeco(items: PendingDeco[], from: number, to: number, deco: Decoration) {
  if (from > to) return
  items.push({ from, to, deco })
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

function finishDecorations(items: PendingDeco[]): DecorationSet {
  const sorted = items.sort((a, b) => a.from - b.from || a.to - b.to)
  const builder = new RangeSetBuilder<Decoration>()
  let lastEnd = -1
  for (const { from, to, deco } of sorted) {
    if (from < lastEnd) continue
    try {
      builder.add(from, to, deco)
      lastEnd = Math.max(lastEnd, to)
    } catch {
      /* überlappende Dekoration überspringen */
    }
  }
  return builder.finish()
}

function buildDecorations(state: EditorState, ctx: MarkdownWidgetContext): DecorationSet {
  const items: PendingDeco[] = []
  const active = activeEditRegion(state)
  const hiddenLines = new Set<number>()

  const markHiddenLines = (from: number, to: number) => {
    eachLineInRange(state, { from, to }, (lineNo) => {
      hiddenLines.add(lineNo)
    })
  }

  eachLineInRange(state, active, (_lineNo, from) => {
    addDeco(items, from, from, Decoration.line({ class: 'cm-md-edit-line' }))
  })

  syntaxTree(state).iterate({
    enter(node: SyntaxNodeRef) {
      if (node.type.name !== 'FencedCode') return
      if (rangesOverlap({ from: node.from, to: node.to }, active)) return
      const meta = fencedCodeMeta(state, node)
      if (node.from >= node.to) return
      addDeco(
        items,
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
    if (table.from >= table.to) continue
    const text = state.sliceDoc(table.from, table.to)
    addDeco(
      items,
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

    if (line.from >= line.to && !line.text.length) {
      addDeco(items, line.from, line.from, Decoration.line({ class: 'cm-md-rendered-gap' }))
      continue
    }

    const text = line.text
    const slice = text.trim() ? text : '\u00a0'
    addDeco(
      items,
      line.from,
      line.to,
      Decoration.replace({
        widget: new MarkdownPreviewWidget(slice, line.from, ctx),
        block: false,
      }),
    )
  }

  try {
    return finishDecorations(items)
  } catch (err) {
    console.error('fsidx live preview decorations failed', err)
    return Decoration.none
  }
}

/**
 * Block-/zeilenübergreifende Replace-Widgets müssen als StateField laufen
 * (nicht ViewPlugin), siehe CodeMirror-Dokumentation zu EditorView.decorations.
 */
export function markdownLivePreviewPlugin(ctx: MarkdownWidgetContext): Extension {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, ctx)
    },
    update(decorations, tr) {
      if (
        tr.docChanged ||
        !tr.startState.selection.eq(tr.state.selection)
      ) {
        return buildDecorations(tr.state, ctx)
      }
      return decorations.map(tr.changes)
    },
    provide: (f) => [
      EditorView.decorations.from(f),
      EditorView.atomicRanges.of((view) => view.state.field(f)),
    ],
  })
  return field
}