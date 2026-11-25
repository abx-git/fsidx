export type PreviewBlockMarker = {
  el: HTMLElement
  startLine: number
  endLine: number
}

export function listPreviewBlocks(root: HTMLElement): PreviewBlockMarker[] {
  const nodes = root.querySelectorAll<HTMLElement>('[data-md-source-start]')
  const blocks: PreviewBlockMarker[] = []
  for (const el of nodes) {
    if (el.dataset.mdNoInlineEdit === '1') continue
    const startLine = Number.parseInt(el.dataset.mdSourceStart ?? '', 10)
    const endLine = Number.parseInt(el.dataset.mdSourceEnd ?? '', 10)
    if (!Number.isFinite(startLine) || startLine < 1) continue
    const end = Number.isFinite(endLine) ? endLine : startLine
    blocks.push({ el, startLine, endLine: end })
  }
  blocks.sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine)
  return blocks
}

export function findPreviewBlockIndex(
  blocks: readonly PreviewBlockMarker[],
  startLine: number,
  endLine: number,
): number {
  return blocks.findIndex((b) => b.startLine === startLine && b.endLine === endLine)
}