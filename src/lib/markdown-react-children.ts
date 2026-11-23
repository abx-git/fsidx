import { Children, isValidElement, type ReactNode } from 'react'

/** Flacht react-markdown-Kinder zu Rohtext (für Fence-Blöcke vor dem Highlighting). */
export function reactNodeToPlainText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return reactNodeToPlainText(child.props.children)
      }
      return ''
    })
    .join('')
}