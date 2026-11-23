import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { ensureWritePermission, readTextFromStore, writeTextToStore } from '../lib/file-sources'
import { parseTaskMd } from '../lib/et2/parse-task-md'
import { serializeTaskMd } from '../lib/et2/serialize-task-md'
import { taskIdFromPath } from '../lib/et2/paths'
import { DEFAULT_NEW_TASK_TITLE } from '../lib/et2/constants'
import { humanTaskTitle } from '../lib/et2/display-title'

export function useEt2TaskEditor(
  taskPath: string | null,
  fileSources: FileSourceStore | null,
) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (!taskPath) {
      setTitle('')
      setBody('')
      setTaskId(null)
      setError(null)
      setDirty(false)
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

    readTextFromStore(fileSources, taskPath)
      .then((text) => {
        if (cancelled) return
        const id = taskIdFromPath(taskPath) ?? taskPath
        const doc = parseTaskMd(text, id)
        setTaskId(doc.frontmatter.id)
        const resolved = humanTaskTitle(doc.frontmatter.title, doc.body, id)
        setTitle(resolved === DEFAULT_NEW_TASK_TITLE ? '' : resolved)
        setBody(doc.body)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Aufgabe konnte nicht geladen werden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

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

  const save = useCallback(async (): Promise<{ size: number; lastModified: number } | null> => {
    if (!taskPath || !fileSources || !taskId) return null
    if (!(await ensureWritePermission(fileSources))) {
      throw new Error('Schreibzugriff verweigert.')
    }
    setSaving(true)
    setError(null)
    try {
      const id = taskIdFromPath(taskPath) ?? taskId
      const doc = parseTaskMd(await readTextFromStore(fileSources, taskPath), id)
      const text = serializeTaskMd({
        frontmatter: {
          ...doc.frontmatter,
          title: title.trim() || doc.frontmatter.title || DEFAULT_NEW_TASK_TITLE,
        },
        body,
      })
      await writeTextToStore(fileSources, taskPath, text)
      setDirty(false)
      const lastModified = Date.now()
      return { size: new Blob([text]).size, lastModified }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speichern fehlgeschlagen'
      setError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [taskPath, fileSources, taskId, title, body])

  return {
    title,
    body,
    updateTitle,
    updateBody,
    loading,
    saving,
    error,
    dirty,
    save,
    canEdit: Boolean(fileSources),
  }
}