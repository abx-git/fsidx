import { Loader2, ListTodo, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Et2TaskSummary } from '../../types/et2-task'
import type { FileSourceStore } from '../../lib/file-sources'
import type { Et2EffortUnit, Et2TaskStatus } from '../../types/et2-tasks-bundle'
import { Et2TaskList } from './Et2TaskList'
import { Et2TaskDetailForm } from './Et2TaskDetailForm'

interface TskDetailPanelProps {
  tskPath: string
  fileName: string
  tasks: Et2TaskSummary[]
  loading: boolean
  loadError: string | null
  selectedTaskRef: string | null
  onSelectTask: (taskRef: string) => void
  onNewSubtask: (parentTaskId?: string) => void
  onNewSibling: (anchorTaskId: string) => void
  onRenameTskFile?: () => void
  onDeleteTask: (taskId: string) => void
  onReparentTask: (taskId: string) => void
  onNestTask?: (taskId: string, newParentId: string | null) => void
  onReorderTask?: (taskId: string, anchorTaskId: string, place: 'before' | 'after') => void
  onMoveSibling?: (taskId: string, direction: 'up' | 'down') => void
  onIndentTask?: (taskId: string) => void
  onOutdentTask?: (taskId: string) => void
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
  onDeleteFromDetail: () => void
  editorLoading: boolean
  editorSaving: boolean
  editorDirty: boolean
  editorError: string | null
  editorTaskId: string | null
  titleFocusTick?: number
  fileSources?: FileSourceStore | null
}

export function TskDetailPanel({
  tskPath,
  fileName,
  tasks,
  loading,
  loadError,
  selectedTaskRef,
  onSelectTask,
  onNewSubtask,
  onNewSibling,
  onRenameTskFile,
  onDeleteTask,
  onReparentTask,
  onNestTask,
  onReorderTask,
  onMoveSibling,
  onIndentTask,
  onOutdentTask,
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
  onDeleteFromDetail,
  editorLoading,
  editorSaving,
  editorDirty,
  editorError,
  editorTaskId,
  titleFocusTick = 0,
  fileSources = null,
}: TskDetailPanelProps) {
  const [detailExpanded, setDetailExpanded] = useState(false)

  useEffect(() => {
    setDetailExpanded(false)
  }, [tskPath])

  return (
    <div
      data-tsk-panel=""
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-violet-50/20 dark:bg-violet-950/10"
    >
      <div className="shrink-0 border-b border-violet-200 px-3 py-2 dark:border-violet-900/50">
        <div className="flex items-start justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-violet-900 dark:text-violet-100">
            <ListTodo className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate" title={fileName}>
              Aufgaben · {fileName}
            </span>
          </p>
          {canWrite && onRenameTskFile && (
            <button
              type="button"
              title="Datei umbenennen"
              onClick={onRenameTskFile}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-200 px-2 py-0.5 text-[10px] font-medium text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/50"
            >
              <Pencil className="h-3 w-3" />
              Umbenennen
            </button>
          )}
        </div>
        <p
          className="mt-1 h-4 overflow-hidden text-[10px] leading-4 text-zinc-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {editorSaving ? 'Speichern…' : editorDirty ? 'Änderungen ausstehend…' : null}
        </p>
        {canWrite && (
          <p className="mt-1 text-[10px] text-zinc-500">
            Ein Klick = Auswahl · Doppelklick = Titel bearbeiten · Shift+Klick oder ⋯ =
            Detailansicht · Enter = Edit beenden · Shift+Enter Geschwister · Tab Unteraufgabe ·
            Shift+Pfeile · ↑↓ Auswahl
          </p>
        )}
      </div>

      {loadError && (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40">
          {loadError}
        </p>
      )}

      <div className="flex min-h-0 flex-[0_1_40%] flex-col overflow-y-auto border-b border-zinc-200 dark:border-zinc-800">
        {loading ? (
          <p className="flex items-center gap-2 px-3 py-4 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Laden…
          </p>
        ) : tasks.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-500">Keine Einträge in dieser Datei.</p>
        ) : (
          <Et2TaskList
            tskPath={tskPath}
            tasks={tasks}
            selectedTaskRef={selectedTaskRef}
            onSelectTask={onSelectTask}
            onAddSubtask={(parentId) => onNewSubtask(parentId)}
            onAddSibling={onNewSibling}
            onDeleteTask={onDeleteTask}
            onReparentTask={onReparentTask}
            onNestTask={onNestTask}
            onReorderTask={onReorderTask}
            onMoveSibling={onMoveSibling}
            onIndentTask={onIndentTask}
            onOutdentTask={onOutdentTask}
            canWrite={canWrite}
            inlineTitle={title}
            onInlineTitleChange={onTitleChange}
            titleFocusTick={titleFocusTick}
            onOpenTaskDetail={() => setDetailExpanded(true)}
          />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!detailExpanded ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <p className="text-xs text-zinc-500">
              {selectedTaskRef
                ? 'Shift+Klick auf die Karte oder „Detailansicht“ im Kontextmenü (⋯).'
                : 'Aufgabe in der Liste wählen.'}
            </p>
            {selectedTaskRef && (
              <button
                type="button"
                className="rounded-md border border-violet-200 px-3 py-1 text-[11px] font-medium text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/40"
                onClick={() => setDetailExpanded(true)}
              >
                Detailansicht öffnen
              </button>
            )}
          </div>
        ) : editorLoading ? (
          <p className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Aufgabe laden…
          </p>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-1 dark:border-zinc-800">
              <span className="text-[10px] font-medium text-zinc-500">Detailansicht</span>
              <button
                type="button"
                className="text-[10px] text-violet-700 hover:underline dark:text-violet-300"
                onClick={() => setDetailExpanded(false)}
              >
                Schließen
              </button>
            </div>
            {editorError && (
              <p className="mx-3 mb-2 shrink-0 rounded bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950/40">
                {editorError}
              </p>
            )}
            <Et2TaskDetailForm
              taskId={editorTaskId}
              allTasks={tasks}
              canWrite={canWrite}
              title={title}
              body={body}
              status={status}
              tags={tags}
              dueDate={dueDate}
              reminderDate={reminderDate}
              link={link}
              command={command}
              effort={effort}
              effortUnit={effortUnit}
              onTitleChange={onTitleChange}
              onBodyChange={onBodyChange}
              onStatusChange={onStatusChange}
              onTagsChange={onTagsChange}
              onDueDateChange={onDueDateChange}
              onReminderDateChange={onReminderDateChange}
              onLinkChange={onLinkChange}
              onCommandChange={onCommandChange}
              onEffortChange={onEffortChange}
              onEffortUnitChange={onEffortUnitChange}
              onDelete={onDeleteFromDetail}
              hideTitleField
              assetDocPath={tskPath}
              fileSources={fileSources}
            />
          </>
        )}
      </div>
    </div>
  )
}