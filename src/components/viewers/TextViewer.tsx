import { ViewerShell } from './ViewerShell'

interface TextViewerProps {
  fileName: string
  filePath: string
  text: string
  loading: boolean
  error: string | null
  onClose: () => void
  formattedJson?: boolean
}

export function TextViewer({
  fileName,
  filePath,
  text,
  loading,
  error,
  onClose,
  formattedJson,
}: TextViewerProps) {
  const display = formattedJson
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(text), null, 2)
        } catch {
          return text
        }
      })()
    : text

  return (
    <ViewerShell
      title={formattedJson ? `JSON: ${fileName}` : fileName}
      subtitle={filePath}
      onClose={onClose}
      loading={loading}
      error={error}
    >
      <pre className="m-0 min-h-[50vh] p-4 font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
        {display || '(leer)'}
      </pre>
    </ViewerShell>
  )
}