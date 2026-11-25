import { BOARD_SNAPSHOT_SCHEMA_ID } from './e2-schema-constants'

function newViewId(): string {
  return `view-${Math.random().toString(36).slice(2, 10)}`
}

/** Minimal board-snapshot v2 aligned with abx-git/E2 defaults. */
export function newE2BoardJson(title = 'Neues E2-Board'): string {
  const viewId = newViewId()
  const now = new Date().toISOString()
  const doc = {
    $schema: BOARD_SNAPSHOT_SCHEMA_ID,
    format: 'event-storming-tool',
    version: 2,
    exportedAt: now,
    title,
    glossary: [],
    actionItems: [],
    bookmarks: [],
    appearance: {
      workspaceColor: '#f4f4f5',
      dockColor: '#ffffff',
      preset: 'waypoints',
    },
    workshopMode: false,
    activeViewId: viewId,
    views: [
      {
        id: viewId,
        name: 'Board',
        type: 'canvas',
        modelingMode: 'event-storming',
        workshopFormat: 'free',
        facilitatorEnabled: false,
        facilitatorPhase: 0,
        elements: [],
        connectors: [],
        relations: [],
        contextRelations: [],
        swimlanes: [],
        boundedContexts: [],
        canvasLines: [],
        timeline: { y: 200, visible: false, startLabel: '', endLabel: '' },
        viewport: { x: 0, y: 0, zoom: 1 },
        snapToTimeline: false,
        snapToGrid: false,
        customCardTypes: [],
      },
    ],
  }
  return JSON.stringify(doc, null, 2)
}