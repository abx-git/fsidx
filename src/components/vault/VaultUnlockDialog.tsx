import { Loader2, Lock, Shield } from 'lucide-react'
import { useState } from 'react'
import { deriveVaultKeyFromPassword, importRawVaultKey, VAULT_KEY_LENGTH } from '../../lib/vault/crypto'

interface VaultUnlockDialogProps {
  vaultLabel: string
  open: boolean
  onClose: () => void
  onUnlock: (key: CryptoKey) => Promise<void>
}

export function VaultUnlockDialog({ vaultLabel, open, onClose, onUnlock }: VaultUnlockDialogProps) {
  const [mode, setMode] = useState<'password' | 'keyfile'>('password')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submitPassword = async () => {
    setError(null)
    setBusy(true)
    try {
      const key = await deriveVaultKeyFromPassword(password)
      setPassword('')
      await onUnlock(key)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Entsperren fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  const pickKeyFile = async () => {
    setError(null)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.key,.bin,application/octet-stream'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setBusy(true)
      try {
        const buf = await file.arrayBuffer()
        const key = await importRawVaultKey(buf)
        await onUnlock(key)
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : `Schlüsseldatei muss ${VAULT_KEY_LENGTH} Byte sein.`)
      } finally {
        setBusy(false)
      }
    }
    input.click()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Shield className="h-4 w-4 text-blue-800" />
          Tresor entsperren
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{vaultLabel}</span>
          {' '}
          — gleiche Krypto wie{' '}
          <a
            href="https://www.x-be.de/vault/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline"
          >
            x-be Vault
          </a>
          .
        </p>

        <div className="mt-3 flex gap-2 text-[11px]">
          <button
            type="button"
            className={`rounded px-2 py-0.5 ${mode === 'password' ? 'bg-blue-100 text-blue-900' : 'text-zinc-500'}`}
            onClick={() => setMode('password')}
          >
            Passwort
          </button>
          <button
            type="button"
            className={`rounded px-2 py-0.5 ${mode === 'keyfile' ? 'bg-blue-100 text-blue-900' : 'text-zinc-500'}`}
            onClick={() => setMode('keyfile')}
          >
            32-Byte-Schlüsseldatei
          </button>
        </div>

        {mode === 'password' ? (
          <div className="mt-3 space-y-2">
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitPassword()
              }}
            />
            <button
              type="button"
              disabled={busy || !password}
              className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              onClick={() => void submitPassword()}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
              Entsperren
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600"
              onClick={() => void pickKeyFile()}
            >
              Schlüsseldatei wählen…
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

        <button
          type="button"
          className="mt-3 w-full text-center text-[11px] text-zinc-500 hover:underline"
          onClick={onClose}
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}