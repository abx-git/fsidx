import { describe, expect, it } from 'vitest'
import {
  defaultRBaseDatasetMetaText,
  defaultRBaseProjectJsonText,
  projectConfigPathForScope,
  suggestNextLocId,
} from './create-r-base-workspace'
import { isRBaseProjectConfigText, isRBaseDatasetMetaText } from './r-base-meta'

describe('create-r-base-workspace', () => {
  it('baut Projekt-Pfad', () => {
    expect(projectConfigPathForScope('')).toBe('r-base.project.json')
    expect(projectConfigPathForScope('archiv')).toBe('archiv/r-base.project.json')
  })

  it('erzeugt gültige JSON-Vorlagen', () => {
    expect(isRBaseProjectConfigText(defaultRBaseProjectJsonText())).toBe(true)
    expect(isRBaseDatasetMetaText(defaultRBaseDatasetMetaText('RUD-0001', 'Test'))).toBe(true)
  })

  it('schlägt locId vor', () => {
    expect(
      suggestNextLocId(['data/RUD-0003/meta.json', 'data/RUD-0001/meta.json'], 'data'),
    ).toBe('RUD-0004')
  })
})