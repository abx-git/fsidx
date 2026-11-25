import { describe, expect, it } from 'vitest'
import { rangeSelectIds } from './list-selection'

describe('rangeSelectIds', () => {
  const order = ['a', 'b', 'c', 'd', 'e']

  it('wählt Bereich zwischen Anker und Ziel', () => {
    expect([...rangeSelectIds(order, 'b', 'd')]).toEqual(['b', 'c', 'd'])
    expect([...rangeSelectIds(order, 'd', 'b')]).toEqual(['b', 'c', 'd'])
  })

  it('fällt auf Ziel zurück ohne Anker in Liste', () => {
    expect([...rangeSelectIds(order, 'x', 'c')]).toEqual(['c'])
  })
})