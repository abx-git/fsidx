import { describe, expect, it } from 'vitest'
import {
  buildCursorOpenFolder,
  buildDisplayRelativePath,
  buildGitStatusSnippet,
  joinAbsWorkspacePath,
} from './scope-clipboard-snippets'

describe('scope-clipboard-snippets', () => {
  it('zeigt Anzeige-Pfad', () => {
    expect(buildDisplayRelativePath('Root', 'a/b.md')).toBe('Root/a/b.md')
  })

  it('git status mit Scope', () => {
    expect(buildGitStatusSnippet('sub')).toBe("git status -- 'sub'")
    expect(buildGitStatusSnippet('')).toBe('git status')
  })

  it('fügt absoluten Workspace zusammen', () => {
    expect(joinAbsWorkspacePath('/home/ws', 'a/b')).toBe('/home/ws/a/b')
    expect(buildCursorOpenFolder('/home/ws', 'sub')?.startsWith('cursor ')).toBe(true)
  })
})