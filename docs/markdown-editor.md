# Markdown-Editor (fsidx)

## Stack

| Komponente | Rolle |
|-----------|--------|
| `MarkdownEditor` | `.md`-Dateien: **Ansicht** oder **Bearbeiten** |
| `MarkdownContent` | Gerenderte Vorschau (react-markdown) |
| `MarkdownTextareaWithToolbar` | Bearbeiten mit Menüzeile (Formatierung) |
| `LivePreviewMarkdown` | Dünner Wrapper für ET2-Beschreibungsfelder |

## Modi

- **Ansicht** (`viewMode: view`): formatiertes Markdown, **Syntax-Highlighting** in Code-Fences (highlight.js / GitHub Dark), Diagramme und Bilder aus dem Workspace.
- **Bearbeiten** (`viewMode: edit`): Monospace-Textarea mit Toolbar (nur wenn Schreibrecht).

## Entfernt

- CodeMirror Live-Vorschau (Obsidian-Zeile-für-Zeile)
- `@mdxeditor/editor`, Block-Editor, MDX-Pipelines

## Regeln

Keine zweite Rendering-Pipeline: Vorschau nur über `MarkdownContent`, Bearbeiten nur über `MarkdownTextareaWithToolbar`.