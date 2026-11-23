import type { Et2TaskDocument } from '../../types/et2-task'

function yamlQuote(s: string): string {
  if (/[:#\n]/.test(s) || s.includes('"')) return JSON.stringify(s)
  return s
}

function serializeValue(key: string, value: unknown, lines: string[]): void {
  if (value === undefined) return
  if (value === null) {
    lines.push(`${key}: null`)
    return
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${key}: []`)
      return
    }
    lines.push(`${key}:`)
    for (const item of value) {
      lines.push(`  - ${yamlQuote(String(item))}`)
    }
    return
  }
  if (typeof value === 'object') {
    lines.push(`${key}:`)
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        lines.push(`  ${k}:`)
        for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
          if (v2 !== undefined) lines.push(`    ${k2}: ${yamlQuote(String(v2))}`)
        }
      } else {
        lines.push(`  ${k}: ${yamlQuote(String(v))}`)
      }
    }
    return
  }
  lines.push(`${key}: ${typeof value === 'string' ? yamlQuote(value) : String(value)}`)
}

export function serializeTaskMd({ frontmatter, body }: Et2TaskDocument): string {
  const lines: string[] = ['---']
  serializeValue('format', frontmatter.format, lines)
  serializeValue('version', frontmatter.version, lines)
  serializeValue('id', frontmatter.id, lines)
  if (frontmatter.kind) serializeValue('kind', frontmatter.kind, lines)
  serializeValue('title', frontmatter.title, lines)
  if (frontmatter.tags?.length) serializeValue('tags', frontmatter.tags, lines)
  if (frontmatter.link) serializeValue('link', frontmatter.link, lines)
  if (frontmatter.command) serializeValue('command', frontmatter.command, lines)
  if (frontmatter.dueDate !== undefined) serializeValue('dueDate', frontmatter.dueDate, lines)
  if (frontmatter.reminderDate !== undefined) serializeValue('reminderDate', frontmatter.reminderDate, lines)
  if (frontmatter.effort !== undefined) serializeValue('effort', frontmatter.effort, lines)
  if (frontmatter.effortUnit) serializeValue('effortUnit', frontmatter.effortUnit, lines)
  if (frontmatter.et2) serializeValue('et2', frontmatter.et2, lines)
  lines.push('---')
  const trimmedBody = body.replace(/^\n/, '')
  if (trimmedBody.length === 0) return `${lines.join('\n')}\n`
  return `${lines.join('\n')}\n\n${trimmedBody}`
}