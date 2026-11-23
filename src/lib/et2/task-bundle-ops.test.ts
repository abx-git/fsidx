import { describe, expect, it } from 'vitest'
import type { Et2TaskRecord } from '../../types/et2-tasks-bundle'
import {
  collectDescendantTaskIds,
  deleteTaskSubtree,
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
})