import { runEngine } from '../core/engine'
import type { CalcAction, CalcState, InsertKind } from './types'

const SWIPE_THRESHOLD = 6
const MIN_RESULT_PRECISION = 0
const MAX_RESULT_PRECISION = 12
const DEFAULT_DECIMAL_PRECISION = 3

function clampPrecision(value: number): number {
  return Math.max(MIN_RESULT_PRECISION, Math.min(MAX_RESULT_PRECISION, value))
}

export const initialCalcState: CalcState = {
  expr: '',
  cursorPos: 0,
  angleMode: 'deg',
  exactMode: true,
  shiftOn: false,
  lastAns: null,
  isResult: false,
  resultMain: '',
  resultSub: '',
  resultNumeric: null,
  isError: false,
  resultFormat: 'decimal',
  resultPrecision: DEFAULT_DECIMAL_PRECISION,
  swipeDragStartX: null,
}

function clampCursor(value: number, expr: string): number {
  return Math.max(0, Math.min(value, expr.length))
}

function clearResults(state: CalcState): CalcState {
  return {
    ...state,
    isResult: false,
    resultMain: '',
    resultSub: '',
    resultNumeric: null,
    isError: false,
  }
}

function shouldResetAfterResult(kind: InsertKind, value: string): boolean {
  if (kind === 'digit' || kind === 'paren') {
    return true
  }
  if (kind === 'constant' && (value === 'pi' || value === 'e')) {
    return true
  }
  return false
}

function isOperatorContinuation(value: string): boolean {
  return ['+', '-', '*', '/', '^'].includes(value)
}

function insertAtCursor(state: CalcState, rawValue: string, kind: InsertKind): CalcState {
  let baseExpr = state.expr
  let baseCursor = state.cursorPos

  if (state.isResult) {
    if (shouldResetAfterResult(kind, rawValue)) {
      baseExpr = ''
      baseCursor = 0
    } else if (isOperatorContinuation(rawValue) && state.lastAns !== null) {
      baseExpr = 'ans'
      baseCursor = baseExpr.length
    }
  }

  const value = rawValue === 'ans' && state.lastAns !== null ? `(${state.lastAns})` : rawValue
  const nextChar = baseExpr.slice(baseCursor, baseCursor + 1)
  const shouldAutoCloseFunction = kind === 'function' && value.endsWith('(') && nextChar !== ')'
  const insertedValue = shouldAutoCloseFunction ? `${value})` : value
  const nextExpr = `${baseExpr.slice(0, baseCursor)}${insertedValue}${baseExpr.slice(baseCursor)}`
  const nextCursor = shouldAutoCloseFunction ? baseCursor + value.length : baseCursor + insertedValue.length

  return {
    ...clearResults(state),
    expr: nextExpr,
    cursorPos: clampCursor(nextCursor, nextExpr),
  }
}

export function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'INSERT':
      return insertAtCursor(state, action.value, action.kind)

    case 'DELETE': {
      if (state.cursorPos <= 0 || state.expr.length === 0) {
        return clearResults(state)
      }
      const nextExpr = `${state.expr.slice(0, state.cursorPos - 1)}${state.expr.slice(state.cursorPos)}`
      return {
        ...clearResults(state),
        expr: nextExpr,
        cursorPos: state.cursorPos - 1,
      }
    }

    case 'CLEAR':
      return {
        ...state,
        expr: '',
        cursorPos: 0,
        isResult: false,
        resultMain: '',
        resultSub: '',
        resultNumeric: null,
        isError: false,
      }

    case 'CALCULATE': {
      const computed = runEngine({
        expr: state.expr,
        angleMode: state.angleMode,
        exactMode: state.exactMode,
        lastAns: state.lastAns,
      })

      const hasVisibleResult = computed.resultMain.length > 0 || computed.isError
      return {
        ...state,
        isResult: hasVisibleResult,
        resultMain: computed.resultMain,
        resultSub: computed.resultSub,
        resultNumeric: computed.numericResult,
        isError: computed.isError,
        lastAns: computed.numericResult ?? state.lastAns,
        shiftOn: false,
      }
    }

    case 'SET_ANGLE_MODE':
      return {
        ...clearResults(state),
        angleMode: action.mode,
      }

    case 'SET_EXACT_MODE':
      return {
        ...clearResults(state),
        exactMode: true,
      }

    case 'SET_RESULT_FORMAT':
      return {
        ...clearResults(state),
        resultFormat: action.format,
        resultPrecision: action.format === 'decimal' ? DEFAULT_DECIMAL_PRECISION : state.resultPrecision,
      }

    case 'SET_RESULT_PRECISION':
      return {
        ...clearResults(state),
        resultPrecision: clampPrecision(action.precision),
      }

    case 'TOGGLE_SHIFT':
      return {
        ...state,
        shiftOn: !state.shiftOn,
      }

    case 'SET_CURSOR':
      return {
        ...state,
        cursorPos: clampCursor(action.pos, state.expr),
      }

    case 'MOVE_CURSOR':
      return {
        ...state,
        cursorPos: clampCursor(state.cursorPos + action.delta, state.expr),
      }

    case 'CURSOR_HOME':
      return {
        ...state,
        cursorPos: 0,
        shiftOn: false,
      }

    case 'CURSOR_END':
      return {
        ...state,
        cursorPos: state.expr.length,
        shiftOn: false,
      }

    case 'LOAD_RECENT_CALCULATION': {
      const nextExpr = action.payload.expression
      const computed = runEngine({
        expr: nextExpr,
        angleMode: action.payload.angleMode,
        exactMode: action.payload.exactMode,
        lastAns: state.lastAns,
      })
      const hasVisibleResult = computed.resultMain.length > 0 || computed.isError

      return {
        ...state,
        expr: nextExpr,
        cursorPos: nextExpr.length,
        angleMode: action.payload.angleMode,
        exactMode: true,
        resultFormat: action.payload.resultFormat,
        resultPrecision:
          action.payload.resultFormat === 'decimal'
            ? DEFAULT_DECIMAL_PRECISION
            : clampPrecision(action.payload.resultPrecision),
        shiftOn: false,
        isResult: hasVisibleResult,
        resultMain: computed.resultMain,
        resultSub: computed.resultSub,
        resultNumeric: computed.numericResult,
        isError: computed.isError,
        lastAns: computed.numericResult ?? state.lastAns,
      }
    }

    case 'LOAD_NOTE_CALCULATION': {
      const nextExpr = action.payload.expression
      const nextAngleMode = action.payload.angleMode ?? state.angleMode
      const computed = runEngine({
        expr: nextExpr,
        angleMode: nextAngleMode,
        exactMode: state.exactMode,
        lastAns: state.lastAns,
      })
      const hasVisibleResult = computed.resultMain.length > 0 || computed.isError

      return {
        ...state,
        expr: nextExpr,
        cursorPos: nextExpr.length,
        angleMode: nextAngleMode,
        shiftOn: false,
        isResult: hasVisibleResult,
        resultMain: computed.resultMain,
        resultSub: computed.resultSub,
        resultNumeric: computed.numericResult,
        isError: computed.isError,
        lastAns: computed.numericResult ?? state.lastAns,
      }
    }

    case 'SWIPE_START':
      return {
        ...state,
        swipeDragStartX: action.x,
      }

    case 'SWIPE_MOVE': {
      if (state.swipeDragStartX === null) {
        return state
      }
      const dx = action.x - state.swipeDragStartX
      if (Math.abs(dx) < SWIPE_THRESHOLD) {
        return state
      }
      const step = Math.round(dx / 10)
      if (step === 0) {
        return state
      }
      return {
        ...state,
        swipeDragStartX: action.x,
        cursorPos: clampCursor(state.cursorPos + step, state.expr),
      }
    }

    case 'SWIPE_END':
      return {
        ...state,
        swipeDragStartX: null,
      }

    default:
      return state
  }
}
