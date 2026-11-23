import { describe, expect, it } from 'vitest'
import { pathIsUnderLegacyEt2, workspaceHasLegacyEt2 } from './is-et2-internal'

describe('legacy et2 detection', () => {
  it('erkennt .et2-Pfade', () => {
    expect(pathIsUnderLegacyEt2('proj/.et2/tasks/a.task.md')).toBe(true)
    expect(pathIsUnderLegacyEt2('notes.md')).toBe(false)
  })

  it('scannt den Index', () => {
    expect(workspaceHasLegacyEt2(['a.tsk.json', 'x/.et2/tasks.json'])).toBe(true)
    expect(workspaceHasLegacyEt2(['a.tsk.json', 'readme.md'])).toBe(false)
  })
})