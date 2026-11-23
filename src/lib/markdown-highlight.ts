import hljs from 'highlight.js/lib/common'

const LANG_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  docker: 'dockerfile',
}

export function resolveHighlightLanguage(lang: string | undefined): string | undefined {
  if (!lang) return undefined
  const lower = lang.toLowerCase()
  const canon = LANG_ALIASES[lower] ?? lower
  return hljs.getLanguage(canon) ? canon : lower
}

export function highlightMarkdownCode(
  source: string,
  language: string | undefined,
): { html: string; hlLanguage: string } {
  const text = source.replace(/\n$/, '')
  const resolved = resolveHighlightLanguage(language)
  if (resolved && hljs.getLanguage(resolved)) {
    const { value } = hljs.highlight(text, { language: resolved })
    return { html: value, hlLanguage: resolved }
  }
  const { value, language: detected } = hljs.highlightAuto(text, ['plaintext', 'markdown'])
  return { html: value, hlLanguage: detected ?? 'plaintext' }
}

export function hljsCodeClass(lang: string): string {
  return `hljs language-${lang}`
}