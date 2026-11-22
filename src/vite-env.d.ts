/// <reference types="vite/client" />

type FileSystemPermissionMode = 'read' | 'readwrite'

interface FileSystemHandle {
  queryPermission(descriptor?: { mode?: FileSystemPermissionMode }): Promise<PermissionState>
  requestPermission(descriptor?: {
    mode?: FileSystemPermissionMode
  }): Promise<PermissionState>
}

interface Window {
  showDirectoryPicker: (options?: {
    mode?: FileSystemPermissionMode
    id?: string
  }) => Promise<FileSystemDirectoryHandle>
}