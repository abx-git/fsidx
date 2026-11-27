import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const AUX_PAGES = ['e2-edit.html', 'rbase-open.html']

const stripRe =
  /<link rel="manifest"[^>]*>\s*|<meta name="theme-color"[^>]*>\s*|<meta name="mobile-web-app-capable"[^>]*>\s*|<meta name="apple-mobile-web-app-capable"[^>]*>\s*|<meta name="apple-mobile-web-app-title"[^>]*>\s*|<link rel="apple-touch-icon"[^>]*>\s*/gi

function stripPwaMeta(html: string): string {
  return html.replace(stripRe, '')
}

const pluginDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(pluginDir, '..')

/** Manifest/Web-App-Meta nur auf der Hauptseite — verhindert zweite „App“ (z. B. E2-Editor). */
export function fsidxPwaScopePlugin(): Plugin {
  return {
    name: 'fsidx-pwa-scope',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const file = (ctx.filename ?? ctx.path ?? '').replace(/\\/g, '/')
        const isAux = AUX_PAGES.some((name) => file.includes(name))
        if (!isAux) return html
        return stripPwaMeta(html)
      },
    },
    closeBundle() {
      const distDir = path.join(repoRoot, 'dist')
      for (const name of AUX_PAGES) {
        const file = path.join(distDir, name)
        if (!fs.existsSync(file)) continue
        fs.writeFileSync(file, stripPwaMeta(fs.readFileSync(file, 'utf8')))
      }
    },
  }
}