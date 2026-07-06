import { shiftMapping } from '../spec/spec'
import type { CalcAction, InsertKind } from './types'

export interface ResolvedInsert {
  action: CalcAction
  consumeShift: boolean
}

export function classifyInsert(value: string): InsertKind {
  if (/^[0-9]$/.test(value) || value === '.') {
    return 'digit'
  }
  if (['+', '-', '*', '/', '^', '%'].includes(value)) {
    return 'operator'
  }
  if (value === '(' || value === ')') {
    return 'paren'
  }
  if (['pi', 'e', 'ans'].includes(value)) {
    return 'constant'
  }
  if (/^[a-z]+\($/.test(value)) {
    return 'function'
  }
  return 'symbol'
}

export function resolveButtonInsert(label: string, shiftOn: boolean): ResolvedInsert | null {
  const map: Record<string, string> = {
    divide: '/',
    times: '*',
    minus: '-',
    plus: '+',
    equals: '=',
    backspace: 'backspace',
    AC: 'AC',
    rad: 'rad',
    deg: 'deg',
    inv: 'inv',
    sci_E: 'E',
    sqrt: 'sqrt(',
    sin: 'sin(',
    cos: 'cos(',
    tan: 'tan(',
    log: 'log(',
    ln: 'ln(',
    pi: 'pi',
    e: 'e',
    '!': '!',
  }

  const normalized = map[label] ?? label
  if (['=', 'backspace', 'AC', 'rad', 'deg', 'inv'].includes(normalized)) {
    return null
  }

  if (label === '^') {
    return {
      action: {
        type: 'INSERT',
        value: shiftOn ? '^' : '^2',
        kind: shiftOn ? 'operator' : 'symbol',
      },
      consumeShift: shiftOn,
    }
  }

  let insertValue = normalized
  let consumeShift = false

  if (label === 'sqrt') {
    insertValue = normalized
    consumeShift = false
  } else if (shiftOn && typeof shiftMapping[label] === 'string') {
    insertValue = shiftMapping[label] as string
    consumeShift = Boolean(shiftMapping.consume_shift_after_insert)
  }

  return {
    action: {
      type: 'INSERT',
      value: insertValue,
      kind: classifyInsert(insertValue),
    },
    consumeShift,
  }
}
