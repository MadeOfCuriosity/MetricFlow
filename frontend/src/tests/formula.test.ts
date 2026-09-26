import { describe, it, expect } from 'vitest'
import {
  checkFormula,
  evaluateFormula,
  extractVariables,
  renameVariable,
  toVariableName,
  wordAtCaret,
} from '../lib/formula'

describe('checkFormula', () => {
  it('accepts valid arithmetic with variables', () => {
    const r = checkFormula('(revenue - expenses) / revenue * 100')
    expect(r.valid).toBe(true)
    expect(r.variables).toEqual(['revenue', 'expenses'])
  })

  it.each([
    ['a +', 'Add a value after "+"'],
    ['(a + b', 'Missing closing parenthesis'],
    ['a + b)', 'Unexpected ")"'],
    ['sum(a)', "Functions like sum(…) aren't supported"],
    ['a $ b', '"$" isn\'t allowed'],
    ['a × b', 'Use * instead'],
    ['total revenue / 2', 'use underscores in names (total_revenue)'],
    ['a * 100%', 'set the unit to % instead'],
    ['100 * 5', 'Use at least one data field'],
    ['True + a', 'reserved word'],
  ])('rejects %j with a helpful message', (formula, message) => {
    const r = checkFormula(formula)
    expect(r.valid).toBe(false)
    expect(r.error).toContain(message)
  })
})

describe('evaluateFormula', () => {
  it('follows Python precedence', () => {
    expect(evaluateFormula('-a ** 2', { a: 3 })).toEqual({ value: -9 })
    expect(evaluateFormula('(a - b) / a * 100', { a: 200, b: 50 })).toEqual({ value: 75 })
  })

  it('reports division by zero and missing values', () => {
    expect(evaluateFormula('a / b', { a: 1, b: 0 })).toEqual({ error: 'Division by zero' })
    expect(evaluateFormula('a / b', { a: 1 })).toBeNull()
  })
})

describe('helpers', () => {
  it('finds the word at the caret', () => {
    expect(wordAtCaret('(rev - x', 4)).toEqual({ word: 'rev', start: 1, end: 4 })
    expect(wordAtCaret('a + ', 4)).toBeNull()
  })

  it('renames whole words only', () => {
    expect(renameVariable('rev + revenue / rev', 'rev', 'sales')).toBe('sales + revenue / sales')
  })

  it('extracts and derives variable names like the backend', () => {
    expect(extractVariables('a + b * a')).toEqual(['a', 'b'])
    expect(toVariableName('Revenue Per Employee')).toBe('revenue_per_employee')
    expect(toVariableName('2024 Sales')).toBe('_2024_sales')
  })
})
