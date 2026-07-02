import { useEffect, useMemo, useReducer, useRef } from 'react'
import { calcSpec, physicalKeyboard } from '../spec/spec'
import { calcReducer, initialCalcState } from './reducer'
import { classifyInsert, resolveButtonInsert } from './actions'
import { runEngine } from '../core/engine'
import { formatEngineeringNumber } from '../core/resultFormat'
import { readRecentCalculations, writeRecentCalculations } from './history'
import type { CalcState } from './types'
import type { RecentCalculation } from './history'

const HISTORY_KEY = 'scientific-calculator-history'
const ACTIVE_STATE_KEY = 'scientific-calculator-active-state'
const DEFAULT_DECIMAL_PRECISION = 3

function normalizePastedExpression(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/\n+/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[×x]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .trim()
}

function normalizeResultForClipboard(value: string): string {
  return value.replace(/^=\s*/, '').replace(/^≈\s*/, '').trim()
}

function clampCursor(value: number, expr: string): number {
  return Math.max(0, Math.min(value, expr.length))
}

function clampPrecision(value: number): number {
  return Math.max(0, Math.min(12, value))
}

function applyDisplayFormatting(args: {
  resultMain: string
  resultSub: string
  isError: boolean
  resultNumeric: number | null
  exactMode: boolean
  resultFormat: CalcState['resultFormat']
  resultPrecision: number
}): { resultMain: string; resultSub: string; isError: boolean; resultNumeric: number | null } {
  const { resultMain, resultSub, isError, resultNumeric, exactMode, resultFormat, resultPrecision } = args

  if (isError || resultNumeric === null || !Number.isFinite(resultNumeric)) {
    return { resultMain, resultSub, isError, resultNumeric: null }
  }

  const formatted = formatEngineeringNumber(resultNumeric, resultFormat, resultPrecision)

  if (!exactMode) {
    return {
      resultMain: `= ${formatted}`,
      resultSub: '',
      isError,
      resultNumeric,
    }
  }

  if (resultSub.trim()) {
    return {
      resultMain,
      resultSub: `~ ${formatted}`,
      isError,
      resultNumeric,
    }
  }

  const cleanedMain = normalizeResultForClipboard(resultMain)
  const numericMain = Number(cleanedMain)
  if (cleanedMain && Number.isFinite(numericMain)) {
    return {
      resultMain: `= ${formatted}`,
      resultSub: '',
      isError,
      resultNumeric,
    }
  }

  return { resultMain, resultSub, isError, resultNumeric }
}

function loadInitialCalcState(): CalcState {
  const raw = localStorage.getItem(ACTIVE_STATE_KEY)
  if (!raw) {
    return initialCalcState
  }

  try {
    const parsed = JSON.parse(raw) as Partial<typeof initialCalcState>

    const expr = typeof parsed.expr === 'string' ? parsed.expr : initialCalcState.expr
    const cursorPosRaw = typeof parsed.cursorPos === 'number' ? parsed.cursorPos : initialCalcState.cursorPos

    const angleMode = parsed.angleMode === 'rad' ? 'rad' : 'deg'
    const resultFormat = parsed.resultFormat === 'scientific' ? 'scientific' : 'decimal'
    const resultPrecision =
      resultFormat === 'decimal'
        ? DEFAULT_DECIMAL_PRECISION
        : typeof parsed.resultPrecision === 'number'
          ? clampPrecision(parsed.resultPrecision)
          : initialCalcState.resultPrecision

    return {
      expr,
      cursorPos: clampCursor(cursorPosRaw, expr),
      angleMode,
      exactMode: true,
      shiftOn: typeof parsed.shiftOn === 'boolean' ? parsed.shiftOn : initialCalcState.shiftOn,
      lastAns: typeof parsed.lastAns === 'number' && Number.isFinite(parsed.lastAns) ? parsed.lastAns : null,
      isResult: typeof parsed.isResult === 'boolean' ? parsed.isResult : initialCalcState.isResult,
      resultMain: typeof parsed.resultMain === 'string' ? parsed.resultMain : initialCalcState.resultMain,
      resultSub: typeof parsed.resultSub === 'string' ? parsed.resultSub : initialCalcState.resultSub,
      resultNumeric:
        typeof parsed.resultNumeric === 'number' && Number.isFinite(parsed.resultNumeric) ? parsed.resultNumeric : null,
      isError: typeof parsed.isError === 'boolean' ? parsed.isError : initialCalcState.isError,
      resultFormat,
      resultPrecision,
      swipeDragStartX: null,
    }
  } catch {
    return initialCalcState
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true
  }

  return target.isContentEditable
}

function isEditableElementFocused(): boolean {
  return isEditableTarget(document.activeElement)
}

interface UseCalculatorOptions {
  disableKeyboardShortcuts?: boolean
  resumeCalculation?: RecentCalculation | null
  resumeFromNote?: { expression: string; angleMode?: 'deg' | 'rad' } | null
}

export function useCalculator(options: UseCalculatorOptions = {}) {
  const { disableKeyboardShortcuts = false, resumeCalculation = null, resumeFromNote = null } = options
  const [state, dispatch] = useReducer(calcReducer, undefined, loadInitialCalcState)
  const stateRef = useRef(state)
  const lastPersistedResultSignatureRef = useRef<string>('')
  const keyHoldTimeoutRef = useRef<number | null>(null)
  const keyHoldIntervalRef = useRef<number | null>(null)
  const keyHoldActionRef = useRef<'ArrowLeft' | 'ArrowRight' | 'Backspace' | null>(null)

  stateRef.current = state

  useEffect(() => {
    const clearKeyHoldRepeat = () => {
      if (keyHoldTimeoutRef.current !== null) {
        window.clearTimeout(keyHoldTimeoutRef.current)
        keyHoldTimeoutRef.current = null
      }
      if (keyHoldIntervalRef.current !== null) {
        window.clearInterval(keyHoldIntervalRef.current)
        keyHoldIntervalRef.current = null
      }
      keyHoldActionRef.current = null
    }

    const dispatchHeldKeyboardAction = (key: 'ArrowLeft' | 'ArrowRight' | 'Backspace') => {
      const current = stateRef.current
      if (key === 'Backspace') {
        dispatch({ type: 'DELETE' })
        return
      }
      if (key === 'ArrowLeft') {
        if (current.shiftOn) {
          dispatch({ type: 'CURSOR_HOME' })
        } else {
          dispatch({ type: 'MOVE_CURSOR', delta: -1 })
        }
        return
      }
      if (current.shiftOn) {
        dispatch({ type: 'CURSOR_END' })
      } else {
        dispatch({ type: 'MOVE_CURSOR', delta: 1 })
      }
    }

    const startKeyHoldRepeat = (key: 'ArrowLeft' | 'ArrowRight' | 'Backspace') => {
      clearKeyHoldRepeat()
      keyHoldActionRef.current = key
      keyHoldTimeoutRef.current = window.setTimeout(() => {
        dispatchHeldKeyboardAction(key)
        keyHoldIntervalRef.current = window.setInterval(() => {
          dispatchHeldKeyboardAction(key)
        }, 70)
      }, 320)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (disableKeyboardShortcuts) {
        return
      }

      const { key } = event
      const current = stateRef.current

      // Keep OS/browser shortcuts working (copy/paste/select all, etc.).
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target) || isEditableElementFocused()) {
        return
      }

      if (key === 'Enter' || key === 'NumpadEnter') {
        event.preventDefault()
        dispatch({ type: 'CALCULATE' })
        return
      }
      if (key === 'Backspace') {
        event.preventDefault()
        if (keyHoldActionRef.current === 'Backspace') {
          return
        }
        dispatchHeldKeyboardAction('Backspace')
        startKeyHoldRepeat('Backspace')
        return
      }
      if (key === 'Escape') {
        event.preventDefault()
        dispatch({ type: 'CLEAR' })
        return
      }
      if (key === 'Home') {
        event.preventDefault()
        dispatch({ type: 'CURSOR_HOME' })
        return
      }
      if (key === 'End') {
        event.preventDefault()
        dispatch({ type: 'CURSOR_END' })
        return
      }

      if (key === 'ArrowLeft') {
        event.preventDefault()
        if (keyHoldActionRef.current === 'ArrowLeft') {
          return
        }
        dispatchHeldKeyboardAction('ArrowLeft')
        startKeyHoldRepeat('ArrowLeft')
        return
      }

      if (key === 'ArrowRight') {
        event.preventDefault()
        if (keyHoldActionRef.current === 'ArrowRight') {
          return
        }
        dispatchHeldKeyboardAction('ArrowRight')
        startKeyHoldRepeat('ArrowRight')
        return
      }

      const lower = key.toLowerCase()
      if (physicalKeyboard.char_events.allowed_direct.includes(key)) {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: key, kind: classifyInsert(key) })
        return
      }

      if (lower === 'p') {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: 'pi', kind: 'constant' })
        return
      }

      if (lower === 's') {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: current.shiftOn ? 'asin(' : 'sin(', kind: 'function' })
        if (current.shiftOn) {
          dispatch({ type: 'TOGGLE_SHIFT' })
        }
        return
      }

      if (lower === 'c') {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: current.shiftOn ? 'acos(' : 'cos(', kind: 'function' })
        if (current.shiftOn) {
          dispatch({ type: 'TOGGLE_SHIFT' })
        }
        return
      }

      if (lower === 't') {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: current.shiftOn ? 'atan(' : 'tan(', kind: 'function' })
        if (current.shiftOn) {
          dispatch({ type: 'TOGGLE_SHIFT' })
        }
        return
      }

      if (lower === 'l') {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: 'log(', kind: 'function' })
        return
      }

      if (lower === 'n') {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: 'ln(', kind: 'function' })
        return
      }

      if (lower === 'r') {
        event.preventDefault()
        dispatch({ type: 'INSERT', value: 'sqrt(', kind: 'function' })
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === keyHoldActionRef.current) {
        clearKeyHoldRepeat()
      }
    }

    const handleCopy = (event: ClipboardEvent) => {
      if (disableKeyboardShortcuts) {
        return
      }

      if (isEditableTarget(event.target) || isEditableElementFocused()) {
        return
      }

      const current = stateRef.current
      const stateFormatted = applyDisplayFormatting({
        resultMain: current.resultMain,
        resultSub: current.resultSub,
        isError: current.isError,
        resultNumeric: current.resultNumeric,
        exactMode: current.exactMode,
        resultFormat: current.resultFormat,
        resultPrecision: current.resultPrecision,
      })
      const fromState = normalizeResultForClipboard(stateFormatted.resultMain)

      const computed = runEngine({
        expr: current.expr,
        angleMode: current.angleMode,
        exactMode: current.exactMode,
        lastAns: current.lastAns,
      })
      const liveFormatted = applyDisplayFormatting({
        resultMain: computed.resultMain,
        resultSub: computed.resultSub,
        isError: computed.isError,
        resultNumeric: computed.numericResult,
        exactMode: current.exactMode,
        resultFormat: current.resultFormat,
        resultPrecision: current.resultPrecision,
      })
      const fromLive = normalizeResultForClipboard(liveFormatted.resultMain)

      const copyValue = fromState || fromLive
      if (!copyValue) {
        return
      }

      event.preventDefault()
      event.clipboardData?.setData('text/plain', copyValue)
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (disableKeyboardShortcuts) {
        return
      }

      if (isEditableTarget(event.target) || isEditableElementFocused()) {
        return
      }

      const pasted = event.clipboardData?.getData('text/plain') ?? ''
      const normalized = normalizePastedExpression(pasted)
      if (!normalized) {
        return
      }

      event.preventDefault()
      if (stateRef.current.isResult) {
        dispatch({ type: 'CLEAR' })
      }
      dispatch({ type: 'INSERT', value: normalized, kind: 'symbol' })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearKeyHoldRepeat)
    window.addEventListener('copy', handleCopy)
    window.addEventListener('paste', handlePaste)
    return () => {
      clearKeyHoldRepeat()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearKeyHoldRepeat)
      window.removeEventListener('copy', handleCopy)
      window.removeEventListener('paste', handlePaste)
    }
  }, [disableKeyboardShortcuts])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const payload = {
        type: 'scientific',
        inputs: {
          expression: state.expr,
          angleMode: state.angleMode,
          exactMode: state.exactMode,
        },
        results: {
          result_decimal_formatted: state.resultMain,
          result_exact: state.resultMain,
          result_approx: state.resultSub,
        },
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(payload))
    }, calcSpec.history.autosave.debounce_ms)

    return () => window.clearTimeout(timeout)
  }, [state])

  useEffect(() => {
    if (!resumeCalculation) {
      return
    }

    dispatch({
      type: 'LOAD_RECENT_CALCULATION',
      payload: {
        expression: resumeCalculation.expression,
        angleMode: resumeCalculation.angleMode,
        exactMode: resumeCalculation.exactMode,
        resultFormat: resumeCalculation.resultFormat,
        resultPrecision: resumeCalculation.resultPrecision,
      },
    })
  }, [resumeCalculation])

  useEffect(() => {
    if (!resumeFromNote) {
      return
    }

    dispatch({
      type: 'LOAD_NOTE_CALCULATION',
      payload: {
        expression: resumeFromNote.expression,
        angleMode: resumeFromNote.angleMode,
      },
    })
  }, [resumeFromNote])

  useEffect(() => {
    const payload = {
      expr: state.expr,
      cursorPos: state.cursorPos,
      angleMode: state.angleMode,
      exactMode: state.exactMode,
      resultFormat: state.resultFormat,
      resultPrecision: state.resultPrecision,
      shiftOn: state.shiftOn,
      lastAns: state.lastAns,
      isResult: state.isResult,
      resultMain: state.resultMain,
      resultSub: state.resultSub,
      resultNumeric: state.resultNumeric,
      isError: state.isError,
    }
    localStorage.setItem(ACTIVE_STATE_KEY, JSON.stringify(payload))
  }, [state])

  const livePreview = useMemo(() => {
    if (!state.expr.trim()) {
      return {
        resultMain: '',
        resultSub: '',
        isError: false,
        resultNumeric: null,
        resultFormat: state.resultFormat,
        resultPrecision: state.resultPrecision,
      }
    }

    const computed = runEngine({
      expr: state.expr,
      angleMode: state.angleMode,
      exactMode: state.exactMode,
      lastAns: state.lastAns,
    })

    const formatted = applyDisplayFormatting({
      resultMain: computed.resultMain,
      resultSub: computed.resultSub,
      isError: computed.isError,
      resultNumeric: computed.numericResult,
      exactMode: state.exactMode,
      resultFormat: state.resultFormat,
      resultPrecision: state.resultPrecision,
    })

    return {
      ...formatted,
      resultFormat: state.resultFormat,
      resultPrecision: state.resultPrecision,
    }
  }, [state.expr, state.angleMode, state.exactMode, state.lastAns, state.resultFormat, state.resultPrecision])

  const persistedResult = useMemo(() => {
    const formatted = applyDisplayFormatting({
      resultMain: state.resultMain,
      resultSub: state.resultSub,
      isError: state.isError,
      resultNumeric: state.resultNumeric,
      exactMode: state.exactMode,
      resultFormat: state.resultFormat,
      resultPrecision: state.resultPrecision,
    })

    return {
      ...formatted,
      resultFormat: state.resultFormat,
      resultPrecision: state.resultPrecision,
    }
  }, [
    state.resultMain,
    state.resultSub,
    state.isError,
    state.resultNumeric,
    state.exactMode,
    state.resultFormat,
    state.resultPrecision,
  ])

  const displayResult = state.isResult
    ? persistedResult
    : livePreview

  useEffect(() => {
    if (!state.isResult || !state.expr.trim()) {
      return
    }

    const signature = `${state.expr}|${displayResult.resultMain}|${displayResult.resultSub}|${state.angleMode}|${state.exactMode}|${state.resultFormat}|${state.resultPrecision}|${displayResult.isError}`
    if (lastPersistedResultSignatureRef.current === signature) {
      return
    }

    const nextEntry = {
      expression: state.expr,
      resultMain: displayResult.resultMain,
      resultSub: displayResult.resultSub,
      resultNumeric: displayResult.resultNumeric,
      resultFormat: state.resultFormat,
      resultPrecision: state.resultPrecision,
      angleMode: state.angleMode,
      exactMode: state.exactMode,
      isError: displayResult.isError,
      createdAt: new Date().toISOString(),
    }

    const existing = readRecentCalculations()
    writeRecentCalculations([nextEntry, ...existing])
    lastPersistedResultSignatureRef.current = signature
  }, [
    state.isResult,
    state.expr,
    state.angleMode,
    state.exactMode,
    state.resultFormat,
    state.resultPrecision,
    displayResult.resultMain,
    displayResult.resultSub,
    displayResult.resultNumeric,
    displayResult.isError,
  ])

  const api = useMemo(
    () => ({
      state,
      displayResult,
      dispatch,
      pressButton: (label: string) => {
        if (label === 'equals') {
          dispatch({ type: 'CALCULATE' })
          return
        }
        if (label === 'AC') {
          dispatch({ type: 'CLEAR' })
          return
        }
        if (label === 'backspace') {
          dispatch({ type: 'DELETE' })
          return
        }
        if (label === 'rad') {
          dispatch({ type: 'SET_ANGLE_MODE', mode: 'rad' })
          return
        }
        if (label === 'deg') {
          dispatch({ type: 'SET_ANGLE_MODE', mode: 'deg' })
          return
        }
        if (label === 'cursor_left') {
          dispatch({ type: 'MOVE_CURSOR', delta: -1 })
          return
        }
        if (label === 'cursor_right') {
          dispatch({ type: 'MOVE_CURSOR', delta: 1 })
          return
        }
        if (label === 'inv') {
          dispatch({ type: 'TOGGLE_SHIFT' })
          return
        }

        const resolved = resolveButtonInsert(label, stateRef.current.shiftOn)
        if (!resolved) {
          return
        }

        dispatch(resolved.action)
        if (resolved.consumeShift && stateRef.current.shiftOn) {
          dispatch({ type: 'TOGGLE_SHIFT' })
        }
      },
    }),
    [state, displayResult],
  )

  return api
}
