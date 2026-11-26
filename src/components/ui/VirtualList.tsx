import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const DEFAULT_ROW_PX = 44
const OVERSCAN = 8

interface VirtualListProps<T> {
  items: readonly T[]
  rowHeight?: number
  className?: string
  empty?: ReactNode
  getKey: (item: T, index: number) => string
  renderRow: (item: T, index: number) => ReactNode
}

export function VirtualList<T>({
  items,
  rowHeight = DEFAULT_ROW_PX,
  className = '',
  empty,
  getKey,
  renderRow,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState({ start: 0, end: 40, height: 0 })

  const updateRange = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const total = items.length * rowHeight
    const scrollTop = el.scrollTop
    const view = el.clientHeight
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
    const visibleCount = Math.ceil(view / rowHeight) + OVERSCAN * 2
    const end = Math.min(items.length, start + visibleCount)
    setRange({ start, end, height: total })
  }, [items.length, rowHeight])

  useLayoutEffect(() => {
    updateRange()
  }, [updateRange, items])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => updateRange())
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateRange])

  if (items.length === 0) {
    return <div className={className}>{empty}</div>
  }

  const slice = items.slice(range.start, range.end)
  const offsetY = range.start * rowHeight

  return (
    <div
      ref={scrollRef}
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${className}`}
      onScroll={updateRange}
    >
      <p className="sr-only">{items.length} Einträge</p>
      <div aria-hidden style={{ height: range.height, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, i) => {
            const index = range.start + i
            return (
              <div key={getKey(item, index)} style={{ minHeight: rowHeight }}>
                {renderRow(item, index)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}