export function validateVaultPlainName(name: string): string {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) throw new Error('Name darf nicht leer sein.')
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Name darf keinen Schrägstrich enthalten.')
  }
  if (trimmed === '.' || trimmed === '..') throw new Error('Ungültiger Name.')
  return trimmed
}