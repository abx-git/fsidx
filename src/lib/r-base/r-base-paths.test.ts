import { describe, expect, it } from 'vitest'
import {
  datasetFolderFromMetaPath,
  isRBaseDatasetMetaPath,
  isRBaseProjectConfigPath,
  rBaseWorkspaceRootFromPath,
} from './r-base-paths'

describe('r-base-paths', () => {
  it('erkennt Projekt- und Datensatz-Pfade', () => {
    expect(isRBaseProjectConfigPath('archiv/r-base.project.json')).toBe(true)
    expect(isRBaseDatasetMetaPath('RUD-1/meta.json')).toBe(true)
    expect(isRBaseDatasetMetaPath('meta.json')).toBe(true)
    expect(isRBaseProjectConfigPath('package.json')).toBe(false)
  })

  it('liefert Datensatz-Ordner und Workspace-Stamm', () => {
    expect(datasetFolderFromMetaPath('data/RUD-X/meta.json')).toBe('data/RUD-X')
    const root = rBaseWorkspaceRootFromPath('data/RUD-X/meta.json', [
      'data/r-base.project.json',
      'data/RUD-X/meta.json',
    ])
    expect(root).toBe('data')
  })
})