import { describe, expect, it } from 'vitest'
import { buildEt2TaskCountIndex, countEt2TasksInSubtree } from './scan-folder-tasks'

const paths = [
  'proj/.et2/tasks.json',
  'proj/.et2/tasks/foo.task.md',
  'other/deep/.et2/tasks/bar.task.md',
  'notes/task-alpha.tsk.json',
  'notes/sub/task-beta.tsk.json',
  'plain.md',
]

describe('buildEt2TaskCountIndex', () => {
  const index = buildEt2TaskCountIndex(paths)

  it('matches countEt2TasksInSubtree for sample scopes', () => {
    const scopes = ['', 'proj', 'other', 'other/deep', 'notes', 'notes/sub', 'missing']
    for (const scope of scopes) {
      expect(index.get(scope) ?? 0).toBe(countEt2TasksInSubtree(paths, scope))
    }
  })
})