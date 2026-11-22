import type { IndexEntry } from '../types'

export interface SearchOptions {
  query: string
  kind?: 'file' | 'directory' | 'all'
  limit?: number
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function searchEntries(
  entries: IndexEntry[],
  { query, kind = 'all', limit = 200 }: SearchOptions,
): IndexEntry[] {
  const q = normalizeQuery(query)
  if (!q) return []

  const terms = q.split(/\s+/).filter(Boolean)
  const results: IndexEntry[] = []

  for (const entry of entries) {
    if (kind !== 'all' && entry.kind !== kind) continue
    if (terms.every((term) => entry.searchText.includes(term))) {
      results.push(entry)
      if (results.length >= limit) break
    }
  }

  return results
}

export function scoreEntry(entry: IndexEntry, query: string): number {
  const q = normalizeQuery(query)
  if (!q) return 0
  const name = entry.name.toLowerCase()
  if (name === q) return 100
  if (name.startsWith(q)) return 80
  if (name.includes(q)) return 60
  if (entry.path.toLowerCase().includes(q)) return 40
  return 20
}