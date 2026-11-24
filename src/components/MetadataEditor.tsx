import Form from '@rjsf/core'
import type { RJSFSchema, UiSchema } from '@rjsf/utils'
import validator from '@rjsf/validator-ajv8'
import { ArrowLeft, Braces, FormInput, Loader2, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import fileMetadataSchema from '../schemas/file-metadata.v1.schema.json'
import type { FileMetadataV1 } from '../types/file-metadata'
import type { MetadataViewMode } from '../hooks/useSidecarMetadata'
import { parseFileMetadata, serializeFileMetadata } from '../lib/sidecar'

const schema = fileMetadataSchema as RJSFSchema

const uiSchema: UiSchema = {
  $schema: { 'ui:widget': 'hidden' },
  version: { 'ui:widget': 'hidden' },
  target: {
    'ui:options': { label: false },
    path: { 'ui:widget': 'text', 'ui:readonly': true },
    name: { 'ui:widget': 'text', 'ui:readonly': true },
  },
  summary: { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } },
  extensions: {
    'ui:options': {
      orderable: false,
    },
  },
}

interface MetadataEditorProps {
  targetPath: string
  targetName: string
  sidecarPath: string
  data: FileMetadataV1 | null
  onChange: (data: FileMetadataV1) => void
  viewMode: MetadataViewMode
  onViewModeChange: (mode: MetadataViewMode) => void
  loading: boolean
  error: string | null
  dirty: boolean
  isNew: boolean
  canWrite: boolean
  onSave: () => Promise<void>
  onDownload: () => void
  onClose: () => void
  saveError: string | null
}

export function MetadataEditor({
  targetPath,
  targetName,
  sidecarPath,
  data,
  onChange,
  viewMode,
  onViewModeChange,
  loading,
  error,
  dirty,
  isNew,
  canWrite,
  onSave,
  onDownload,
  onClose,
  saveError,
}: MetadataEditorProps) {
  const [saving, setSaving] = useState(false)
  const [sourceText, setSourceText] = useState('')

  const formData = useMemo(() => data ?? undefined, [data])

  const syncSourceFromData = () => {
    if (data) setSourceText(serializeFileMetadata(data))
  }

  const applySource = () => {
    try {
      const parsed = parseFileMetadata(JSON.parse(sourceText))
      onChange(parsed)
      onViewModeChange('form')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ungültiges JSON')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück
          </button>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium">
              Metadaten: {targetName}
            </p>
            <p className="truncate font-mono text-[11px] text-zinc-500">{sidecarPath}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isNew && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-900 dark:bg-blue-950 dark:text-blue-200">
              Neu
            </span>
          )}
          {dirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Ungespeichert
            </span>
          )}
          <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => onViewModeChange('form')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                viewMode === 'form' ? 'bg-blue-800 text-white' : ''
              }`}
            >
              <FormInput className="h-3.5 w-3.5" />
              Formular
            </button>
            <button
              type="button"
              onClick={() => {
                syncSourceFromData()
                onViewModeChange('source')
              }}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                viewMode === 'source' ? 'bg-blue-800 text-white' : ''
              }`}
            >
              <Braces className="h-3.5 w-3.5" />
              JSON
            </button>
          </div>
          <button
            type="button"
            disabled={!dirty || saving || !data}
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Speichern
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!data}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
          >
            Download
          </button>
        </div>
      </header>

      {!canWrite && (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Nur Lesemodus: Sidecar kann als Download gespeichert werden. Ordner mit Schreibzugriff erneut wählen.
        </p>
      )}
      {saveError && (
        <p className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40">
          {saveError}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading && (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade Metadaten…
          </p>
        )}
        {!loading && error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}
        {!loading && !error && viewMode === 'form' && formData && (
          <div className="metadata-form mx-auto max-w-2xl text-left">
            <Form
              schema={schema}
              uiSchema={uiSchema}
              formData={formData}
              validator={validator}
              onChange={(e) => {
                if (e.formData) onChange(e.formData as FileMetadataV1)
              }}
              liveValidate
            >
              <p className="text-xs text-zinc-500">
                Zieldatei: <code>{targetPath}</code> — Schema:{' '}
                <a
                  href={`${import.meta.env.BASE_URL}schemas/file-metadata.v1.schema.json`}
                  className="text-blue-800 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  file-metadata.v1
                </a>
              </p>
            </Form>
          </div>
        )}
        {!loading && !error && viewMode === 'source' && (
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="min-h-[50vh] w-full rounded-lg border border-zinc-300 bg-zinc-50 p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={applySource}
              className="self-start rounded-lg bg-blue-800 px-3 py-1.5 text-sm text-white"
            >
              JSON übernehmen
            </button>
          </div>
        )}
      </div>
    </section>
  )
}