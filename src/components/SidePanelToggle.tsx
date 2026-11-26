import { ChevronLeft, ChevronRight, PanelLeft, PanelRight } from 'lucide-react'

export type SidePanelSide = 'left' | 'right'

interface SidePanelToggleProps {
  side: SidePanelSide
  /** Schmal am Rand der sichtbaren Leiste vs. herausragender Tab wenn eingeklappt. */
  mode: 'collapse' | 'expand'
  onClick: () => void
  title: string
  /** Nur für expand-Tab (Barrierefreiheit). */
  ariaLabel?: string
}

export function SidePanelToggle({
  side,
  mode,
  onClick,
  title,
  ariaLabel,
}: SidePanelToggleProps) {
  if (mode === 'expand') {
    const Icon = side === 'left' ? ChevronRight : ChevronLeft
    const PanelIcon = side === 'left' ? PanelLeft : PanelRight
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={ariaLabel ?? title}
        className={`fsidx-side-expand-tab fsidx-side-expand-tab--${side} hidden lg:flex`}
      >
        <PanelIcon className="h-3.5 w-3.5 opacity-70" aria-hidden />
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    )
  }

  const CollapseIcon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      className={`fsidx-side-collapse-btn fsidx-side-collapse-btn--${side}`}
    >
      <CollapseIcon className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}