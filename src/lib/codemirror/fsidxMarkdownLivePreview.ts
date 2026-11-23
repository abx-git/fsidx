import type { EditorState, Extension, Transaction } from '@codemirror/state'
import { RangeSetBuilder, StateField } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
} from '@codemirror/view'
import {
  activeEditRegion,
  activeRegionKey,
  eachLineInRange,
  findFencedCodeRanges,
  findParagraphRanges,
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

function fencedCodeMeta(state: EditorState, from: number, to: number): { lang: string; code: string } {
  const text = state.sliceDoc(from, to)
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

function markRangeLines(
  state: EditorState,
  from: number,
  to: number,
  hiddenLines: Set<number>,
) {
  eachLineInRange(state, { from, to }, (lineNo) => {
    hiddenLines.add(lineNo)
  })
}

function addLinePreview(
  items: PendingDeco[],
  hiddenLines: Set<number>,
  state: EditorState,
  lineNo: number,
  ctx: MarkdownWidgetContext,
) {
  const line = state.doc.line(lineNo)
  if (!line.text.trim()) return
  addDeco(
    items,
    line.from,
    line.to,
    Decoration.replace({
      widget: new MarkdownPreviewWidget(line.text, line.from, line.to, ctx, 'line'),
    }),
  )
  hiddenLines.add(lineNo)
}

function addBlockPreview(
  items: PendingDeco[],
  hiddenLines: Set<number>,
  state: EditorState,
  from: number,
  to: number,
  ctx: MarkdownWidgetContext,
) {
  if (from > to) return
  const text = state.sliceDoc(from, to)
  if (!text.trim()) return
  addDeco(
    items,
    from,
    to,
    Decoration.replace({
      widget: new MarkdownPreviewWidget(text, from, to, ctx, 'block'),
      block: true,
    }),
  )
  markRangeLines(state, from, to, hiddenLines)
}

/** Pfeiltasten/Clicks: Cursor nicht in ersetzte Vorschau-Zeilen (aktive Zeile ausgenommen). */
function replaceAtomicRanges(view: EditorView, decorations: DecorationSet): DecorationSet {
  const active = activeEditRegion(view.state)
  const items: PendingDeco[] = []
  decorations.between(0, view.state.doc.length, (from, to, deco) => {
    if ((deco.spec as { widget?: unknown }).widget == null) return
    if (rangesOverlap({ from, to }, active)) return
    items.push({ from, to, deco })
  })
  return finishDecorations(items)
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

  const tables = findTableRanges(state)
  const fences = findFencedCodeRanges(state)
  const skipRanges = [...tables, ...fences]

  eachLineInRange(state, active, (_lineNo, from) => {
    addDeco(items, from, from, Decoration.line({ class: 'cm-md-edit-line' }))
  })

  for (const nodeRange of fences) {
    if (rangesOverlap(nodeRange, active)) continue
    const meta = fencedCodeMeta(state, nodeRange.from, nodeRange.to)
    if (nodeRange.from >= nodeRange.to) continue
    addDeco(
      items,
      nodeRange.from,
      nodeRange.to,
      Decoration.replace({
        widget: new FencedCodePreviewWidget(
          meta.code,
          meta.lang,
          nodeRange.from,
          nodeRange.to,
        ),
        block: true,
      }),
    )
    markRangeLines(state, nodeRange.from, nodeRange.to, hiddenLines)
  }

  for (const table of tables) {
    if (rangesOverlap(table, active)) continue
    addBlockPreview(items, hiddenLines, state, table.from, table.to, ctx)
  }

  for (const paragraph of findParagraphRanges(state, skipRanges)) {
    const firstLine = state.doc.lineAt(paragraph.from).number
    const lastLine = state.doc.lineAt(paragraph.to).number
    for (let lineNo = firstLine; lineNo <= lastLine; lineNo++) {
      const line = state.doc.line(lineNo)
      if (rangesOverlap({ from: line.from, to: line.to }, active)) continue
      addLinePreview(items, hiddenLines, state, lineNo, ctx)
    }
  }

  for (let lineNo = 1; lineNo <= state.doc.lines; lineNo++) {
    if (hiddenLines.has(lineNo)) continue
    const line = state.doc.line(lineNo)
    if (rangesOverlap({ from: line.from, to: line.to }, active)) continue
    if (!line.text.trim()) {
      addDeco(items, line.from, line.from, Decoration.line({ class: 'cm-md-blank-line' }))
    }
  }

  try {
    return finishDecorations(items)
  } catch (err) {
    console.error('fsidx live preview decorations failed', err)
    return Decoration.none
  }
}

/** Nur Änderungen innerhalb des aktiven Blocks (Zeile/Tabelle/Code) — Vorschau bleibt stabil. */
function editsContainedInActiveRegion(tr: Transaction, state: EditorState): boolean {
  const active = activeEditRegion(state)
  let contained = true
  tr.changes.iterChanges((_fromA, _toA, fromB, _toB, inserted) => {
    const endB = fromB + inserted.length
    if (fromB < active.from || endB > active.to) contained = false
  })
  return contained
}

function shouldRebuildDecorations(tr: Transaction): boolean {
  const keyBefore = activeRegionKey(tr.startState)
  const keyAfter = activeRegionKey(tr.state)
  if (keyBefore !== keyAfter) return true
  if (tr.docChanged) {
    return !editsContainedInActiveRegion(tr, tr.state)
  }
  return false
}

export function markdownLivePreviewPlugin(ctx: MarkdownWidgetContext): Extension {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, ctx)
    },
    update(decorations, tr) {
      if (shouldRebuildDecorations(tr)) {
        return buildDecorations(tr.state, ctx)
      }
      if (tr.docChanged) {
        return decorations.map(tr.changes)
      }
      return decorations
    },
    provide: (f) => [
      EditorView.decorations.from(f),
      EditorView.atomicRanges.of((view) => replaceAtomicRanges(view, view.state.field(f))),
    ],
  })
  return field
}