import type { AngleMode } from '../spec/spec'

export type ResultDisplayFormat = 'decimal' | 'scientific'

export interface CalcState {
  expr: string
  cursorPos: number
  angleMode: AngleMode
  exactMode: boolean
  shiftOn: boolean
  lastAns: number | null
  isResult: boolean
  resultMain: string
  resultSub: string
  resultNumeric: number | null
  isError: boolean
  resultFormat: ResultDisplayFormat
  resultPrecision: number
  swipeDragStartX: number | null
}

export type CalcAction =
  | { type: 'INSERT'; value: string; kind: InsertKind }
  | { type: 'DELETE' }
  | { type: 'CLEAR' }
  | { type: 'CALCULATE' }
  | { type: 'SET_ANGLE_MODE'; mode: AngleMode }
  | { type: 'SET_EXACT_MODE'; exact: boolean }
  | { type: 'SET_RESULT_FORMAT'; format: ResultDisplayFormat }
  | { type: 'SET_RESULT_PRECISION'; precision: number }
  | { type: 'TOGGLE_SHIFT' }
  | { type: 'SET_CURSOR'; pos: number }
  | { type: 'MOVE_CURSOR'; delta: number }
  | { type: 'CURSOR_HOME' }
  | { type: 'CURSOR_END' }
  | {
      type: 'LOAD_RECENT_CALCULATION'
      payload: {
        expression: string
        angleMode: AngleMode
        exactMode: boolean
        resultFormat: ResultDisplayFormat
        resultPrecision: number
      }
    }
  | { type: 'LOAD_NOTE_CALCULATION'; payload: { expression: string; angleMode?: AngleMode } }
  | { type: 'SWIPE_START'; x: number }
  | { type: 'SWIPE_MOVE'; x: number }
  | { type: 'SWIPE_END' }

export type InsertKind =
  | 'digit'
  | 'operator'
  | 'function'
  | 'constant'
  | 'paren'
  | 'symbol'
