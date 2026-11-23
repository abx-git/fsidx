# Markdown-Editor (fsidx)

## Stack

| Komponente | Rolle |
|-----------|--------|
| `FsidxMarkdownEditor` | Einzige Editor-UI (`.md`-Dateien, ET2-Beschreibungen) |
| `buildFsidxMarkdownExtensions` | CodeMirror-Extensions: `live` oder `source` |
| `fsidxMarkdownLivePreview` | StateField: zeilenweise Vorschau-Widgets |
| `MarkdownContent` / `MarkdownLineContent` | React-Rendering in Widgets + Lesemodus |
| `MarkdownTextareaWithToolbar` | Nur ET2 `simple`-Felder (kleine Beschreibungen) |

## Modi

- **live** (`viewMode: reading`): nur die Zeile unter der Schreibmarke als Roh-Markdown, alle anderen Zeilen gerendert (kein Block-Highlight).
- **source** (`viewMode: source`): voller CodeMirror-Quelltext, Zeilennummern, ohne Vorschau.

## Entfernt (Legacy)

- `@mdxeditor/editor` (WYSIWYG)
- Block-Editor (`markdown-blocks`, `BlockMarkdownView`)
- separater `ObsidianLiveMarkdownEditor` / `WysiwygMarkdownEditor`
- eigene Maus-Overrides (`fsidxMarkdownPointer`)

## Regeln

Keine zweite Editor-Pipeline einführen — Erweiterungen über `buildFsidxMarkdownExtensions` und `fsidxMarkdownLivePreview`.