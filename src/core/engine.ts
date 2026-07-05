import { evaluate } from 'mathjs'
import type { AngleMode } from '../spec/spec'

const PI = Math.PI
const FACT_MAX = 20

export interface EngineInput {
  expr: string
  angleMode: AngleMode
  exactMode: boolean
  lastAns: number | null
}

export interface EngineOutput {
  resultMain: string
  resultSub: string
  isError: boolean
  numericResult: number | null
  normalizedExpr: string
}

export function normalizeExpression(expr: string, angleMode: AngleMode, lastAns: number | null): string {
  let normalized = expr

  // 1. Replace pi with numeric literal.
  normalized = normalized.replace(/\bpi\b/g, '3.141592653589793')

  // 2. Replace ans when available.
  if (lastAns !== null && Number.isFinite(lastAns)) {
    normalized = normalized.replace(/\bans\b/g, `(${lastAns})`)
  }

  // 3. Scientific notation: aEb -> (a*10^b)
  normalized = normalized.replace(/(\d+(?:\.\d+)?)E([+-]?\d+)/g, '($1*10^$2)')

  // 4. Expand factorial on bounded integer values.
  normalized = expandFactorials(normalized)

  // 5. Implicit multiplication 2( -> 2*(
  normalized = normalized.replace(/(\d)\(/g, '$1*(')

  // 6. Implicit multiplication )4 -> )*4
  normalized = normalized.replace(/\)(?=\d)/g, ')*')

  // 7. Implicit multiplication 2e -> 2*e, but do not break exp().
  normalized = normalized.replace(/(\d)e(?!xp\s*\()/g, '$1*e')

  // 8. Deg mode trig conversion.
  if (angleMode === 'deg') {
    normalized = replaceFunctionCalls(normalized, ['sin', 'cos', 'tan'], (name, arg) => {
      return `${name}((pi/180)*(${arg}))`
    })
  }

  // 9. Deg mode inverse trig conversion.
  if (angleMode === 'deg') {
    normalized = replaceFunctionCalls(normalized, ['asin', 'acos', 'atan'], (name, arg) => {
      return `((180/pi)*${name}(${arg}))`
    })
  }

  // 10. ln( -> log(
  normalized = normalized.replace(/\bln\s*\(/g, 'log(')

  // 11. exp( -> e^(
  normalized = normalized.replace(/\bexp\s*\(/g, 'e^(')

  return normalized
}

export function runEngine(input: EngineInput): EngineOutput {
  const normalizedExpr = normalizeExpression(input.expr, input.angleMode, input.lastAns)

  let value: number
  try {
    const evalResult = evaluate(normalizedExpr)
    if (typeof evalResult !== 'number') {
      return {
        resultMain: '',
        resultSub: '',
        isError: false,
        numericResult: null,
        normalizedExpr,
      }
    }
    value = evalResult
  } catch {
    return {
      resultMain: '',
      resultSub: '',
      isError: false,
      numericResult: null,
      normalizedExpr,
    }
  }

  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return {
      resultMain: 'Indefini',
      resultSub: '',
      isError: true,
      numericResult: null,
      normalizedExpr,
    }
  }

  const decimal = formatNumber(value)

  if (!input.exactMode) {
    return {
      resultMain: `= ${decimal}`,
      resultSub: '',
      isError: false,
      numericResult: value,
      normalizedExpr,
    }
  }

  const piRepresentation = toPiExpression(value)
  if (piRepresentation) {
    return {
      resultMain: `= ${piRepresentation}`,
      resultSub: `~ ${decimal}`,
      isError: false,
      numericResult: value,
      normalizedExpr,
    }
  }

  const fractionRepresentation = toFraction(value)
  if (fractionRepresentation) {
    if (/^-?\d+\/1$/.test(fractionRepresentation)) {
      const integerValue = fractionRepresentation.slice(0, fractionRepresentation.indexOf('/'))
      return {
        resultMain: `= ${integerValue}`,
        resultSub: '',
        isError: false,
        numericResult: value,
        normalizedExpr,
      }
    }

    return {
      resultMain: `= ${fractionRepresentation}`,
      resultSub: `~ ${decimal}`,
      isError: false,
      numericResult: value,
      normalizedExpr,
    }
  }

  return {
    resultMain: `= ${decimal}`,
    resultSub: '',
    isError: false,
    numericResult: value,
    normalizedExpr,
  }
}

export function formatNumber(value: number): string {
  const abs = Math.abs(value)

  if (Number.isInteger(value) && abs < 1e15) {
    return value.toString()
  }

  if ((abs > 0 && abs < 1e-4) || abs >= 1e10) {
    return Number(value.toPrecision(8)).toString()
  }

  return Number(value.toPrecision(10)).toString()
}

function expandFactorials(expr: string): string {
  return expr.replace(/(\d+)!/g, (_m, rawN: string) => {
    const n = Number(rawN)
    if (!Number.isInteger(n) || n < 0 || n > FACT_MAX) {
      return `${rawN}!`
    }
    return String(factorial(n))
  })
}

function factorial(n: number): number {
  let out = 1
  for (let i = 2; i <= n; i += 1) {
    out *= i
  }
  return out
}

function replaceFunctionCalls(
  input: string,
  names: string[],
  mapper: (name: string, arg: string) => string,
): string {
  let output = input

  for (const name of names) {
    let idx = 0
    while (idx < output.length) {
      const found = output.indexOf(`${name}(`, idx)
      if (found === -1) {
        break
      }

      // Word boundary to avoid matching in identifiers.
      const before = found === 0 ? '' : output[found - 1]
      if (/[a-zA-Z0-9_]/.test(before)) {
        idx = found + name.length
        continue
      }

      const argStart = found + name.length + 1
      const argEnd = findMatchingParen(output, argStart - 1)
      if (argEnd === -1) {
        idx = found + name.length
        continue
      }

      const argRaw = output.slice(argStart, argEnd)
      const replacement = mapper(name, argRaw)
      output = output.slice(0, found) + replacement + output.slice(argEnd + 1)
      idx = found + replacement.length
    }
  }

  return output
}

function findMatchingParen(text: string, openIdx: number): number {
  let depth = 0
  for (let i = openIdx; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '(') {
      depth += 1
    }
    if (ch === ')') {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
  }
  return -1
}

function toFraction(value: number): string | null {
  const epsilon = 1e-9
  const sign = value < 0 ? -1 : 1
  const abs = Math.abs(value)

  for (let denom = 2; denom <= 1000; denom += 1) {
    const numer = Math.round(abs * denom)
    if (Math.abs(abs - numer / denom) < epsilon) {
      const g = gcd(numer, denom)
      const n = (sign * numer) / g
      const d = denom / g
      return `${n}/${d}`
    }
  }

  return null
}

function toPiExpression(value: number): string | null {
  const epsilon = 1e-9
  const ratio = value / PI
  const sign = ratio < 0 ? -1 : 1
  const abs = Math.abs(ratio)

  const integerMultiple = Math.round(abs)
  if (Math.abs(abs - integerMultiple) < epsilon) {
    const n = integerMultiple * sign
    if (n === 0) {
      return '0'
    }
    if (n === 1) {
      return 'pi'
    }
    if (n === -1) {
      return '-pi'
    }
    return `${n}pi`
  }

  for (let denom = 2; denom <= 20; denom += 1) {
    const numer = Math.round(abs * denom)
    if (Math.abs(abs - numer / denom) < epsilon) {
      const g = gcd(numer, denom)
      const n = (sign * numer) / g
      const d = denom / g
      if (n === 1) {
        return `pi/${d}`
      }
      if (n === -1) {
        return `-pi/${d}`
      }
      return `${n}pi/${d}`
    }
  }

  return null
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}
