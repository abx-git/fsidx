import type { IndexNode } from '../types'

/** Beschreibungsdatei pro Verzeichnis (liegt im Ordner selbst). */
export const DIRECTORY_README_NAME = 'README.md'

export function directoryReadmePath(directoryPath: string): string {
  return directoryPath ? `${directoryPath}/${DIRECTORY_README_NAME}` : DIRECTORY_README_NAME
}

export function buildDefaultDirectoryReadme(
  directory: IndexNode,
  rootName: string,
): string {
  const title = directory.path ? directory.name : rootName
  const children = directory.children ?? []
  const dirs = children.filter((c) => c.kind === 'directory')
  const files = children.filter(
    (c) => c.kind === 'file' && c.name !== DIRECTORY_README_NAME,
  )

  const dirLines =
    dirs.length > 0
      ? dirs.map((d) => `- **${d.name}/**`).join('\n')
      : '_Keine Unterordner_'

  const fileLines =
    files.length > 0
      ? files.map((f) => `- \`${f.name}\``).join('\n')
      : '_Keine Dateien_'

  return `# ${title}

Kurze Beschreibung dieses Verzeichnisses und seines Zwecks.

## Inhalt

### Unterordner

${dirLines}

### Dateien

${fileLines}

---

_Bearbeitet in LocalDir Index._
`
}