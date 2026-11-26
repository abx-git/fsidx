import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { readTextFromStore } from '../lib/file-sources'
import {
  isRBaseDatasetMetaText,
  isRBaseProjectConfigText,
  parseRBaseDatasetMeta,
  parseRBaseProjectConfig,
  type RBaseDatasetMeta,
  type RBaseProjectConfigFile,
} from '../lib/r-base/r-base-meta'
import {
  isRBaseDatasetMetaPath,
  isRBaseProjectConfigPath,
} from '../lib/r-base/r-base-paths'
import { PREVIEW_LOAD_TIMEOUT_MS, PREVIEW_LOAD_TIMEOUT_MESSAGE } from '../lib/preview-load-timeout'

export type RBaseFileSlice = {
  kind: 'dataset' | 'project' | null
  raw: string
  dataset: RBaseDatasetMeta | null
  project: RBaseProjectConfigFile | null
  loading: boolean
  error: string | null
}

export function useRBaseFile(
  rBasePath: string | null,
  fileSources: FileSourceStore | null,
): RBaseFileSlice & { reload: () => Promise<void> } {
  const [raw, setRaw] = useState('')
  const [dataset, setDataset] = useState<RBaseDatasetMeta | null>(null)
  const [project, setProject] = useState<RBaseProjectConfigFile | null>(null)
  const [kind, setKind] = useState<'dataset' | 'project' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!rBasePath || !fileSources) {
      setRaw('')
      setDataset(null)
      setProject(null)
      setKind(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      cancelled = true
      setRaw('')
      setDataset(null)
      setProject(null)
      setKind(null)
      setError(PREVIEW_LOAD_TIMEOUT_MESSAGE)
      setLoading(false)
    }, PREVIEW_LOAD_TIMEOUT_MS)
    try {
      const text = await readTextFromStore(fileSources, rBasePath)
      if (cancelled) return
      if (isRBaseProjectConfigPath(rBasePath)) {
        if (!isRBaseProjectConfigText(text)) {
          throw new Error('Keine gültige r-base.project.json (configVersion 1).')
        }
        const parsed = parseRBaseProjectConfig(JSON.parse(text))
        if (!parsed) throw new Error('Projektkonfiguration konnte nicht gelesen werden.')
        setRaw(text)
        setProject(parsed)
        setDataset(null)
        setKind('project')
        return
      }
      if (isRBaseDatasetMetaPath(rBasePath)) {
        if (!isRBaseDatasetMetaText(text)) {
          throw new Error('Kein gültiges R-Base-Datensatz-meta (schemaVersion 1, locId).')
        }
        const parsed = parseRBaseDatasetMeta(JSON.parse(text))
        if (!parsed) throw new Error('Datensatz-meta konnte nicht gelesen werden.')
        setRaw(text)
        setDataset(parsed)
        setProject(null)
        setKind('dataset')
        return
      }
      throw new Error('Kein R-Base-Dateityp.')
    } catch (err) {
      if (cancelled) return
      setRaw('')
      setDataset(null)
      setProject(null)
      setKind(null)
      setError(err instanceof Error ? err.message : 'R-Base-Datei konnte nicht gelesen werden.')
    } finally {
      clearTimeout(timeoutId)
      if (!cancelled) setLoading(false)
    }
  }, [rBasePath, fileSources])

  useEffect(() => {
    void reload()
  }, [reload])

  return { kind, raw, dataset, project, loading, error, reload }
}