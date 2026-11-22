# LocalDir Index

A **browser-only** single-page app that indexes every file in a folder you choose, builds a **JSON metadata manifest**, and lets you **navigate and search** that structure—similar to how collection tools like Airbase organize data, but entirely on the client with **no backend, no Firebase, and no database**.

## What it does

1. You pick a directory (File System Access API or legacy `webkitdirectory` input).
2. The app walks all files and folders and builds:
   - **`tree`**: nested hierarchy for browsing (folders first, sorted by name).
   - **`entries`**: flat list with `searchText` for client-side search.
   - **`stats`**: file count, folder count, total bytes, max depth.
3. You browse via tree + breadcrumbs, search across paths and names, inspect per-node metadata, and **export/import** the full manifest as JSON.
4. **Double-click `.md` files** to open an Obsidian-style viewer: **Reading** (rendered preview, default) or **Source** (raw markdown editor). Toggle with the toolbar or **Ctrl+E** (Cmd+E on Mac). Edits stay in the browser session; use **Download** to save a copy.

Nothing is uploaded; metadata stays in memory unless you export it.

## JSON manifest shape

```json
{
  "version": 1,
  "indexedAt": "2026-11-22T12:00:00.000Z",
  "rootName": "my-project",
  "stats": { "files": 120, "directories": 18, "totalBytes": 5242880, "maxDepth": 6 },
  "tree": { "id": "…", "kind": "directory", "name": "my-project", "path": "", "depth": 0, "children": [] },
  "entries": [{ "id": "…", "kind": "file", "name": "README.md", "path": "README.md", "searchText": "…" }]
}
```

## Run locally

```bash
npm install
npm run dev
```

Dev server: **http://127.0.0.1:3847**

```bash
npm run build
npm run preview
```

## Browser support

| Feature | Chrome / Edge | Firefox / Safari |
|--------|----------------|------------------|
| `showDirectoryPicker` | Yes | No — use “Legacy folder picker” |
| Search & navigation | Yes | Yes |
| Export / import JSON | Yes | Yes |

## Project layout

```
src/
  types/index.ts          # Manifest & node TypeScript types
  lib/
    directory-picker.ts   # FS Access API + webkit fallback
    build-manifest.ts     # Tree + entries builder, export helper
    search.ts             # Client-side search
    mime-hint.ts          # Extension → MIME hints
  hooks/useFileIndex.ts   # App state for indexing & navigation
  components/             # Header, tree, browser, MarkdownEditor, welcome
  hooks/useMarkdownDocument.ts
  lib/file-sources.ts     # In-memory file handles for reading .md content
  App.tsx
```

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- lucide-react icons

No server, no cloud SDKs, no persistence layer.