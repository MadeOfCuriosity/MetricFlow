/**
 * Client-side mirror of the backend formula rules (app/core/formula_parser.py):
 * arithmetic (+ - * / % **), parentheses, numbers and snake_case variables.
 * Used to give friendly, as-you-type feedback before the KPI is submitted.
 */

type Token =
  | { kind: 'num'; value: number; text: string; pos: number }
  | { kind: 'ident'; text: string; pos: number }
  | { kind: 'op'; text: '+' | '-' | '*' | '/' | '%' | '**'; pos: number }
  | { kind: 'lparen' | 'rparen'; text: string; pos: number }

type Node =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'unary'; op: '+' | '-'; operand: Node }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '%' | '**'; left: Node; right: Node }

// Python keywords are syntax errors (or reserved) as variable names on the backend
const RESERVED = new Set([
  'True', 'False', 'None', 'and', 'or', 'not', 'if', 'else', 'in', 'is', 'for', 'while',
  'lambda', 'def', 'class', 'return', 'import', 'from', 'as', 'with', 'try', 'except',
  'finally', 'raise', 'pass', 'break', 'continue', 'global', 'nonlocal', 'del', 'yield',
  'assert', 'elif', 'async', 'await',
])

export class FormulaSyntaxError extends Error {}

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i))
    if (num) {
      tokens.push({ kind: 'num', value: parseFloat(num[1]), text: num[1], pos: i })
      i += num[1].length
      continue
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))
    if (ident) {
      tokens.push({ kind: 'ident', text: ident[0], pos: i })
      i += ident[0].length
      continue
    }
    if (src.startsWith('**', i)) {
      tokens.push({ kind: 'op', text: '**', pos: i })
      i += 2
      continue
    }
    if ('+-*/%'.includes(ch)) {
      tokens.push({ kind: 'op', text: ch as '+' | '-' | '*' | '/' | '%', pos: i })
      i++
      continue
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ kind: ch === '(' ? 'lparen' : 'rparen', text: ch, pos: i })
      i++
      continue
    }
    if (ch === '×' || ch === '÷' || ch === '−') {
      throw new FormulaSyntaxError(`Use ${ch === '×' ? '*' : ch === '÷' ? '/' : '-'} instead of "${ch}"`)
    }
    throw new FormulaSyntaxError(
      `"${ch}" isn't allowed. Use field names, numbers, + - * / and parentheses`
    )
  }
  return tokens
}

/** Recursive-descent parser with Python's precedence (** binds tighter than unary minus on its left). */
function parse(tokens: Token[]): Node {
  let i = 0
  const peek = () => tokens[i]
  const describe = (t: Token | undefined) => (t ? `"${t.text}"` : 'the end')

  const expectValueAfter = (op: string): never => {
    if (op === '%') {
      throw new FormulaSyntaxError('Remove the trailing "%" — set the unit to % instead')
    }
    throw new FormulaSyntaxError(`Add a value after "${op}"`)
  }

  function atom(): Node {
    const t = peek()
    if (!t) throw new FormulaSyntaxError('Formula ends too early — add a value')
    if (t.kind === 'num') {
      i++
      return { type: 'num', value: t.value }
    }
    if (t.kind === 'ident') {
      if (RESERVED.has(t.text)) {
        throw new FormulaSyntaxError(`"${t.text}" is a reserved word — rename this field`)
      }
      i++
      if (peek()?.kind === 'lparen') {
        throw new FormulaSyntaxError(`Functions like ${t.text}(…) aren't supported`)
      }
      return { type: 'var', name: t.text }
    }
    if (t.kind === 'lparen') {
      i++
      if (peek()?.kind === 'rparen') throw new FormulaSyntaxError('Empty parentheses "()"')
      const inner = expr()
      if (peek()?.kind !== 'rparen') throw new FormulaSyntaxError('Missing closing parenthesis ")"')
      i++
      return inner
    }
    if (t.kind === 'rparen') throw new FormulaSyntaxError('Unexpected ")" — check your parentheses')
    throw new FormulaSyntaxError(`Unexpected ${describe(t)}`)
  }

  function power(): Node {
    const base = atom()
    if (peek()?.kind === 'op' && peek()!.text === '**') {
      i++
      if (!peek()) expectValueAfter('**')
      return { type: 'bin', op: '**', left: base, right: unary() }
    }
    return base
  }

  function unary(): Node {
    const t = peek()
    if (t?.kind === 'op' && (t.text === '-' || t.text === '+')) {
      i++
      if (!peek()) expectValueAfter(t.text)
      return { type: 'unary', op: t.text, operand: unary() }
    }
    return power()
  }

  function term(): Node {
    let left = unary()
    while (peek()?.kind === 'op' && ['*', '/', '%'].includes(peek()!.text)) {
      const op = peek()!.text as '*' | '/' | '%'
      i++
      if (!peek()) expectValueAfter(op)
      left = { type: 'bin', op, left, right: unary() }
    }
    return left
  }

  function expr(): Node {
    let left = term()
    while (peek()?.kind === 'op' && ['+', '-'].includes(peek()!.text)) {
      const op = peek()!.text as '+' | '-'
      i++
      if (!peek()) expectValueAfter(op)
      left = { type: 'bin', op, left, right: term() }
    }
    return left
  }

  const root = expr()
  const extra = peek()
  if (extra) {
    const prev = tokens[i - 1]
    if (extra.kind === 'rparen') throw new FormulaSyntaxError('Unexpected ")" — check your parentheses')
    if (prev && (prev.kind === 'ident' || prev.kind === 'num') && (extra.kind === 'ident' || extra.kind === 'num')) {
      if (prev.kind === 'ident' && extra.kind === 'ident') {
        throw new FormulaSyntaxError(
          `"${prev.text} ${extra.text}" — use underscores in names (${prev.text}_${extra.text}) or add an operator between them`
        )
      }
      throw new FormulaSyntaxError(`Add an operator between "${prev.text}" and "${extra.text}"`)
    }
    throw new FormulaSyntaxError(`Add an operator before ${describe(extra)}`)
  }
  return root
}

export interface FormulaCheck {
  valid: boolean
  error: string | null
  /** Unique variable names in order of first appearance */
  variables: string[]
}

/** Unique identifiers in the formula, in order (matches backend extract_input_fields). */
export function extractVariables(formula: string): string[] {
  const seen = new Set<string>()
  for (const m of formula.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g)) {
    if (!['True', 'False', 'None', 'and', 'or', 'not'].includes(m[1])) seen.add(m[1])
  }
  return [...seen]
}

export function checkFormula(formula: string): FormulaCheck {
  const variables = extractVariables(formula)
  if (!formula.trim()) return { valid: false, error: 'Formula is empty', variables }
  try {
    parse(tokenize(formula))
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid formula', variables }
  }
  if (variables.length === 0) {
    return { valid: false, error: 'Use at least one data field — a formula of only numbers never changes', variables }
  }
  return { valid: true, error: null, variables }
}

function evalNode(node: Node, values: Record<string, number>): number {
  switch (node.type) {
    case 'num':
      return node.value
    case 'var':
      return values[node.name]
    case 'unary':
      return node.op === '-' ? -evalNode(node.operand, values) : evalNode(node.operand, values)
    case 'bin': {
      const l = evalNode(node.left, values)
      const r = evalNode(node.right, values)
      if ((node.op === '/' || node.op === '%') && r === 0) throw new FormulaSyntaxError('Division by zero')
      switch (node.op) {
        case '+': return l + r
        case '-': return l - r
        case '*': return l * r
        case '/': return l / r
        case '%': return ((l % r) + r) % r // Python modulo semantics
        case '**': return l ** r
      }
    }
  }
}

/** Evaluate a formula with sample values; returns null if it can't be computed. */
export function evaluateFormula(
  formula: string,
  values: Record<string, number>
): { value: number } | { error: string } | null {
  try {
    const root = parse(tokenize(formula))
    if (extractVariables(formula).some((v) => values[v] === undefined || values[v] === null)) return null
    const value = evalNode(root, values)
    return Number.isFinite(value) ? { value } : { error: 'Result is not a finite number' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not compute' }
  }
}

/** The identifier being typed right before the caret, if any. */
export function wordAtCaret(text: string, caret: number): { word: string; start: number; end: number } | null {
  const before = /[A-Za-z_][A-Za-z0-9_]*$/.exec(text.slice(0, caret))
  const after = /^[A-Za-z0-9_]*/.exec(text.slice(caret))
  if (!before) return null
  const start = caret - before[0].length
  const end = caret + (after ? after[0].length : 0)
  return { word: text.slice(start, end), start, end }
}

/** Replace whole-word occurrences of a variable. */
export function renameVariable(formula: string, from: string, to: string): string {
  return formula.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), to)
}

/** Display name for a variable that isn't a data field yet: "total_revenue" → "Total Revenue". */
export function humanizeVariable(name: string): string {
  return name.replace(/_+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Mirrors backend DataFieldService.generate_variable_name. */
export function toVariableName(name: string): string {
  const v = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_').toLowerCase()
  if (!v) return 'unnamed_field'
  return /^\d/.test(v) ? `_${v}` : v
}
