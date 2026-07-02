import { useEffect, useRef, useState } from 'react'
import { calcSpec, keypadMap } from '../spec/spec'

interface KeypadProps {
  shiftOn: boolean
  onPress: (label: string) => void
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

export function Keypad({ shiftOn, onPress }: KeypadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const holdTimeoutRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const [buttonSize, setButtonSize] = useState(58)
  const [gaps, setGaps] = useState({ h: calcSpec.layout.keypad.horizontal_gap_px, v: calcSpec.layout.keypad.vertical_gap_px })

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
      const viewportH = window.innerHeight

      const compactFactor = viewportH <= 620 ? 0.62 : viewportH <= 700 ? 0.72 : viewportH <= 820 ? 0.86 : 1
      const gap = Math.max(2, Math.round(calcSpec.layout.keypad.horizontal_gap_px * compactFactor))
      const vGap = Math.max(2, Math.round(calcSpec.layout.keypad.vertical_gap_px * compactFactor))

      const base = (width - gap * (cols - 1)) / cols
      const baseByHeight = (height - vGap * (rows - 1)) / rows
      const fromWidth = base * 0.95
      const fromHeight = baseByHeight * 0.98
      const nextSize = Math.max(34, Math.min(fromWidth, fromHeight))
      setGaps({ h: gap, v: vGap })
      setButtonSize(nextSize)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="keypad"
      style={{
        gap: `${gaps.v}px ${gaps.h}px`,
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
              fontSize: `${Math.max(12, Math.min(16, Math.round(buttonSize * 0.34)))}px`,
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
