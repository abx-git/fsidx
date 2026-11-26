/** Löst einen relativen Pfad unter fsidx-Root zu einem DirectoryHandle auf. */
export async function resolveDirectoryHandleAtPath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemDirectoryHandle> {
  const norm = relativePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  if (!norm) return root
  let current = root
  for (const segment of norm.split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(segment)
  }
  return current
}