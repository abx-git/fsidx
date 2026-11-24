/**
 * Kompatibel mit Encrypted Vault (x-be.de/vault): AES-GCM-256, PBKDF2, Base64URL-Namen.
 * @see https://github.com/abx-git/xbe-site/tree/main/vault
 */

export const VAULT_IV_LENGTH = 12
export const VAULT_KEY_LENGTH = 32
export const VAULT_PBKDF2_ITERATIONS = 250_000
/** Gleicher Salt wie vault/src/crypto.js */
export const VAULT_PBKDF2_SALT = new TextEncoder().encode('encrypted-vault-v1-salt')

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(VAULT_IV_LENGTH))
}

export async function importRawVaultKey(rawBytes: ArrayBuffer | Uint8Array): Promise<CryptoKey> {
  const buf = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes)
  if (buf.byteLength !== VAULT_KEY_LENGTH) {
    throw new Error(`Schlüsseldatei muss exakt ${VAULT_KEY_LENGTH} Bytes lang sein.`)
  }
  const raw = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function deriveVaultKeyFromPassword(password: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: VAULT_PBKDF2_SALT,
      iterations: VAULT_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    VAULT_KEY_LENGTH * 8,
  )
  return crypto.subtle.importKey('raw', derivedBits, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function vaultEncrypt(key: CryptoKey, plaintext: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const iv = generateIv()
  const plain =
    plaintext instanceof Uint8Array
      ? plaintext
      : new Uint8Array(plaintext)
  const plainBuf = plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength) as ArrayBuffer
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    plainBuf,
  )
  const ct = new Uint8Array(ciphertext)
  const result = new Uint8Array(VAULT_IV_LENGTH + ct.byteLength)
  result.set(iv, 0)
  result.set(ct, VAULT_IV_LENGTH)
  return result
}

export async function vaultDecrypt(key: CryptoKey, data: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  if (bytes.byteLength < VAULT_IV_LENGTH + 16) {
    throw new Error('Verschlüsselte Daten zu kurz.')
  }
  const iv = bytes.slice(0, VAULT_IV_LENGTH)
  const ciphertext = bytes.slice(VAULT_IV_LENGTH)
  const ctBuf = ciphertext.buffer.slice(
    ciphertext.byteOffset,
    ciphertext.byteOffset + ciphertext.byteLength,
  ) as ArrayBuffer
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    ctBuf,
  )
  return new Uint8Array(plaintext)
}

export async function encryptVaultName(key: CryptoKey, name: string): Promise<string> {
  const encrypted = await vaultEncrypt(key, new TextEncoder().encode(name))
  return toBase64Url(encrypted)
}

export async function decryptVaultName(key: CryptoKey, encryptedName: string): Promise<string> {
  const plaintext = await vaultDecrypt(key, fromBase64Url(encryptedName))
  return new TextDecoder().decode(plaintext)
}

export async function encryptVaultContent(key: CryptoKey, content: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  return vaultEncrypt(key, content instanceof Uint8Array ? content : new Uint8Array(content))
}

export async function decryptVaultContent(key: CryptoKey, data: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  return vaultDecrypt(key, data)
}