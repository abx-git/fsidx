const PANEL_SELECTOR = '[data-tsk-panel]'

/** Kurzbefehle in der Aufgabenliste, ohne Markdown- oder andere Editoren. */
export function shouldHandleEt2TaskListShortcuts(e: KeyboardEvent): boolean {
  const panel = document.querySelector(PANEL_SELECTOR)
  if (!panel) return false
  const target = e.target
  if (!(target instanceof Element)) return true
  if (panel.contains(target)) {
    if (target instanceof HTMLTextAreaElement) return false
    if (target instanceof HTMLSelectElement) return false
    if (target instanceof HTMLInputElement && target.id === 'et2-detail-tags') return false
    return true
  }
  const typingElsewhere = target.closest(
    'textarea, input[type="text"], input[type="search"], [contenteditable="true"]',
  )
  return !typingElsewhere
}

export function isArrowKey(e: KeyboardEvent): boolean {
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