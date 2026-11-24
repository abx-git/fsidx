import { describe, expect, it, vi } from 'vitest'
import { handleEt2MindmapListKey, handleEt2MindmapNavigateKey } from './task-list-keyboard'

describe('handleEt2MindmapListKey', () => {
  const base = {
    taskId: 't1',
    canWrite: true,
    onSibling: vi.fn(),
    onSubtask: vi.fn(),
    onMoveSibling: vi.fn(),
    onIndent: vi.fn(),
    onOutdent: vi.fn(),
  }

  it('Tab legt Unteraufgabe an', () => {
    const onSubtask = vi.fn()
    const e = { key: 'Tab', code: 'Tab', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault: vi.fn() }
    expect(
      handleEt2MindmapListKey(e, { ...base, onSubtask, onSibling: vi.fn(), onMoveSibling: vi.fn(), onIndent: vi.fn(), onOutdent: vi.fn() }),
    ).toBe(true)
    expect(onSubtask).toHaveBeenCalledWith('t1')
  })

  it('Shift+Enter legt Geschwister an', () => {
    const onSibling = vi.fn()
    const e = { key: 'Enter', code: 'Enter', shiftKey: true, altKey: false, ctrlKey: false, metaKey: false, preventDefault: vi.fn() }
    handleEt2MindmapListKey(e, { ...base, onSibling, onSubtask: vi.fn(), onMoveSibling: vi.fn(), onIndent: vi.fn(), onOutdent: vi.fn() })
    expect(onSibling).toHaveBeenCalledWith('t1')
  })

  it('Enter beendet Schnell-Edit ohne Geschwister', () => {
    const onSibling = vi.fn()
    const onEnd = vi.fn()
    const e = { key: 'Enter', code: 'Enter', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault: vi.fn() }
    expect(
      handleEt2MindmapListKey(e, {
        ...base,
        editingInline: true,
        onEndInlineEdit: onEnd,
        onSibling,
        onSubtask: vi.fn(),
        onMoveSibling: vi.fn(),
        onIndent: vi.fn(),
        onOutdent: vi.fn(),
      }),
    ).toBe(true)
    expect(onEnd).toHaveBeenCalled()
    expect(onSibling).not.toHaveBeenCalled()
  })

  it('Shift+Pfeile sortiert und rückt ein', () => {
    const onMove = vi.fn()
    const onIndent = vi.fn()
    const onOutdent = vi.fn()
    const mk = (key: string) => ({
      key,
      code: key,
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    })
    handleEt2MindmapListKey(mk('ArrowUp'), { ...base, onSibling: vi.fn(), onSubtask: vi.fn(), onMoveSibling: onMove, onIndent, onOutdent })
    expect(onMove).toHaveBeenCalledWith('t1', 'up')
    handleEt2MindmapListKey(mk('ArrowRight'), { ...base, onSibling: vi.fn(), onSubtask: vi.fn(), onMoveSibling: onMove, onIndent, onOutdent })
    expect(onIndent).toHaveBeenCalledWith('t1')
    handleEt2MindmapListKey(mk('ArrowLeft'), { ...base, onSibling: vi.fn(), onSubtask: vi.fn(), onMoveSibling: onMove, onIndent, onOutdent })
    expect(onOutdent).toHaveBeenCalledWith('t1')
  })
})

describe('handleEt2MindmapNavigateKey', () => {
  it('Pfeil hoch/runter ohne Modifier', () => {
    const onNavigate = vi.fn()
    const up = { key: 'ArrowUp', code: 'ArrowUp', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault: vi.fn() }
    expect(handleEt2MindmapNavigateKey(up, { onNavigate })).toBe(true)
    expect(onNavigate).toHaveBeenCalledWith('up')
  })
})