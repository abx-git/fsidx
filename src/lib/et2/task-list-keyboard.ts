const PANEL_SELECTOR = '[data-tsk-panel]'

/** Kurzbefehle in der Aufgabenliste, ohne Markdown- oder andere Editoren. */
export function shouldHandleEt2TaskListShortcuts(e: KeyboardEvent): boolean {
  const panel = document.querySelector(PANEL_SELECTOR)
  if (!panel) return false
  const target = e.target
  if (!(target instanceof Element)) return true
  if (!panel.contains(target)) {
    const typingElsewhere = target.closest(
      'textarea, input[type="text"], input[type="search"], [contenteditable="true"]',
    )
    return !typingElsewhere
  }
  if (target.closest('[data-et2-detail-field]')) return false
  if (target instanceof HTMLTextAreaElement) return false
  if (target instanceof HTMLSelectElement) return false
  if (target.hasAttribute('data-et2-inline-title')) return true
  if (target.closest('[data-et2-task-list]')) return true
  return !target.closest('input, textarea, select, [contenteditable="true"]')
}

export function isArrowKey(e: Pick<KeyboardEvent, 'key' | 'code'>): boolean {
  return (
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.code === 'ArrowUp' ||
    e.code === 'ArrowDown' ||
    e.code === 'ArrowLeft' ||
    e.code === 'ArrowRight'
  )
}

export type Et2MindmapKeyContext = {
  taskId: string | null
  canWrite: boolean
  onSibling?: (anchorTaskId: string) => void
  onSubtask?: (parentTaskId: string) => void
  onMoveSibling?: (taskId: string, direction: 'up' | 'down') => void
  onIndent?: (taskId: string) => void
  onOutdent?: (taskId: string) => void
  onNavigate?: (direction: 'up' | 'down') => void
  editingInline?: boolean
  onEndInlineEdit?: () => void
}

/** Mindmap-Kürzel: Shift+Enter = Geschwister, Enter = Schnell-Edit beenden, Tab = Unteraufgabe. */
type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'> & {
  preventDefault?: () => void
  stopPropagation?: () => void
}

export function handleEt2MindmapListKey(e: KeyLike, ctx: Et2MindmapKeyContext): boolean {
  const { taskId, canWrite } = ctx
  if (!canWrite || !taskId) return false
  if (e.ctrlKey || e.metaKey || e.altKey) return false

  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault?.()
    ctx.onSubtask?.(taskId)
    return true
  }

  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault?.()
    if (ctx.editingInline) ctx.onEndInlineEdit?.()
    ctx.onSibling?.(taskId)
    return true
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    if (ctx.editingInline) {
      e.preventDefault?.()
      ctx.onEndInlineEdit?.()
      return true
    }
    return false
  }

  if (!e.shiftKey || !isArrowKey(e)) return false

  const dir =
    e.key === 'ArrowUp' || e.code === 'ArrowUp'
      ? 'up'
      : e.key === 'ArrowDown' || e.code === 'ArrowDown'
        ? 'down'
        : e.key === 'ArrowLeft' || e.code === 'ArrowLeft'
          ? 'left'
          : e.key === 'ArrowRight' || e.code === 'ArrowRight'
            ? 'right'
            : null
  if (!dir) return false
  e.preventDefault?.()
  e.stopPropagation?.()
  if (dir === 'up') ctx.onMoveSibling?.(taskId, 'up')
  else if (dir === 'down') ctx.onMoveSibling?.(taskId, 'down')
  else if (dir === 'left') ctx.onOutdent?.(taskId)
  else ctx.onIndent?.(taskId)
  return true
}

export function handleEt2MindmapNavigateKey(
  e: KeyLike,
  ctx: Pick<Et2MindmapKeyContext, 'onNavigate'>,
): boolean {
  if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false
  if (!isArrowKey(e) || !ctx.onNavigate) return false
  if (e.key === 'ArrowUp' || e.code === 'ArrowUp') {
    e.preventDefault?.()
    ctx.onNavigate('up')
    return true
  }
  if (e.key === 'ArrowDown' || e.code === 'ArrowDown') {
    e.preventDefault?.()
    ctx.onNavigate('down')
    return true
  }
  return false
}