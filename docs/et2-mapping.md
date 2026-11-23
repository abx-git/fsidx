# ET2 ↔ fsidx Datei-Mapping

Quelle: [abx-git/ET2](https://github.com/abx-git/ET2), Format `hierarchical-task-manager`, Board `scope: "board"`.

## Auf der Platte (fsidx)

| Pfad | Inhalt |
|------|--------|
| `<ordner>/.et2/folder.json` | Ordner-Metadaten (`et2-folder-v1`) |
| `<ordner>/.et2/tasks/<id>.task.md` | Eine Aufgabe (`et2-task-v1` Frontmatter + Markdown) |
| `<ordner>/.et2/relations.json` | `TaskRelation[]` zwischen direkten Kindern dieser Ebene |

Die **Hierarchie** aus der Monolith-JSON wird zu **Unterordnern**; jeder Knoten erhält eine eigene Task-Datei im Ordner dieses Knotens.

## Task-Frontmatter ↔ `TaskNode`

| ET2 `TaskNode` | `.task.md` Frontmatter / Body |
|----------------|------------------------------|
| `id` | `id` |
| `kind` | `kind` |
| `title` | `title` |
| `tags` | `tags` |
| `description` | Markdown-Body (card) |
| `markdown` | Markdown-Body (note) |
| `link`, `command` | `link`, `command` |
| `dueDate`, `reminderDate` | ISO-Strings |
| `effort`, `effortUnit` | Zahlen/Enum |
| Canvas `x`,`y`,… | optional in `et2.canvas` |

`children` werden **nicht** in der Datei gespeichert — nur als Unterverzeichnisse.

## ET2-Kartenfelder ↔ `*.tsk.json` (`et2-tasks-v1`)

| ET2 Karte (`TaskNode`) | `Et2TaskRecord` in `.tsk.json` |
|------------------------|------------------------------|
| `title` | `title` |
| `description` | `body` (Markdown) |
| `tags` | `tags[]` |
| `link`, `command` | `link`, `command` |
| `dueDate`, `reminderDate` | ISO-Strings |
| `effort`, `effortUnit` | `effort`, `effortUnit` |
| `children[]` | `parentId` (flacher Wald, mehrere Ebenen in einer Datei) |
| Status (Tag „Erledigt“ / Filter) | `status` + optional Tag `Erledigt` |

## Migration `et2-board.json`

1. Jeder Root in `roots[]` → Top-Level-Ordner unter gewähltem Ziel.
2. Rekursiv: `children[]` → Unterordner; Knoten → `.et2/tasks/<id>.task.md`.
3. Board-`relations` → aufgeteilt in `.et2/relations.json` pro Elternebene (nur Geschwister).