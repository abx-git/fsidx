import { describe, expect, it } from 'vitest'
import { isOpenDocumentTextExtension, isSpreadsheetExtension } from './open-document-preview'

describe('open-document-preview', () => {
  it('erkennt Tabellen- und Text-Endungen', () => {
    expect(isSpreadsheetExtension('ods')).toBe(true)
    expect(isSpreadsheetExtension('xlsx')).toBe(true)
    expect(isOpenDocumentTextExtension('odt')).toBe(true)
    expect(isOpenDocumentTextExtension('odp')).toBe(true)
    expect(isSpreadsheetExtension('odt')).toBe(false)
  })
})