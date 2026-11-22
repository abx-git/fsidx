import type { FileIndexManifest, IndexNode } from '../types'
import { formatBytes, formatDate } from '../lib/format'

interface DetailPanelProps {
  manifest: FileIndexManifest
  node: IndexNode | null
  jsonPreview: string
}

export function DetailPanel({ manifest, node, jsonPreview }: DetailPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Metadata</h2>
        <p className="text-xs text-zinc-500">Selection and JSON slice from the index</p>
      </div>
      {node ? (
        <dl className="space-y-2 border-b border-zinc-200 px-3 py-3 text-sm dark:border-zinc-800">
          <div>
            <dt className="text-xs text-zinc-500">Name</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">{node.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Path</dt>
            <dd className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {node.path || manifest.rootName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Kind</dt>
            <dd>{node.kind}</dd>
          </div>
          {node.extension && (
            <div>
              <dt className="text-xs text-zinc-500">Extension</dt>
              <dd>.{node.extension}</dd>
            </div>
          )}
          {node.mimeHint && (
            <div>
              <dt className="text-xs text-zinc-500">MIME hint</dt>
              <dd className="font-mono text-xs">{node.mimeHint}</dd>
            </div>
          )}
          {node.kind === 'file' && (
            <div>
              <dt className="text-xs text-zinc-500">Size</dt>
              <dd>{formatBytes(node.size ?? 0)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-zinc-500">Modified</dt>
            <dd>{formatDate(node.lastModified)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Node id</dt>
            <dd className="font-mono text-xs">{node.id}</dd>
          </div>
        </dl>
      ) : (
        <p className="px-3 py-4 text-sm text-zinc-500">Select a file or folder to inspect its metadata.</p>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-zinc-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
          JSON
        </div>
        <pre className="min-h-0 flex-1 overflow-auto bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {jsonPreview}
        </pre>
      </div>
    </aside>
  )
}