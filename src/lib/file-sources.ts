export type FileSourceStore =
  | {
      kind: 'handles'
      rootName: string
      handles: Map<string, FileSystemFileHandle>
    }
  | {
      kind: 'files'
      rootName: string
      files: Map<string, File>
    }

export async function readTextFromStore(
  store: FileSourceStore,
  relativePath: string,
): Promise<string> {
  if (store.kind === 'files') {
    const file = store.files.get(relativePath)
    if (!file) throw new Error('File not found in the indexed folder snapshot.')
    return file.text()
  }

  const handle = store.handles.get(relativePath)
  if (!handle) throw new Error('File not found in the indexed folder.')
  const file = await handle.getFile()
  return file.text()
}

export function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith('.md') || path.toLowerCase().endsWith('.markdown')
}