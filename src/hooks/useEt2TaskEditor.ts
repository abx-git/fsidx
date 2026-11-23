import { useCallback, useEffect, useState } from 'react'
import type { FileSourceStore } from '../lib/file-sources'
import { ensureWritePermission, readTextFromStore, writeTextToStore } from '../lib/file-sources'
import { parseTaskMd } from '../lib/et2/parse-task-md'
import { serializeTaskMd } from '../lib/et2/serialize-task-md'
import { taskIdFromPath, taskRefFromPath, isTaskFilePath } from '../lib/et2/paths'
import { DEFAULT_NEW_TASK_TITLE } from '../lib/et2/constants'
import { humanTaskTitle } from '../lib/et2/display-title'
import { normalizeTaskCommand } from '../lib/et2/task-command'
import { normalizeTaskLink } from '../lib/et2/task-link'
import { syncDoneStatusWithTags } from '../lib/et2/task-tags'
import type { Et2EffortUnit, Et2TaskStatus } from '../types/et2-tasks-bundle'
import { loadEt2TaskRecord, updateEt2TaskInBundle } from '../lib/et2/tasks-bundle'
import { getEffortUnit } from '../lib/et2/task-effort'

export function useEt2TaskEditor(taskPath: string | null, fileSources: FileSourceStore | null) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<Et2TaskStatus>('open')
  const [tags, setTags] = useState<string[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [reminderDate, setReminderDate] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [command, setCommand] = useState('')
  const [effort, setEffort] = useState(0)
  const [effortUnit, setEffortUnit] = useState<Et2EffortUnit>('hours')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isBundled, setIsBundled] = useState(false)

  const markDirty = useCallback(() => setDirty(true), [])

  useEffect(() => {
    if (!taskPath) {
      setTitle('')
      setBody('')
      setTaskId(null)
      setError(null)
      setDirty(false)
      setStatus('open')
      setTags([])
      setDueDate(null)
      setReminderDate(null)
      setLink('')
      setCommand('')
      setEffort(0)
      setEffortUnit('hours')
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

    const applyRecord = (record: {
      id: string
      title: string
      body?: string
      status: Et2TaskStatus
      tags?: string[]
      dueDate?: string | null
      reminderDate?: string | null
      link?: string
      command?: string
      effort?: number
      effortUnit?: Et2EffortUnit
    }) => {
      setTaskId(record.id)
      const resolved = humanTaskTitle(record.title, record.body ?? '', record.id)
      setTitle(resolved === DEFAULT_NEW_TASK_TITLE ? '' : resolved)
      setBody(record.body ?? '')
      setStatus(record.status ?? 'open')
      setTags(record.tags ?? [])
      setDueDate(record.dueDate ?? null)
      setReminderDate(record.reminderDate ?? null)
      setLink(record.link ?? '')
      setCommand(record.command ?? '')
      setEffort(record.effort ?? 0)
      setEffortUnit(getEffortUnit(record.effortUnit))
    }

    void (async () => {
      try {
        if (taskRefFromPath(taskPath)) {
          const ref = taskRefFromPath(taskPath)!
          const record = await loadEt2TaskRecord(fileSources, ref.bundlePath, ref.taskId)
          if (cancelled) return
          setIsBundled(true)
          applyRecord(record)
        } else if (isTaskFilePath(taskPath)) {
          const text = await readTextFromStore(fileSources, taskPath)
          if (cancelled) return
          const id = taskIdFromPath(taskPath) ?? taskPath
          const doc = parseTaskMd(text, id)
          setIsBundled(false)
          applyRecord({
            id: doc.frontmatter.id,
            title: doc.frontmatter.title,
            body: doc.body,
            status: 'open',
            tags: doc.frontmatter.tags,
            dueDate: doc.frontmatter.dueDate ?? null,
            reminderDate: doc.frontmatter.reminderDate ?? null,
            link: doc.frontmatter.link ?? '',
            command: doc.frontmatter.command ?? '',
            effort: doc.frontmatter.effort ?? 0,
            effortUnit: doc.frontmatter.effortUnit,
          })
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
    markDirty()
  }, [markDirty])

  const updateBody = useCallback((v: string) => {
    setBody(v)
    markDirty()
  }, [markDirty])

  const updateStatus = useCallback((v: Et2TaskStatus) => {
    setStatus(v)
    setTags((prev) => syncDoneStatusWithTags(v, prev).tags)
    markDirty()
  }, [markDirty])

  const updateTags = useCallback((v: string[]) => {
    setTags(v)
    markDirty()
  }, [markDirty])

  const updateDueDate = useCallback((v: string | null) => {
    setDueDate(v)
    markDirty()
  }, [markDirty])

  const updateReminderDate = useCallback((v: string | null) => {
    setReminderDate(v)
    markDirty()
  }, [markDirty])

  const updateLink = useCallback((v: string) => {
    setLink(v)
    markDirty()
  }, [markDirty])

  const updateCommand = useCallback((v: string) => {
    setCommand(v)
    markDirty()
  }, [markDirty])

  const updateEffort = useCallback((v: number) => {
    setEffort(v)
    markDirty()
  }, [markDirty])

  const updateEffortUnit = useCallback((v: Et2EffortUnit) => {
    setEffortUnit(v)
    markDirty()
  }, [markDirty])

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
      const synced = syncDoneStatusWithTags(status, tags)
      const patch = {
        title: titleSaved,
        body,
        status: synced.status,
        tags: synced.tags,
        dueDate,
        reminderDate,
        link: normalizeTaskLink(link),
        command: normalizeTaskCommand(command),
        effort: Math.max(0, effort),
        effortUnit,
      }

      if (isBundled) {
        const ref = taskRefFromPath(taskPath)
        if (!ref) throw new Error('Ungültige Aufgabenreferenz')
        const { row } = await updateEt2TaskInBundle(fileSources, ref.bundlePath, ref.taskId, patch)
        setDirty(false)
        return { size: row.size ?? 0, lastModified }
      }

      const id = taskIdFromPath(taskPath) ?? taskId
      const doc = parseTaskMd(await readTextFromStore(fileSources, taskPath), id)
      const text = serializeTaskMd({
        frontmatter: {
          ...doc.frontmatter,
          title: titleSaved,
          tags: patch.tags,
          link: patch.link,
          command: patch.command,
          dueDate: patch.dueDate,
          reminderDate: patch.reminderDate,
          effort: patch.effort,
          effortUnit: patch.effortUnit,
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
  }, [
    taskPath,
    fileSources,
    taskId,
    title,
    body,
    status,
    tags,
    dueDate,
    reminderDate,
    link,
    command,
    effort,
    effortUnit,
    isBundled,
  ])

  return {
    title,
    body,
    status,
    tags,
    dueDate,
    reminderDate,
    link,
    command,
    effort,
    effortUnit,
    updateTitle,
    updateBody,
    updateStatus,
    updateTags,
    updateDueDate,
    updateReminderDate,
    updateLink,
    updateCommand,
    updateEffort,
    updateEffortUnit,
    loading,
    saving,
    error,
    dirty,
    save,
    taskId,
    canEdit: Boolean(fileSources),
  }
}