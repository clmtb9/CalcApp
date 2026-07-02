import { useRef, useState } from 'react'
import { ExpressionLine } from '../rendering/ExpressionLine'
import type { CalcState } from '../state/types'

const RESULT_LONG_PRESS_MS = 500
const DECIMAL_LABEL_LONG_PRESS_MS = 500

function normalizeResultForCopy(value: string): string {
  return value.replace(/^=\s*/, '').replace(/^≈\s*/, '').trim()
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fallback below.
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', 'true')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

interface ScreenCardProps {
  state: CalcState
  displayResult: {
    resultMain: string
    resultSub: string
    isError: boolean
  }
  onSetAngleMode: (mode: 'deg' | 'rad') => void
  onSetResultFormat: (format: 'decimal' | 'scientific') => void
  onSetResultPrecision: (precision: number) => void
  onSetCursor: (pos: number) => void
  onSwipeStart: (x: number) => void
  onSwipeMove: (x: number) => void
  onSwipeEnd: () => void
  onResultDoubleClick?: () => void
}

export function ScreenCard({
  state,
  displayResult,
  onSetAngleMode,
  onSetResultFormat,
  onSetResultPrecision,
  onSetCursor,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  onResultDoubleClick,
}: ScreenCardProps) {
  const [tapFeedbackOn, setTapFeedbackOn] = useState(false)
  const [resultCopiedOn, setResultCopiedOn] = useState(false)
  const tapTimeoutRef = useRef<number | null>(null)
  const resultCopyTimeoutRef = useRef<number | null>(null)
  const resultLongPressTimerRef = useRef<number | null>(null)
  const decimalLongPressTimerRef = useRef<number | null>(null)
  const skipNextFormatClickRef = useRef(false)
  const skipNextResultClickRef = useRef(false)

  const handleTapPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const relativeX = event.clientX - rect.left
    const safeX = Math.max(0, Math.min(relativeX, rect.width))
    const style = window.getComputedStyle(event.currentTarget)
    const fontSize = style.fontSize || '15px'
    const fontFamily = style.fontFamily || 'monospace'

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      const ratio = rect.width > 0 ? safeX / rect.width : 0
      const posFallback = Math.round(Math.max(0, Math.min(1, ratio)) * state.expr.length)
      onSetCursor(posFallback)
      return
    }

    ctx.font = `${fontSize} ${fontFamily}`
    const charWidth = Math.max(ctx.measureText('0').width, 1)
    const pos = Math.round(safeX / charWidth)
    onSetCursor(pos)

    setTapFeedbackOn(true)
    if (tapTimeoutRef.current !== null) {
      window.clearTimeout(tapTimeoutRef.current)
    }
    tapTimeoutRef.current = window.setTimeout(() => {
      setTapFeedbackOn(false)
    }, 300)
  }

  const hasApproximation = Boolean(displayResult.resultSub.trim())
  const copyableResult = normalizeResultForCopy(displayResult.resultMain)
  const formatStatusLabel =
    state.resultFormat === 'scientific' ? 'SCI AUTO' : 'DECIMAL'
  const nextAngleMode = state.angleMode === 'deg' ? 'rad' : 'deg'
  const nextResultFormat = state.resultFormat === 'decimal' ? 'scientific' : 'decimal'

  const clearResultLongPress = () => {
    if (resultLongPressTimerRef.current !== null) {
      window.clearTimeout(resultLongPressTimerRef.current)
      resultLongPressTimerRef.current = null
    }
  }

  const clearDecimalLongPress = () => {
    if (decimalLongPressTimerRef.current !== null) {
      window.clearTimeout(decimalLongPressTimerRef.current)
      decimalLongPressTimerRef.current = null
    }
  }

  const handleDecimalLongPressStart = () => {
    if (state.resultFormat !== 'decimal') {
      return
    }

    clearDecimalLongPress()
    decimalLongPressTimerRef.current = window.setTimeout(() => {
      const raw = window.prompt('Nombre de chiffres apres la virgule (0 a 12)', String(state.resultPrecision))
      const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10)
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 12) {
        onSetResultPrecision(parsed)
      }
      skipNextFormatClickRef.current = true
      decimalLongPressTimerRef.current = null
    }, DECIMAL_LABEL_LONG_PRESS_MS)
  }

  const handleFormatClick = () => {
    if (skipNextFormatClickRef.current) {
      skipNextFormatClickRef.current = false
      return
    }
    onSetResultFormat(nextResultFormat)
  }

  const triggerCopyFeedback = () => {
    setResultCopiedOn(true)
    if (resultCopyTimeoutRef.current !== null) {
      window.clearTimeout(resultCopyTimeoutRef.current)
    }
    resultCopyTimeoutRef.current = window.setTimeout(() => {
      setResultCopiedOn(false)
    }, 800)
  }

  return (
    <section className="screen-card">
      <div className="status-row">
        <button
          type="button"
          className="status-toggle-btn"
          onClick={() => onSetAngleMode(nextAngleMode)}
          title={`Basculer vers ${nextAngleMode.toUpperCase()}`}
        >
          {state.angleMode.toUpperCase()}
        </button>
        <span>EXACT</span>
        <button
          type="button"
          className="status-toggle-btn"
          onClick={handleFormatClick}
          onPointerDown={handleDecimalLongPressStart}
          onPointerUp={clearDecimalLongPress}
          onPointerLeave={clearDecimalLongPress}
          onPointerCancel={clearDecimalLongPress}
          title={`Basculer vers ${nextResultFormat === 'scientific' ? 'SCI AUTO' : 'DECIMAL'}`}
        >
          {formatStatusLabel}
        </button>
        <span className={state.shiftOn ? 'shift-on' : 'shift-off'}>{state.shiftOn ? 'INV ON' : 'INV OFF'}</span>
      </div>

      <div className="expression-gap" />

      <div
        className={tapFeedbackOn ? 'expression-area expression-area-tap' : 'expression-area'}
        onPointerDown={(event) => {
          handleTapPosition(event)
          onSwipeStart(event.clientX)
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) {
            onSwipeMove(event.clientX)
          }
        }}
        onPointerUp={onSwipeEnd}
        onPointerCancel={onSwipeEnd}
      >
        <ExpressionLine expr={state.expr} cursorPos={state.cursorPos} />
      </div>

      <div className="separator" />

      <div className="result-label">RESULTAT</div>
      <div className="result-gap" />

      <div
        className={
          displayResult.isError
            ? resultCopiedOn
              ? 'result-main result-main-error result-main-copied result-main-copy-ready'
              : 'result-main result-main-error result-main-copy-ready'
            : resultCopiedOn
              ? 'result-main result-main-copied result-main-copy-ready'
              : 'result-main result-main-copy-ready'
        }
        onPointerDown={() => {
          if (!copyableResult) {
            return
          }
          skipNextResultClickRef.current = false
          clearResultLongPress()
          resultLongPressTimerRef.current = window.setTimeout(async () => {
            const ok = await copyTextToClipboard(copyableResult)
            if (ok) {
              triggerCopyFeedback()
              skipNextResultClickRef.current = true
            }
            resultLongPressTimerRef.current = null
          }, RESULT_LONG_PRESS_MS)
        }}
        onPointerUp={clearResultLongPress}
        onPointerLeave={clearResultLongPress}
        onPointerCancel={clearResultLongPress}
        onClick={() => {
          if (skipNextResultClickRef.current) {
            skipNextResultClickRef.current = false
            return
          }
          onSetResultFormat(nextResultFormat)
        }}
        onDoubleClick={() => onResultDoubleClick?.()}
        title={copyableResult ? 'Appui long pour copier le resultat' : undefined}
      >
        {displayResult.resultMain || ' '}
      </div>
      <div className={hasApproximation ? 'result-sub result-sub-visible' : 'result-sub'}>{displayResult.resultSub || ' '}</div>
    </section>
  )
}
