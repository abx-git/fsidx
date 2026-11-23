/** Splits Markdown into blocks (blank-line separated), keeping fenced code intact. */
export function splitMarkdownBlocks(source: string): string[] {
  if (!source) return ['']

  const lines = source.split('\n')
  const blocks: string[] = []
  let buf: string[] = []
  let inFence = false
  let fenceMarker = ''

  const flush = () => {
    if (buf.length === 0) return
    blocks.push(buf.join('\n'))
    buf = []
  }

  for (const line of lines) {
    const open = line.match(/^(```+|~~~+)/)
    if (open) {
      const marker = open[1][0]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
        buf.push(line)
        continue
      }
      const close = line.match(/^(`{3,}|~{3,})/)
      if (close && close[1][0] === fenceMarker && close[1].length >= 3) {
        inFence = false
        fenceMarker = ''
      }
      buf.push(line)
      continue
    }

    if (!inFence && line.trim() === '') {
      flush()
      continue
    }

    buf.push(line)
  }

  flush()
  return blocks.length > 0 ? blocks : ['']
}

export function joinMarkdownBlocks(blocks: string[]): string {
  if (blocks.length === 0) return ''
  if (blocks.length === 1) return blocks[0]
  return blocks.join('\n\n')
}

export function replaceMarkdownBlock(blocks: string[], index: number, next: string): string {
  const copy = [...blocks]
  if (index < 0 || index >= copy.length) return joinMarkdownBlocks(blocks)
  copy[index] = next
  return joinMarkdownBlocks(copy)
}

export function insertEmptyBlockAfter(blocks: string[], index: number): string[] {
  const copy = [...blocks]
  copy.splice(index + 1, 0, '')
  return copy
}

export function removeBlockAt(blocks: string[], index: number): string[] {
  if (blocks.length <= 1) return ['']
  const copy = blocks.filter((_, i) => i !== index)
  return copy.length > 0 ? copy : ['']
}

export function mergeBlockWithPrevious(blocks: string[], index: number): string[] {
  if (index <= 0 || index >= blocks.length) return blocks
  const copy = [...blocks]
  const merged = `${copy[index - 1]}\n${copy[index]}`
  copy.splice(index - 1, 2, merged)
  return copy
}