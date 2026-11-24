export const FSIDX_LINK_FORMAT = 'fsidx-link-v1' as const

export interface FsidxLinkFile {
  format: typeof FSIDX_LINK_FORMAT
  version: 1
  title: string
  url: string
  note?: string
}