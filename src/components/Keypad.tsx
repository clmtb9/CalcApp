import { useEffect, useRef, useState } from 'react'
import { calcSpec, keypadMap } from '../spec/spec'

interface KeypadProps {
  shiftOn: boolean
  onPress: (label: string) => void
  onButtonSizeChange?: (size: number) => void
}

const OPERATOR_KEYS = new Set(['divide', 'times', 'minus', 'plus', '^', '%', 'sci_E', '.', '(', ')'])
const FUNCTION_KEYS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', '!'])
const MODE_KEYS = new Set(['rad', 'deg', 'inv'])
const SYSTEM_KEYS = new Set(['AC', 'backspace'])
const CONSTANT_KEYS = new Set(['pi', 'e'])

function getKeyToneClass(label: string): string {
  if (/^\d$/.test(label)) {
    return ''
  }
  if (FUNCTION_KEYS.has(label)) {
    return 'key-tone-fn'
  }
  if (MODE_KEYS.has(label)) {
    return 'key-tone-mode'
  }
  if (OPERATOR_KEYS.has(label)) {
    return 'key-tone-op'
  }
  if (SYSTEM_KEYS.has(label)) {
    return 'key-tone-system'
  }
  if (CONSTANT_KEYS.has(label)) {
    return 'key-tone-const'
  }
  return 'key-tone-op'
}

export function Keypad({ shiftOn, onPress, onButtonSizeChange }: KeypadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const holdTimeoutRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const mobileLockedWidthRef = useRef<number | null>(null)
  const [buttonSize, setButtonSize] = useState(58)
  const [columnGap, setColumnGap] = useState(calcSpec.layout.keypad.horizontal_gap_px)
  const [rowGap, setRowGap] = useState(calcSpec.layout.keypad.horizontal_gap_px)

  const stopHoldRepeat = () => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }

  const triggerPress = (rawLabel: string) => {
    onPress(resolveKeyActionLabel(rawLabel))
  }

  const startHoldRepeat = (rawLabel: string) => {
    const repeatable = rawLabel === 'backspace' || rawLabel === 'rad' || rawLabel === 'deg'
    if (!repeatable) {
      return
    }

    stopHoldRepeat()
    holdTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      triggerPress(rawLabel)
      holdIntervalRef.current = window.setInterval(() => {
        triggerPress(rawLabel)
      }, 70)
    }, 320)
  }

  useEffect(() => {
    return () => {
      stopHoldRepeat()
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const update = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      const cols = calcSpec.layout.keypad.cols
      const rows = calcSpec.layout.keypad.rows
      const viewportW = window.innerWidth
      const isMobile = viewportW <= 700

      const compactFactor = height <= 280 ? 0.58 : height <= 340 ? 0.68 : height <= 430 ? 0.82 : height <= 520 ? 0.88 : 1
      const nextRowGap = isMobile ? 0 : Math.max(0, Math.round(calcSpec.layout.keypad.horizontal_gap_px * compactFactor * 0.75))
      const widthFactor = viewportW <= 380 ? 0 : viewportW <= 420 ? 0.08 : viewportW <= 480 ? 0.15 : viewportW <= 700 ? 0.25 : 0.5
      const nextColumnGap = Math.max(0, Math.round(calcSpec.layout.keypad.horizontal_gap_px * compactFactor * widthFactor))

      const base = (width - nextColumnGap * (cols - 1)) / cols
      const baseByHeight = (height - nextRowGap * (rows - 1)) / rows
      const fromWidth = base * 1
      const fromHeight = baseByHeight * 1.08
      let nextSize = Math.max(34, Math.min(fromWidth, fromHeight))

      if (isMobile) {
        if (mobileLockedWidthRef.current === null) {
          mobileLockedWidthRef.current = width
        } else if (Math.abs(width - mobileLockedWidthRef.current) > 40) {
          mobileLockedWidthRef.current = width
        }

        const lockedWidth = mobileLockedWidthRef.current ?? width
        const lockedBase = (lockedWidth - nextColumnGap * (cols - 1)) / cols
        const lockedSize = lockedBase * 1.02
        nextSize = Math.max(50, Math.min(76, lockedSize))
      } else {
        mobileLockedWidthRef.current = null
      }

      setColumnGap(nextColumnGap)
      setRowGap(nextRowGap)
      setButtonSize(nextSize)
      onButtonSizeChange?.(nextSize)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onButtonSizeChange])

  return (
    <div
      ref={containerRef}
      className="keypad"
      style={{
        columnGap: `${columnGap}px`,
        rowGap: `${rowGap}px`,
      }}
    >
      {keypadMap.flat().map((label) => {
        const classes = ['key-btn']
        const toneClass = getKeyToneClass(label)
        if (toneClass) {
          classes.push(toneClass)
        }
        if (label === 'equals') {
          classes.push('key-equals')
        }
        if (label === 'inv' && shiftOn) {
          classes.push('key-shift')
        }

        return (
          <button
            key={label}
            type="button"
            className={classes.join(' ')}
            style={{
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              fontSize: `${resolveKeyFontSize(buttonSize, label)}px`,
            }}
            onPointerDown={() => startHoldRepeat(label)}
            onPointerUp={stopHoldRepeat}
            onPointerCancel={stopHoldRepeat}
            onPointerLeave={stopHoldRepeat}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false
                return
              }
              triggerPress(label)
            }}
          >
            {displayLabel(label, shiftOn)}
          </button>
        )
      })}
    </div>
  )
}

function resolveKeyFontSize(buttonSize: number, label: string): number {
  const isDigit = /^\d+$/.test(label)
  const isPrimaryOperator = label === 'plus' || label === 'minus' || label === 'times' || label === 'divide' || label === 'equals'

  if (isDigit || isPrimaryOperator) {
    return Math.max(16, Math.min(24, Math.round(buttonSize * 0.44)))
  }

  return Math.max(12, Math.min(16, Math.round(buttonSize * 0.34)))
}

function resolveKeyActionLabel(raw: string): string {
  if (raw === 'rad') {
    return 'cursor_left'
  }
  if (raw === 'deg') {
    return 'cursor_right'
  }
  return raw
}

function displayLabel(raw: string, shiftOn: boolean): string {
  const labels: Record<string, string> = {
    divide: '÷',
    times: '×',
    minus: '-',
    plus: '+',
    backspace: '⌫',
    equals: '=',
    sci_E: 'E',
    inv: 'INV',
    sqrt: '√',
    rad: '<',
    deg: '>',
  }

  if (shiftOn && raw === 'sin') {
    return 'asin'
  }
  if (shiftOn && raw === 'cos') {
    return 'acos'
  }
  if (shiftOn && raw === 'tan') {
    return 'atan'
  }
  if (shiftOn && raw === 'log') {
    return '10^'
  }
  if (shiftOn && raw === 'ln') {
    return 'e^x'
  }
  if (shiftOn && raw === 'sqrt') {
    return 'x²'
  }

  return labels[raw] ?? raw
}
