/** Minimaler YAML-Frontmatter-Parser (nur flache Key-Werte für ET2-Tasks). */

export interface ParseFrontmatterResult {
  data: Record<string, unknown>
  body: string
}

function parseScalar(line: string): unknown {
  const v = line.trim()
  if (v === 'null' || v === '~') return null
  if (v === 'true') return true
  if (v === 'false') return false
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

function parseInlineArray(rest: string): string[] {
  const inner = rest.slice(1, -1).trim()
  if (!inner) return []
  return inner.split(',').map((s) => String(parseScalar(s.trim())))
}

export function parseYamlFrontmatter(text: string): ParseFrontmatterResult {
  const normalized = text.replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return { data: {}, body: normalized }
  }
  const end = normalized.indexOf('\n---\n', 4)
  if (end === -1) {
    return { data: {}, body: normalized }
  }
  const yaml = normalized.slice(4, end)
  const body = normalized.slice(end + 5)
  const data: Record<string, unknown> = {}
  let currentKey: string | null = null
  let listItems: string[] | null = null

  const flushList = () => {
    if (currentKey && listItems) {
      data[currentKey] = listItems
      listItems = null
    }
  }

  for (const line of yaml.split('\n')) {
    const listMatch = line.match(/^\s*-\s+(.+)$/)
    if (listMatch && currentKey && listItems) {
      listItems.push(String(parseScalar(listMatch[1])))
      continue
    }

    const kv = line.match(/^([a-zA-Z0-9_.]+):\s*(.*)$/)
    if (!kv) continue
    flushList()
    currentKey = kv[1]
    const rest = kv[2]
    if (rest === '') {
      listItems = []
      continue
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      data[currentKey] = parseInlineArray(rest)
      currentKey = null
    } else {
      data[currentKey] = parseScalar(rest)
      currentKey = null
    }
  }
  flushList()

  return { data, body }
}