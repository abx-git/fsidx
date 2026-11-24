import { describe, expect, it } from 'vitest'
import type { Et2TaskRecord } from '../../types/et2-tasks-bundle'
import {
  collectDescendantTaskIds,
  deleteTaskSubtree,
  insertTaskSiblingAfter,
  reorderTaskRelativeToSibling,
  reparentTaskInList,
  wouldCreateTaskCycle,
} from './task-bundle-ops'

const sample: Et2TaskRecord[] = [
  { id: 'a', parentId: null, title: 'A', status: 'open' },
  { id: 'b', parentId: 'a', title: 'B', status: 'open' },
  { id: 'c', parentId: 'b', title: 'C', status: 'open' },
]

describe('task-bundle-ops', () => {
  it('collects descendants', () => {
    expect([...collectDescendantTaskIds(sample, 'a')].sort()).toEqual(['b', 'c'])
  })

  it('deletes subtree', () => {
    const next = deleteTaskSubtree(sample, 'a')
    expect(next).toHaveLength(0)
    const partial = deleteTaskSubtree(sample, 'b')
    expect(partial.map((t) => t.id)).toEqual(['a'])
  })

  it('detects reparent cycles', () => {
    expect(wouldCreateTaskCycle(sample, 'a', 'c')).toBe(true)
    expect(wouldCreateTaskCycle(sample, 'b', 'c')).toBe(true)
    expect(wouldCreateTaskCycle(sample, 'b', 'a')).toBe(false)
    expect(wouldCreateTaskCycle(sample, 'c', 'a')).toBe(false)
  })

  it('reparents to root', () => {
    const next = reparentTaskInList(sample, 'c', null)
    expect(next.find((t) => t.id === 'c')?.parentId ?? null).toBe(null)
  })

  it('sortiert Aufgabe vor Anker ein', () => {
    const flat: Et2TaskRecord[] = [
      { id: 'a', parentId: null, title: 'A', status: 'open', order: 0 },
      { id: 'b', parentId: null, title: 'B', status: 'open', order: 1 },
      { id: 'c', parentId: null, title: 'C', status: 'open', order: 2 },
    ]
    const next = reorderTaskRelativeToSibling(flat, 'c', 'a', 'before')
    const ids = next
      .filter((t) => (t.parentId ?? null) === null)
      .sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
      .map((t) => t.id)
    expect(ids).toEqual(['c', 'a', 'b'])
  })

  it('fügt Geschwister nach Anker ein', () => {
    const withOrder: Et2TaskRecord[] = [
      { id: 'a', parentId: null, title: 'A', status: 'open', order: 0 },
      { id: 'b', parentId: null, title: 'B', status: 'open', order: 1 },
    ]
    const next = insertTaskSiblingAfter(withOrder, 'a', {
      id: 'n',
      parentId: null,
      title: 'Neu',
      status: 'open',
    })
    expect(next.find((t) => t.id === 'n')?.order).toBe(1)
    expect(next.find((t) => t.id === 'b')?.order).toBe(2)
  })
})