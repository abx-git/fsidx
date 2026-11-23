import type { Et2TaskStatus } from '../../types/et2-tasks-bundle'

export const DEFAULT_COMPLETED_TAG = 'Erledigt'

export function normalizeTagLabel(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

export function normalizeCompletedTag(s: string): string {
  const n = normalizeTagLabel(s)
  return n || DEFAULT_COMPLETED_TAG
}

export function uniqNonEmptyTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const n = normalizeTagLabel(raw)
    if (!n) continue
    const k = n.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(n)
  }
  return out
}

export function isTaskMarkedDone(
  node: { tags?: string[]; status?: Et2TaskStatus },
  completedTag: string = DEFAULT_COMPLETED_TAG,
): boolean {
  if (node.status === 'done' || node.status === 'cancelled') return true
  const tags = node.tags ?? []
  const t = normalizeCompletedTag(completedTag).toLowerCase()
  return tags.some((x) => normalizeTagLabel(x).toLowerCase() === t)
}

function isCompletedTagLabel(label: string, completedTag: string): boolean {
  return normalizeTagLabel(label).toLowerCase() === normalizeCompletedTag(completedTag).toLowerCase()
}

export function tagsWithoutCompletedTag(
  tags: string[],
  completedTag: string = DEFAULT_COMPLETED_TAG,
): string[] {
  return tags.filter((t) => !isCompletedTagLabel(t, completedTag))
}

export function setCompletedTagOnTags(
  tags: string[],
  completedTag: string,
  done: boolean,
): string[] {
  const canonical = normalizeCompletedTag(completedTag)
  const rest = tagsWithoutCompletedTag(tags, completedTag)
  return done ? uniqNonEmptyTags([...rest, canonical]) : rest
}

export function tagKey(s: string): string {
  return normalizeTagLabel(s).toLowerCase()
}

export function collectAllTagsFromTasks(tasks: { tags?: string[] }[]): string[] {
  const byKey = new Map<string, string>()
  for (const n of tasks) {
    for (const raw of n.tags ?? []) {
      const label = normalizeTagLabel(raw)
      if (!label) continue
      const k = tagKey(label)
      if (!byKey.has(k)) byKey.set(k, label)
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'de'))
}

export function tagChipClass(
  tag: string,
  completedTag: string = DEFAULT_COMPLETED_TAG,
): string {
  const base =
    'inline-flex max-w-full items-center truncate rounded border px-1.5 py-px text-[10px] font-medium leading-tight'
  const k = normalizeTagLabel(tag).toLowerCase()
  if (k === normalizeCompletedTag(completedTag).toLowerCase()) {
    return `${base} border-emerald-400/90 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200`
  }
  return `${base} border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300`
}

/** Status „done“ und Erledigt-Tag konsistent halten. */
export function syncDoneStatusWithTags(
  status: Et2TaskStatus,
  tags: string[],
  completedTag: string = DEFAULT_COMPLETED_TAG,
): { status: Et2TaskStatus; tags: string[] } {
  if (status === 'done' || status === 'cancelled') {
    return { status, tags: setCompletedTagOnTags(tags, completedTag, true) }
  }
  return { status, tags: setCompletedTagOnTags(tags, completedTag, false) }
}