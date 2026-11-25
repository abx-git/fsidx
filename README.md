# LocalDir Index

A **browser-only** single-page app that indexes every file in a folder you choose, builds a **JSON metadata manifest**, and lets you **navigate and search** that structure—similar to how collection tools like Airbase organize data, but entirely on the client with **no backend, no Firebase, and no database**.

## What it does

1. You pick a directory (File System Access API or legacy `webkitdirectory` input).
2. The app walks all files and folders and builds:
   - **`tree`**: nested hierarchy for browsing (folders first, sorted by name).
   - **`entries`**: flat list with `searchText` for client-side search.
   - **`stats`**: file count, folder count, total bytes, max depth.
3. You browse via tree + breadcrumbs, search across paths and names, inspect per-node metadata, and **export/import** the full manifest as JSON.
4. **Double-click `.md` files**: **Ansicht** (gerendertes Markdown) or **Bearbeiten** (Textarea with formatting toolbar). Autosave when the folder is writable.
5. **Rechtsklick auf eine Datei** → **„Öffnen mit“**: je nach Typ u. a. Markdown, Bild, PDF, Audio/Video, JSON/Text, **Tabellen (ODS/XLS/XLSX)**, **OpenDocument (ODT/ODP)**, Datei-Info. Doppelklick öffnet den Standard-Viewer. ODS/Excel: Tabellen-Vorschau (SheetJS); ODT/ODP: vereinfachte Text-/Folienvorschau (kein LibreOffice-Layout). `.odb` nur Hinweis. **Markdown** wie oben; Bilder: `![](bild.png)` und `![[bild.png]]` im **gleichen Ordner** wie die `.md` bzw. `.tsk.json`.
6. **Metadaten-JSON** weiterhin im Kontextmenü: Sidecar `datei.json` mit Schema-Editor (`file-metadata.v1`).
7. **Aufgaben als Dateien** (`*.tsk.json`, Format `et2-tasks-v1`): beliebig viele Dateien pro Ordner, **ohne** `.et2/`. Links Baum, Mitte Dateiliste, rechts ET2-ähnliche Aufgabenliste + Detailfelder. Legacy `.et2/` bleibt lesbar.

Nothing is uploaded; metadata stays in memory unless you export it.

### Große Ordner

- Beim **ersten Öffnen** erscheint die Oberfläche nach der **ersten Verzeichnisebene**; der **vollständige Index für Suche und Baum** läuft **parallel im Hintergrund** (Batch-Updates, Hinweis in der Kopfzeile).
- Der Hintergrund-Scan liest **ohne** Größe/Zeit pro Datei vorab — Metadaten folgen beim Öffnen einer Datei.
- Fortschritt und UI-Yields verhindern lange Blockaden.
- Nach einem Reload wird der gespeicherte Manifest aus dem Browser-Speicher genutzt — **kein erneuter Vollscan**; Datei-Handles werden **bei Bedarf** vom Root-Handle aufgelöst.
- Aufgaben-Badges im Baum nutzen einen **vorberechneten Index** statt pro Ordner alle Pfade erneut zu scannen.

Echtes Lazy Loading nur beim Expandieren einzelner Unterbäume (Phase B) ist noch nicht umgesetzt — bei sehr tiefen Strukturen dominiert weiterhin der erste Voll-Durchlauf.

## ET2 on disk

Pro Ordner (parallel zu normalen Dateien und `README.md`):

```text
projekt/phase/
  README.md
  Sprint.tsk.json        # et2-tasks-v1 — mehrere Dateien pro Ordner möglich
  Backlog.tsk.json
```

- Schema: [`et2-tasks.v1.schema.json`](public/schemas/et2-tasks.v1.schema.json) (Inhalt von `*.tsk.json`)
- Mapping Monolith → Dateien: [`docs/et2-mapping.md`](docs/et2-mapping.md)

### Web-Link (`*.link.json`)

- Format `fsidx-link-v1`: `title`, `url`, optional `note` — Schema [`fsidx-link.v1.schema.json`](public/schemas/fsidx-link.v1.schema.json)
- Anlegen: **Anlegen → Web-Link**; Bearbeitung in der Seitenleiste; Doppelklick oder **Vorschau** zeigt die Zielseite in einem eingebetteten Browser (iframe). Viele Sites blockieren Einbettung → **Im Tab öffnen**.
- Im Datei-Modus sind `.et2/`-Pfade standardmäßig ausgeblendet („**.et2 anzeigen**“ im Header).

### draw.io (`*.drawio`)

- Anlegen: **Anlegen → draw.io**; der eingebettete **Editor** (diagrams.net) öffnet rechts in der Detailansicht. Änderungen werden automatisch in die Datei geschrieben (Netzwerk nötig).
- **Panel verbreitern** (bis ca. 92 % der Fensterbreite) und **Vollbild** über die ganze App (Esc oder „Vollbild aus“ beendet). **Vorschau** (Viewer/Markdown) nutzt den chromeless-Modus von diagrams.net **ohne** deren Toolbar; in der angehefteten Seitenleiste zusätzlich ohne fsidx-Vorschau-Kopf.
- Unterstützte Endungen: `.drawio`, `.dio`, `.drawio.xml`.

### Scope (Teilbaum)

Der **aktuelle Ordner** ist der Scope: Baum links zeigt nur diesen Teilbaum (z. B. bei `A` siehst du `A`, `B`, `C`; bei `B` nur `B` und darunter). Suche, Aufgabenliste und Dateiliste beziehen sich auf denselben Teilbaum. In der Kopfzeile filtert **Nur Aufgaben** die Suche auf ET2-Aufgabentitel. Am Ordner-Kontextmenü erzeugt **Aufgabenübersicht (Unterbaum)** eine lesende Gesamtliste aller Aufgaben im Unterbaum (Bearbeitung weiterhin in den jeweiligen `*.tsk.json`). Mit Schreibzugriff lassen sich **Dateien und Ordner aus der Mitte per Drag & Drop auf einen Ordner im linken Baum** verschieben (inkl. Unterbaum, Metadaten-Sidecar `.json` und Tresor-Marker; nicht in sich selbst oder in Unterordner). Die **Scope-Leiste** oben in der Mitte springt zu übergeordneten Ordnern zurück; ein Klick auf einen Unterordner (Baum oder Liste) verengt den Scope.

Mit **Schreibzugriff** legst du **Ordner**, **Markdown**, **draw.io**, **Web-Link** und **`.tsk.json`** an (Toolbar „Anlegen“). Eine `.tsk.json` in der Mitte auswählen → rechts **Baumliste** (ein-/ausklappen, Unterkarte, Löschen) und **Karten-Details** wie in ET2: Titel, Beschreibung, Status, Tags, Fälligkeit, Link, Befehl, Aufwand. **Unteraufgaben** per `parentId` in derselben Datei.

### Verschlüsselter Tresor (Vault)

Ordner-Typ **Tresor** (Toolbar „Anlegen“ → Tresor): gleiche Krypto wie [x-be.de/vault](https://www.x-be.de/vault/) — **AES-GCM-256**, Datei- und Ordnernamen als Base64URL, PBKDF2 (250 000, Salt `encrypted-vault-v1-salt`).

- Marker: `.fsidx-vault.json` (`fsidx-vault-v1`) bleibt im Klartext im Tresor-Root; alle anderen Namen/Inhalte sind verschlüsselt.
- Ohne Entsperren siehst du nur den Ordner; mit Passwort oder 32-Byte-Schlüsseldatei werden Inhalte im Index angezeigt und Lesen/Schreiben entschlüsselt im RAM.
- Bestehende Vault-Ordner von x-be können übernommen werden: `.fsidx-vault.json` im Vault-Root anlegen (Schema: [`fsidx-vault.v1.schema.json`](public/schemas/fsidx-vault.v1.schema.json)).

## Sidecar-Metadaten (JSON Schema)

- Schema: [`public/schemas/file-metadata.v1.schema.json`](public/schemas/file-metadata.v1.schema.json) (auch live unter `/fsidx/schemas/...` auf GitHub Pages)
- Pflichtfelder: `version` (1), `target` (`path`, `name`)
- Erweiterbar: `extensions` (beliebige Objekte) und `additionalProperties` auf Root-Ebene
- Optional: `title`, `summary`, `tags`, `status`, `relations`

```json
{
  "$schema": "https://abx-git.github.io/fsidx/schemas/file-metadata.v1.schema.json",
  "version": 1,
  "target": { "path": "notes/idee.md", "name": "idee.md" },
  "title": "Projektidee",
  "tags": ["draft"],
  "extensions": { "my-plugin": { "priority": 2 } }
}
```

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

## Live demo (GitHub Pages)

**URL:** https://abx-git.github.io/fsidx/

**Einmalig – Pages freischalten (sonst bleibt die URL 404):**

1. Warten, bis der [Workflow „Deploy GitHub Pages“](https://github.com/abx-git/fsidx/actions/workflows/deploy-pages.yml) **grün** ist (legt den Branch `gh-pages` an).
2. [Settings → Pages](https://github.com/abx-git/fsidx/settings/pages) öffnen.
3. **Build and deployment** → **Source: Deploy from a branch**
4. **Branch: `gh-pages`** · Ordner: **`/ (root)`** → **Save**
5. Nach 1–2 Minuten ist https://abx-git.github.io/fsidx/ erreichbar.

*(Alternative Quelle „GitHub Actions“ funktioniert erst, wenn Pages im Repo bereits aktiviert ist – deshalb nutzen wir den `gh-pages`-Branch.)*

Repository: https://github.com/abx-git/fsidx

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