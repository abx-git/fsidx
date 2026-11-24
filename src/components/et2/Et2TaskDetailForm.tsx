import { Check, ChevronDown, Copy, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Et2EffortUnit, Et2TaskStatus } from '../../types/et2-tasks-bundle'
import { DEFAULT_NEW_TASK_TITLE } from '../../lib/et2/constants'
import { ET2_TASK_STATUS_OPTIONS } from '../../lib/et2/task-status-labels'
import { LivePreviewMarkdown } from '../markdown/LivePreviewMarkdown'
import {
  fromInputDateTimeLocal,
  toInputDateTimeLocalFromIso,
  toIsoDateString,
} from '../../lib/et2/task-datetime'
import {
  collectAllTagsFromTasks,
  setCompletedTagOnTags,
  isTaskMarkedDone,
  tagChipClass,
  uniqNonEmptyTags,
} from '../../lib/et2/task-tags'
import { EFFORT_UNITS, EFFORT_UNIT_LABELS } from '../../lib/et2/task-effort'
import { formatTaskIdForDisplay } from '../../lib/et2/task-id'
import { DEFAULT_COMPLETED_TAG } from '../../lib/et2/task-tags'
import type { Et2TaskSummary } from '../../types/et2-task'
import type { FileSourceStore } from '../../lib/file-sources'

const fieldClass =
  'w-full rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-950'
const labelClass = 'text-[10px] font-medium leading-tight text-zinc-500'

interface Et2TaskDetailFormProps {
  taskId: string | null
  allTasks: Et2TaskSummary[]
  canWrite: boolean
  title: string
  body: string
  status: Et2TaskStatus
  tags: string[]
  dueDate: string | null
  reminderDate: string | null
  link: string
  command: string
  effort: number
  effortUnit: Et2EffortUnit
  onTitleChange: (v: string) => void
  onBodyChange: (v: string) => void
  onStatusChange: (v: Et2TaskStatus) => void
  onTagsChange: (v: string[]) => void
  onDueDateChange: (v: string | null) => void
  onReminderDateChange: (v: string | null) => void
  onLinkChange: (v: string) => void
  onCommandChange: (v: string) => void
  onEffortChange: (v: number) => void
  onEffortUnitChange: (v: Et2EffortUnit) => void
  onDelete: () => void
  titleInputRef?: React.RefObject<HTMLInputElement | null>
  hideTitleField?: boolean
  assetDocPath?: string
  fileSources?: FileSourceStore | null
}

function CollapsibleBlock({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-1 px-1.5 py-1 text-left text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/40"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{title}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-zinc-100 px-1.5 pb-1.5 pt-1 dark:border-zinc-800">
          {children}
        </div>
      )}
    </div>
  )
}

export function Et2TaskDetailForm({
  taskId,
  allTasks,
  canWrite,
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
  onTitleChange,
  onBodyChange,
  onStatusChange,
  onTagsChange,
  onDueDateChange,
  onReminderDateChange,
  onLinkChange,
  onCommandChange,
  onEffortChange,
  onEffortUnitChange,
  onDelete,
  titleInputRef,
  hideTitleField = false,
  assetDocPath,
  fileSources = null,
}: Et2TaskDetailFormProps) {
  const [tagDraft, setTagDraft] = useState('')
  const [idCopied, setIdCopied] = useState(false)
  const [timeFieldsOpen, setTimeFieldsOpen] = useState(false)
  const [metaFieldsOpen, setMetaFieldsOpen] = useState(false)
  const pickableTags = collectAllTagsFromTasks(allTasks).filter(
    (t) => !tags.some((x) => x.toLowerCase() === t.toLowerCase()),
  )

  useEffect(() => {
    setTagDraft('')
    setIdCopied(false)
  }, [taskId])

  if (!taskId) {
    return <p className="px-2 py-4 text-center text-xs text-zinc-500">Aufgabe in der Liste wählen.</p>
  }

  const done = isTaskMarkedDone({ tags, status })

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-1.5">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[9px] text-zinc-600 dark:bg-zinc-800"
          onClick={() => {
            void navigator.clipboard.writeText(taskId)
            setIdCopied(true)
            window.setTimeout(() => setIdCopied(false), 1200)
          }}
        >
          {formatTaskIdForDisplay(taskId)}
          {idCopied ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5 opacity-60" />}
        </button>
        <select
          id="et2-detail-status"
          data-et2-detail-field
          className={`${fieldClass} max-w-[8.5rem] shrink-0 py-0.5`}
          value={status}
          disabled={!canWrite}
          title="Status"
          onChange={(e) => onStatusChange(e.target.value as Et2TaskStatus)}
        >
          {ET2_TASK_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!canWrite}
          className={`ml-auto inline-flex h-6 shrink-0 items-center gap-0.5 rounded border px-1.5 text-[10px] font-medium ${
            done
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-zinc-200 bg-white text-zinc-600'
          }`}
          aria-pressed={done}
          onClick={() => {
            const nextDone = !done
            onTagsChange(setCompletedTagOnTags(tags, DEFAULT_COMPLETED_TAG, nextDone))
            onStatusChange(nextDone ? 'done' : 'open')
          }}
        >
          <Check className="h-3 w-3" />
          Erledigt
        </button>
      </div>

      {!hideTitleField && (
        <div className="mt-1 shrink-0">
          <label className={labelClass} htmlFor="et2-detail-title">
            Titel
          </label>
          <input
            id="et2-detail-title"
            data-et2-detail-field
            ref={titleInputRef}
            className={`${fieldClass} mt-0.5`}
            value={title}
            disabled={!canWrite}
            placeholder={DEFAULT_NEW_TASK_TITLE}
            onChange={(e) => onTitleChange(e.target.value)}
            onFocus={(e) => {
              if (e.target.value === DEFAULT_NEW_TASK_TITLE) onTitleChange('')
            }}
          />
        </div>
      )}

      <div className="mt-1 flex min-h-0 flex-1 flex-col">
        <label className={labelClass} htmlFor="et2-detail-body">
          Notiz
        </label>
        <div
          className="mt-0.5 min-h-0 flex-1 overflow-y-auto [&_.markdown-preview]:max-w-none"
          data-et2-detail-field
          id="et2-detail-body"
        >
          <LivePreviewMarkdown
            content={body}
            onChange={onBodyChange}
            canWrite={canWrite}
            simple
            docPath={assetDocPath}
            fileSources={fileSources}
            minHeightClass="min-h-[4.5rem]"
          />
        </div>
      </div>

      <div className="mt-1.5 max-h-[38%] shrink-0 space-y-1 overflow-y-auto">
        <div>
          <label className={labelClass} htmlFor="et2-detail-tags">
            Tags
          </label>
          <div className="mt-0.5 flex flex-wrap gap-0.5">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                disabled={!canWrite}
                className={tagChipClass(tag)}
                onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
              >
                {tag} ×
              </button>
            ))}
          </div>
          <input
            id="et2-detail-tags"
            data-et2-detail-field
            className={`${fieldClass} mt-0.5`}
            disabled={!canWrite}
            value={tagDraft}
            placeholder="Tag, Enter"
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              onTagsChange(uniqNonEmptyTags([...tags, tagDraft]))
              setTagDraft('')
            }}
          />
          {pickableTags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-0.5">
              {pickableTags.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  disabled={!canWrite}
                  className="rounded border border-dashed border-zinc-300 px-1 py-px text-[9px] text-zinc-500"
                  onClick={() => onTagsChange(uniqNonEmptyTags([...tags, tag]))}
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <CollapsibleBlock
          title="Fälligkeit & Aufwand"
          open={timeFieldsOpen}
          onToggle={() => setTimeFieldsOpen((v) => !v)}
        >
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="et2-detail-due">
                Fällig
              </label>
              <input
                id="et2-detail-due"
                data-et2-detail-field
                type="datetime-local"
                className={`${fieldClass} mt-0.5`}
                disabled={!canWrite}
                value={toInputDateTimeLocalFromIso(dueDate)}
                onChange={(e) =>
                  onDueDateChange(toIsoDateString(fromInputDateTimeLocal(e.target.value)))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="et2-detail-rem">
                Erinnerung
              </label>
              <input
                id="et2-detail-rem"
                data-et2-detail-field
                type="datetime-local"
                className={`${fieldClass} mt-0.5`}
                disabled={!canWrite}
                value={toInputDateTimeLocalFromIso(reminderDate)}
                onChange={(e) =>
                  onReminderDateChange(toIsoDateString(fromInputDateTimeLocal(e.target.value)))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className={labelClass} htmlFor="et2-detail-effort">
                Aufwand
              </label>
              <input
                id="et2-detail-effort"
                data-et2-detail-field
                type="number"
                min={0}
                step="any"
                className={`${fieldClass} mt-0.5`}
                disabled={!canWrite}
                value={effort}
                onChange={(e) => onEffortChange(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="et2-detail-unit">
                Einheit
              </label>
              <select
                id="et2-detail-unit"
                data-et2-detail-field
                className={`${fieldClass} mt-0.5`}
                disabled={!canWrite}
                value={effortUnit}
                onChange={(e) => onEffortUnitChange(e.target.value as Et2EffortUnit)}
              >
                {EFFORT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {EFFORT_UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CollapsibleBlock>

        <CollapsibleBlock
          title="Link & Befehl"
          open={metaFieldsOpen}
          onToggle={() => setMetaFieldsOpen((v) => !v)}
        >
          <div>
            <label className={labelClass} htmlFor="et2-detail-link">
              Link
            </label>
            <input
              id="et2-detail-link"
              data-et2-detail-field
              className={`${fieldClass} mt-0.5`}
              disabled={!canWrite}
              value={link}
              onChange={(e) => onLinkChange(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="et2-detail-cmd">
              Befehl
            </label>
            <textarea
              id="et2-detail-cmd"
              data-et2-detail-field
              className={`${fieldClass} mt-0.5 min-h-[2.25rem] font-mono text-[10px]`}
              disabled={!canWrite}
              value={command}
              onChange={(e) => onCommandChange(e.target.value)}
            />
          </div>
        </CollapsibleBlock>

        <button
          type="button"
          disabled={!canWrite}
          className="flex w-full items-center justify-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-40 dark:border-rose-900 dark:bg-rose-950/40"
          onClick={() => {
            if (window.confirm('Aufgabe inkl. Unteraufgaben löschen?')) onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
          Löschen
        </button>
      </div>
    </div>
  )
}