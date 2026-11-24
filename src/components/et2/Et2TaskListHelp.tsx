import { HelpCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-100 pt-2 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <p className="mb-1 font-medium text-violet-900 dark:text-violet-200">{title}</p>
      <ul className="list-none space-y-1 text-zinc-600 dark:text-zinc-300">{children}</ul>
    </div>
  )
}

function HelpRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <li className="flex gap-2">
      <span className="w-28 shrink-0 font-mono text-[10px] text-violet-800 dark:text-violet-300">{keys}</span>
      <span>{desc}</span>
    </li>
  )
}

export function Et2TaskListHelp({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (rootRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc, true)
    return () => document.removeEventListener('pointerdown', onDoc, true)
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Hilfe zur Aufgabenliste"
        aria-expanded={open}
        title="Hilfe"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-violet-200 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/50"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-[90] mt-1 max-h-[min(70vh,24rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 text-left text-[11px] shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          role="dialog"
          aria-label="Aufgabenliste – Bedienung"
        >
          <p className="mb-2 text-xs font-semibold text-violet-900 dark:text-violet-100">Bedienung</p>

          <HelpSection title="Maus">
            <HelpRow keys="Klick" desc="Aufgabe auswählen" />
            {canWrite && (
              <>
                <HelpRow keys="Doppelklick" desc="Titel direkt auf der Karte bearbeiten" />
                <HelpRow keys="Shift+Klick" desc="Detailansicht öffnen" />
                <HelpRow keys="⋯ Menü" desc="Aktionen inkl. Detailansicht" />
                <HelpRow keys="Ziehen (⋮⋮)" desc="Verschieben oder umsortieren (Linien beim Ziehen)" />
              </>
            )}
          </HelpSection>

          {canWrite && (
            <>
              <HelpSection title="Tastatur (Liste fokussiert)">
                <HelpRow keys="↑ / ↓" desc="Auswahl in der Liste" />
                <HelpRow keys="Enter" desc="Schnell-Edit beenden" />
                <HelpRow keys="Shift+Enter" desc="Neue Aufgabe (gleiche Ebene)" />
                <HelpRow keys="Tab" desc="Unteraufgabe anlegen" />
                <HelpRow keys="Shift+↑/↓" desc="Reihenfolge unter Geschwistern" />
                <HelpRow keys="Shift+←/→" desc="Ausrücken / einrücken" />
              </HelpSection>

              <HelpSection title="Speichern">
                <HelpRow keys="—" desc="Titel und Felder werden automatisch gespeichert" />
              </HelpSection>
            </>
          )}

          {!canWrite && (
            <HelpSection title="Hinweis">
              <li className="text-zinc-600 dark:text-zinc-300">
                Schreiben: Arbeitsordner in Chrome/Edge mit Schreibzugriff öffnen.
              </li>
            </HelpSection>
          )}
        </div>
      )}
    </div>
  )
}