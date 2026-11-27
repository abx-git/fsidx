import { describe, expect, it } from 'vitest'
import {
  buildBashCdFromWorkspaceRoot,
  buildPowershellCdFromWorkspaceRoot,
  scopeRelativePosix,
} from './scope-terminal-snippet'

describe('scope-terminal-snippet', () => {
  it('normalisiert leeren Scope', () => {
    expect(scopeRelativePosix('')).toBe('.')
    expect(buildBashCdFromWorkspaceRoot('')).toBeNull()
  })

  it('erzeugt bash cd', () => {
    expect(buildBashCdFromWorkspaceRoot('projekt/phase')).toBe("cd 'projekt/phase'")
    expect(buildBashCdFromWorkspaceRoot('with space')).toBe("cd 'with space'")
  })

  it('erzeugt PowerShell Set-Location', () => {
    expect(buildPowershellCdFromWorkspaceRoot('a/b')).toBe("Set-Location -LiteralPath 'a\\b'")
  })
})