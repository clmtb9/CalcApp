import { useState } from 'react'
import { Header } from './Header'
import { ScreenCard } from './ScreenCard'
import { Keypad } from './Keypad'
import { SaveResultModal } from './SaveResultModal'
import { useCalculator } from '../state/useCalculator'
import type { NoteItem } from '../notes/types'
import type { RecentCalculation } from '../state/history'

interface CalculatorProps {
  notes: NoteItem[]
  targetNoteId: string
  resumeCalculation: RecentCalculation | null
  resumeFromNote: { expression: string; angleMode?: 'deg' | 'rad' } | null
  activeTab: 'calculator' | 'notes' | 'formulas'
  isOffline: boolean
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas') => void
  onRefreshApp: () => void
  onSaveNamedResult: (payload: {
    noteId?: string
    newNoteTitle?: string
    label: string
    expression: string
    resultMain: string
    resultSub: string
    resultNumeric: number | null
    resultFormat: 'decimal' | 'scientific'
    resultPrecision: number
    angleMode: 'deg' | 'rad'
    exactMode: boolean
  }) => void
}

export function Calculator({
  notes,
  targetNoteId,
  resumeCalculation,
  resumeFromNote,
  activeTab,
  isOffline,
  onNavigateTab,
  onRefreshApp,
  onSaveNamedResult,
}: CalculatorProps) {
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [bottomSpacerPx, setBottomSpacerPx] = useState(0)
  const { state, displayResult, dispatch, pressButton, pasteExpression } = useCalculator({
    disableKeyboardShortcuts: saveModalOpen,
    resumeCalculation,
    resumeFromNote,
  })

  const canSaveResult = Boolean(targetNoteId && state.expr.trim().length > 0 && displayResult.resultMain.trim().length > 0)
  const suggestedLabel = `Resultat ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

  const handleKeyButtonSizeChange = (size: number) => {
    if (bottomSpacerPx === 0) {
      setBottomSpacerPx(Math.round(size / 2))
    }
  }

  return (
    <div className="calc-root" tabIndex={0}>
      <Header />

      <ScreenCard
        state={state}
        displayResult={displayResult}
        onSetAngleMode={(mode) => dispatch({ type: 'SET_ANGLE_MODE', mode })}
        onSetResultFormat={(format) => dispatch({ type: 'SET_RESULT_FORMAT', format })}
        onSetResultPrecision={(precision) => dispatch({ type: 'SET_RESULT_PRECISION', precision })}
        onSetCursor={(pos) => dispatch({ type: 'SET_CURSOR', pos })}
        onSwipeStart={(x) => dispatch({ type: 'SWIPE_START', x })}
        onSwipeMove={(x) => dispatch({ type: 'SWIPE_MOVE', x })}
        onSwipeEnd={() => dispatch({ type: 'SWIPE_END' })}
        onPasteExpression={pasteExpression}
        activeTab={activeTab}
        isOffline={isOffline}
        onNavigateTab={onNavigateTab}
        onRefreshApp={onRefreshApp}
        onResultDoubleClick={() => {
          if (canSaveResult) {
            setSaveModalOpen(true)
          }
        }}
      />

      <Keypad shiftOn={state.shiftOn} onPress={pressButton} onButtonSizeChange={handleKeyButtonSizeChange} />

      <div style={{ height: `${bottomSpacerPx}px`, flexShrink: 0 }} />

      <SaveResultModal
        open={saveModalOpen}
        notes={notes}
        initialNoteId={targetNoteId}
        defaultLabel={suggestedLabel}
        onCancel={() => setSaveModalOpen(false)}
        onConfirm={({ noteId, label, newNoteTitle }) => {
          onSaveNamedResult({
            noteId,
            newNoteTitle,
            label,
            expression: state.expr,
            resultMain: displayResult.resultMain,
            resultSub: displayResult.resultSub,
            resultNumeric: displayResult.resultNumeric,
            resultFormat: displayResult.resultFormat,
            resultPrecision: displayResult.resultPrecision,
            angleMode: state.angleMode,
            exactMode: state.exactMode,
          })
          setSaveModalOpen(false)
        }}
      />
    </div>
  )
}
