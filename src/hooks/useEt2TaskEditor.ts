import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { ensureWritePermission, readTextFromStore, writeTextToStore } from '../lib/file-sources'
import { parseTaskMd } from '../lib/et2/parse-task-md'
import { serializeTaskMd } from '../lib/et2/serialize-task-md'
import { taskIdFromPath, taskRefFromPath, isTaskFilePath } from '../lib/et2/paths'
import { DEFAULT_NEW_TASK_TITLE } from '../lib/et2/constants'
import { humanTaskTitle } from '../lib/et2/display-title'
import type { Et2TaskStatus } from '../types/et2-tasks-bundle'
import { loadEt2TaskRecord, updateEt2TaskInBundle } from '../lib/et2/tasks-bundle'

export function useEt2TaskEditor(
  taskPath: string | null,
  fileSources: FileSourceStore | null,
) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<Et2TaskStatus>('open')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isBundled, setIsBundled] = useState(false)

  useEffect(() => {
    if (!taskPath) {
      setTitle('')
      setBody('')
      setTaskId(null)
      setError(null)
      setDirty(false)
      setStatus('open')
      setIsBundled(false)
      return
    }

    if (!fileSources) {
      setError('Ordner erneut verbinden, um Aufgaben zu bearbeiten.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setDirty(false)

    const loadBundled = async () => {
      const ref = taskRefFromPath(taskPath)
      if (!ref) return false
      const record = await loadEt2TaskRecord(fileSources, ref.bundlePath, ref.taskId)
      if (cancelled) return true
      setTaskId(record.id)
      setIsBundled(true)
      const resolved = humanTaskTitle(record.title, record.body ?? '', record.id)
      setTitle(resolved === DEFAULT_NEW_TASK_TITLE ? '' : resolved)
      setBody(record.body ?? '')
      setStatus(record.status ?? 'open')
      return true
    }

    const loadLegacy = async () => {
      const text = await readTextFromStore(fileSources, taskPath)
      if (cancelled) return
      const id = taskIdFromPath(taskPath) ?? taskPath
      const doc = parseTaskMd(text, id)
      setTaskId(doc.frontmatter.id)
      setIsBundled(false)
      const resolved = humanTaskTitle(doc.frontmatter.title, doc.body, id)
      setTitle(resolved === DEFAULT_NEW_TASK_TITLE ? '' : resolved)
      setBody(doc.body)
      setStatus('open')
    }

    void (async () => {
      try {
        if (taskRefFromPath(taskPath)) {
          await loadBundled()
        } else if (isTaskFilePath(taskPath)) {
          await loadLegacy()
        } else {
          throw new Error('Unbekannter Aufgabentyp')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Aufgabe konnte nicht geladen werden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [taskPath, fileSources])

  const updateTitle = useCallback((v: string) => {
    setTitle(v)
    setDirty(true)
  }, [])

  const updateBody = useCallback((v: string) => {
    setBody(v)
    setDirty(true)
  }, [])

  const updateStatus = useCallback((v: Et2TaskStatus) => {
    setStatus(v)
    setDirty(true)
  }, [])

  const save = useCallback(async (): Promise<{ size: number; lastModified: number } | null> => {
    if (!taskPath || !fileSources || !taskId) return null
    if (!(await ensureWritePermission(fileSources))) {
      throw new Error('Schreibzugriff verweigert.')
    }
    setSaving(true)
    setError(null)
    try {
      const lastModified = Date.now()
      const titleSaved = title.trim() || DEFAULT_NEW_TASK_TITLE

      if (isBundled) {
        const ref = taskRefFromPath(taskPath)
        if (!ref) throw new Error('Ungültige Aufgabenreferenz')
        const { row } = await updateEt2TaskInBundle(fileSources, ref.bundlePath, ref.taskId, {
          title: titleSaved,
          body,
          status,
        })
        setDirty(false)
        return { size: row.size ?? 0, lastModified }
      }

      const id = taskIdFromPath(taskPath) ?? taskId
      const doc = parseTaskMd(await readTextFromStore(fileSources, taskPath), id)
      const text = serializeTaskMd({
        frontmatter: {
          ...doc.frontmatter,
          title: titleSaved,
        },
        body,
      })
      await writeTextToStore(fileSources, taskPath, text)
      setDirty(false)
      return { size: new Blob([text]).size, lastModified }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speichern fehlgeschlagen'
      setError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [taskPath, fileSources, taskId, title, body, status, isBundled])

  return {
    title,
    body,
    status,
    updateTitle,
    updateBody,
    updateStatus,
    loading,
    saving,
    error,
    dirty,
    save,
    canEdit: Boolean(fileSources),
  }
}